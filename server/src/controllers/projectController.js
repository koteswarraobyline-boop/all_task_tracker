const fs = require('fs');
const csv = require('csv-parser');
const { sequelize } = require('../config/database');
const { Project, Task, Developer, ClientAccessRecord } = require('../models');
const {
  detectFlexibleFromRows,
  parseFlexibleRows,
  normalizeStatus,
  parseDate,
  parseNumber,
} = require('../utils/csvImport');
const { enrichProjectRecord, analyzeProjectDelay } = require('../services/projectEnrichmentService');
const { syncTargetOnRevisedUpdate } = require('../services/deliveryDateService');

// Helper to generate a random hex color
function getRandomColor() {
  const colors = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
    '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
    '#8bc34a', '#ff9800', '#ff5722', '#795548', '#607d8b'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// GET /projects
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.findAll({
      include: [{
        model: Task,
        as: 'tasks',
        attributes: [
          'id', 'status', 'updatedAt', 'recordType', 'startDate', 'dueDate', 'developerId',
          'priority', 'estimatedHours', 'actualHours', 'module', 'tags', 'description',
        ],
        include: [{
          model: Developer,
          as: 'developer',
          attributes: ['id', 'name', 'color'],
          required: false,
        }],
      }],
      order: [['createdAt', 'DESC']]
    });

    const projectData = projects.map((proj) => enrichProjectRecord(proj));

    res.json(projectData);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

// DELETE /projects/:id
exports.deleteProject = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id, { transaction });
    if (!project) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Project not found' });
    }

    await project.destroy({ transaction });
    await transaction.commit();

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

// PUT /projects/:id
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, clientName, originalDeliveryDate, revisedDeliveryDate, deliveryNotes } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updates = {};
    if (name !== undefined && name.trim()) updates.name = name.trim();
    if (clientName !== undefined) updates.clientName = clientName.trim() || null;
    if (originalDeliveryDate !== undefined) updates.originalDeliveryDate = originalDeliveryDate || null;
    if (revisedDeliveryDate !== undefined) updates.revisedDeliveryDate = revisedDeliveryDate || null;
    if (deliveryNotes !== undefined) updates.deliveryNotes = deliveryNotes || null;

    await project.update(updates);

    if (clientName !== undefined && ClientAccessRecord) {
      await ClientAccessRecord.update(
        { clientName: clientName.trim() || 'Client' },
        { where: { projectId: project.id } }
      ).catch((err) => console.error('Error updating ClientAccessRecord clientName:', err));
    }

    res.json({
      message: 'Project updated successfully',
      project: {
        id: project.id,
        name: project.name,
        clientName: project.clientName,
        originalDeliveryDate: project.originalDeliveryDate,
        revisedDeliveryDate: project.revisedDeliveryDate,
        deliveryNotes: project.deliveryNotes,
      },
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

// POST /projects/upload
exports.uploadProject = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required' });
  }

  const { name, clientName, mapping, projectId: existingProjectId } = req.body;
  const appendToProjectId = existingProjectId ? parseInt(existingProjectId, 10) : null;

  if (!appendToProjectId && !name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  let columnMap = {};
  try {
    columnMap = JSON.parse(mapping || '{}');
  } catch (e) {
    return res.status(400).json({ error: 'Invalid column mapping format' });
  }

  const filePath = req.file.path;
  const rawRows = [];

  // Stream read CSV
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      rawRows.push(row);
    })
    .on('end', async () => {
      // Delete temporary file
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to delete temp file:', err);
      }

      if (rawRows.length === 0) {
        return res.status(400).json({ error: 'CSV file is empty' });
      }

      const validationErrors = [];
      const taskIdsInCsv = new Set();
      let mappedTasks = [];
      let importFormat = 'legacy';

      const useFlexible = detectFlexibleFromRows(rawRows);

      if (useFlexible) {
        importFormat = 'flexible';
        const parsed = parseFlexibleRows(rawRows);
        mappedTasks = parsed.mappedTasks;
        validationErrors.push(...parsed.validationErrors);
      } else {
        // Legacy flat task CSV (column mapping from UI)
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          const rowNum = i + 2; // header is row 1

          const taskName = row[columnMap.taskName]?.trim() || '';
          const rawTaskId = row[columnMap.taskId]?.trim() || '';
          const module = row[columnMap.module]?.trim() || '';
          const feature = row[columnMap.feature]?.trim() || '';
          const description = row[columnMap.description]?.trim() || '';
          const priority = row[columnMap.priority]?.trim() || '';
          const rawStatus = row[columnMap.status]?.trim() || '';
          const rawStartDate = row[columnMap.startDate]?.trim() || '';
          const rawDueDate = row[columnMap.dueDate]?.trim() || '';
          const rawEstHours = row[columnMap.estimatedHours]?.trim() || '';
          const rawActHours = row[columnMap.actualHours]?.trim() || '';
          const remarks = row[columnMap.remarks]?.trim() || '';
          const devName = row[columnMap.assignedDeveloper]?.trim() || '';
          const phase = row[columnMap.phase]?.trim() || '';
          const rawEstDays = row[columnMap.estDays]?.trim() || '';
          const dependencies = row[columnMap.dependencies]?.trim() || '';

          if (!taskName) {
            validationErrors.push(`Row ${rowNum}: Missing Task Name.`);
          }

          let taskId = rawTaskId;
          if (columnMap.taskId) {
            if (!taskId) {
              validationErrors.push(`Row ${rowNum}: Mapped Task ID column is empty.`);
            } else if (taskIdsInCsv.has(taskId)) {
              validationErrors.push(`Row ${rowNum}: Duplicate Task ID '${taskId}' found in file.`);
            } else {
              taskIdsInCsv.add(taskId);
            }
          } else {
            taskId = `T-${rowNum}`;
          }

          const startDate = parseDate(rawStartDate, rowNum, 'Start Date', validationErrors);
          const dueDate = parseDate(rawDueDate, rowNum, 'Due Date', validationErrors);
          const estimatedHours = parseNumber(rawEstHours, rowNum, 'Estimated Hours', validationErrors);
          const actualHours = parseNumber(rawActHours, rowNum, 'Actual Hours', validationErrors);
          const status = normalizeStatus(rawStatus, Boolean(devName), rowNum, validationErrors);

          mappedTasks.push({
            rowNum,
            taskId,
            parentId: null,
            recordType: 'task',
            module,
            feature,
            taskName,
            description,
            priority,
            status,
            startDate,
            dueDate,
            estimatedHours,
            actualHours,
            remarks,
            devName,
            phase,
            estDays: rawEstDays && !isNaN(parseFloat(rawEstDays)) ? parseFloat(rawEstDays) : null,
            dependencies,
            tags: null,
            progressPercent: null,
            customFields: null,
          });
        }
      }

      // If any validation errors, return them
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationErrors.slice(0, 50),
          format: importFormat,
        });
      }

      if (mappedTasks.length === 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: ['CSV has no importable Module or Task rows.'],
          format: importFormat,
        });
      }

      // Everything valid. Import in transaction!
      const transaction = await sequelize.transaction();
      try {
        let project;
        if (appendToProjectId) {
          project = await Project.findByPk(appendToProjectId, { transaction });
          if (!project) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Project not found' });
          }

          const existingTasks = await Task.findAll({
            where: { projectId: project.id },
            attributes: ['taskId', 'module', 'recordType'],
            transaction,
          });

          const existingSet = new Set(existingTasks.map((t) => t.taskId).filter(Boolean));

          let maxTaskNum = 0;
          let maxModuleNum = 0;

          existingTasks.forEach((t) => {
            if (t.taskId) {
              const matchT = t.taskId.match(/^T-(\d+)$/i) || t.taskId.match(/(\d+)/);
              if (matchT) {
                const num = parseInt(matchT[1], 10);
                if (!isNaN(num) && num > maxTaskNum) maxTaskNum = num;
              }
              const matchM = t.taskId.match(/^M-(\d+)$/i);
              if (matchM) {
                const num = parseInt(matchM[1], 10);
                if (!isNaN(num) && num > maxModuleNum) maxModuleNum = num;
              }
            }
            if (t.module) {
              const matchM = String(t.module).match(/^M-(\d+)$/i);
              if (matchM) {
                const num = parseInt(matchM[1], 10);
                if (!isNaN(num) && num > maxModuleNum) maxModuleNum = num;
              }
            }
          });

          const idMap = new Map();

          // 1. Remap modules first
          mappedTasks.forEach((t) => {
            if (t.recordType === 'module') {
              if (existingSet.has(t.taskId) || !t.taskId) {
                maxModuleNum++;
                const newId = `M-${maxModuleNum}`;
                if (t.taskId) idMap.set(t.taskId, newId);
                t.taskId = newId;
              }
            }
          });

          // 2. Remap tasks
          mappedTasks.forEach((t) => {
            if (t.recordType !== 'module') {
              if (existingSet.has(t.taskId) || !t.taskId) {
                maxTaskNum++;
                const newId = `T-${maxTaskNum}`;
                if (t.taskId) idMap.set(t.taskId, newId);
                t.taskId = newId;
              }
            }
          });

          // 3. Update parentId and module fields for mappedTasks using idMap
          mappedTasks.forEach((t) => {
            if (t.parentId && idMap.has(t.parentId)) {
              t.parentId = idMap.get(t.parentId);
            }
            if (t.module && idMap.has(t.module)) {
              t.module = idMap.get(t.module);
            }
          });
        } else {
          // Create project
          project = await Project.create({
            name,
            clientName: clientName || null
          }, { transaction });
        }

        // Resolve developers. Get unique developer values from file.
        const uniqueDevNames = [...new Set(mappedTasks.map(t => t.devName).filter(Boolean))];

        const parseDeveloperIdentity = (raw) => {
          const value = String(raw || '').trim();
          const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
          if (isEmail) {
            const local = value.split('@')[0] || value;
            const prettyName = local
              .replace(/[._-]+/g, ' ')
              .split(' ')
              .filter(Boolean)
              .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
              .join(' ');
            return { name: prettyName || value, email: value };
          }
          return { name: value, email: null };
        };
        
        // Find existing developers
        const existingDevs = await Developer.findAll({ transaction });
        const devMap = {}; // lookup key -> id
        existingDevs.forEach(d => {
          if (d.name) devMap[d.name.toLowerCase()] = d.id;
          if (d.email) devMap[d.email.toLowerCase()] = d.id;
        });

        // Create new developers for those that don't exist
        for (const rawDev of uniqueDevNames) {
          const identity = parseDeveloperIdentity(rawDev);
          const lookupKeys = [rawDev.toLowerCase(), identity.name.toLowerCase()];
          if (identity.email) lookupKeys.push(identity.email.toLowerCase());

          const existingId = lookupKeys.map((k) => devMap[k]).find(Boolean);
          if (existingId) {
            lookupKeys.forEach((k) => { devMap[k] = existingId; });
            continue;
          }

          const newDev = await Developer.create({
            name: identity.name,
            email: identity.email,
            color: getRandomColor()
          }, { transaction });

          lookupKeys.forEach((k) => { devMap[k] = newDev.id; });
          if (identity.email) devMap[identity.email.toLowerCase()] = newDev.id;
          devMap[identity.name.toLowerCase()] = newDev.id;
        }

        // Prepare tasks
        const tasksToInsert = mappedTasks.map(task => ({
          projectId: project.id,
          developerId: task.devName
            ? (devMap[task.devName.toLowerCase()]
              || devMap[parseDeveloperIdentity(task.devName).name.toLowerCase()]
              || null)
            : null,
          taskId: task.taskId,
          parentId: task.parentId || null,
          recordType: task.recordType || 'task',
          module: task.module || null,
          feature: task.feature || null,
          taskName: task.taskName,
          description: task.description || null,
          priority: task.priority || null,
          status: task.status,
          startDate: task.startDate,
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours,
          actualHours: task.actualHours,
          remarks: task.remarks || null,
          phase: task.phase || null,
          estDays: task.estDays,
          dependencies: task.dependencies || null,
          tags: task.tags || null,
          progressPercent: task.progressPercent,
          customFields: task.customFields || null,
        }));

        // Bulk create tasks
        await Task.bulkCreate(tasksToInsert, { transaction });
        await transaction.commit();

        const moduleCount = tasksToInsert.filter((t) => t.recordType === 'module').length;
        const taskCount = tasksToInsert.filter((t) => t.recordType !== 'module').length;

        res.status(201).json({
          message: appendToProjectId
            ? 'CSV imported into project successfully'
            : 'Project imported successfully',
          projectId: project.id,
          taskCount: tasksToInsert.length,
          moduleCount,
          workItemCount: taskCount,
          format: importFormat,
        });
      } catch (dbError) {
        await transaction.rollback();
        console.error('Database transaction error during import:', dbError);
        res.status(500).json({ error: 'Database import failed. Please try again.' });
      }
    })
    .on('error', (csvError) => {
      console.error('CSV stream parsing error:', csvError);
        res.status(500).json({ error: 'Failed to read CSV file' });
    });
};

// GET /projects/:id/delay-analysis
exports.getProjectDelayAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id, {
      include: [{
        model: Task,
        as: 'tasks',
        include: [{
          model: Developer,
          as: 'developer',
          attributes: ['id', 'name', 'color'],
          required: false,
        }],
      }],
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const analysis = analyzeProjectDelay(project, project.tasks || []);
    return res.json(analysis);
  } catch (error) {
    console.error('Error fetching delay analysis:', error);
    return res.status(500).json({ error: 'Failed to fetch delay analysis' });
  }
};

// PUT /projects/:id/delivery-date
exports.updateProjectDeliveryDate = async (req, res) => {
  try {
    const { id } = req.params;
    const { originalDeliveryDate, revisedDeliveryDate, deliveryNotes, targetDeliveryDate } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updates = {};
    if (originalDeliveryDate !== undefined) updates.originalDeliveryDate = originalDeliveryDate || null;
    if (revisedDeliveryDate !== undefined) updates.revisedDeliveryDate = revisedDeliveryDate || null;
    if (targetDeliveryDate !== undefined) updates.targetDeliveryDate = targetDeliveryDate || null;
    if (deliveryNotes !== undefined) updates.deliveryNotes = deliveryNotes || null;
    syncTargetOnRevisedUpdate(updates);

    await project.update(updates);

    res.json({
      message: 'Project delivery date updated successfully',
      project: {
        id: project.id,
        name: project.name,
        originalDeliveryDate: project.originalDeliveryDate,
        revisedDeliveryDate: project.revisedDeliveryDate,
        targetDeliveryDate: project.targetDeliveryDate,
        deliveryNotes: project.deliveryNotes,
      },
    });
  } catch (error) {
    console.error('Error updating project delivery date:', error);
    res.status(500).json({ error: 'Failed to update project delivery date' });
  }
};
