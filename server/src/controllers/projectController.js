const fs = require('fs');
const csv = require('csv-parser');
const { sequelize } = require('../config/database');
const { Project, Task, Developer } = require('../models');
const {
  detectFlexibleFromRows,
  parseFlexibleRows,
  normalizeStatus,
  parseDate,
  parseNumber,
} = require('../utils/csvImport');

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

    const priorityRank = (p) => {
      const v = String(p || '').toLowerCase();
      if (['high', 'p0', 'p1', 'critical', 'urgent'].includes(v)) return 3;
      if (['medium', 'p2', 'normal'].includes(v)) return 2;
      if (['low', 'p3'].includes(v)) return 1;
      return 0;
    };

    const projectData = projects.map(proj => {
      const allRows = proj.tasks || [];
      const modules = allRows.filter((t) => t.recordType === 'module');
      const tasks = allRows.filter((t) => t.recordType !== 'module');
      const totalTasks = tasks.length;
      
      const completed = tasks.filter(t => t.status === 'Completed').length;
      const inDevelopment = tasks.filter(t => t.status === 'In Development').length;
      const blocked = tasks.filter(t => t.status === 'Blocked').length;
      const upcoming = tasks.filter(t => t.status === 'Upcoming').length;
      const onHold = tasks.filter(t => t.status === 'On Hold').length;
      // Pending is anything else (Assigned, Code Review, Testing)
      const pending = tasks.filter(t => 
        ['Assigned', 'Code Review', 'Testing'].includes(t.status)
      ).length;

      // Last updated is the latest updatedAt of any task, or project's updatedAt if no tasks
      let lastUpdated = proj.updatedAt;
      if (tasks.length > 0) {
        const dates = tasks.map(t => new Date(t.updatedAt).getTime());
        lastUpdated = new Date(Math.max(...dates));
      }

      const startDates = tasks.map((t) => t.startDate).filter(Boolean).sort();
      const dueDates = tasks.map((t) => t.dueDate).filter(Boolean).sort();
      const startDate = startDates[0] || (proj.createdAt ? String(proj.createdAt).slice(0, 10) : null);
      const dueDate = dueDates.length ? dueDates[dueDates.length - 1] : null;

      const memberMap = {};
      const assignCount = {};
      tasks.forEach((t) => {
        if (t.developer && t.developer.id) {
          memberMap[t.developer.id] = {
            id: t.developer.id,
            name: t.developer.name,
            color: t.developer.color,
          };
          assignCount[t.developer.id] = (assignCount[t.developer.id] || 0) + 1;
        }
      });
      const members = Object.values(memberMap);
      const topDevId = Object.keys(assignCount).sort((a, b) => assignCount[b] - assignCount[a])[0];
      const manager = topDevId ? memberMap[topDevId] : null;

      let status = 'Active';
      if (totalTasks > 0 && completed === totalTasks) status = 'Completed';
      else if (blocked > 0) status = 'Delayed';
      else if (onHold > 0 && inDevelopment === 0) status = 'On Hold';

      const daysSinceUpdate = lastUpdated
        ? Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 86400000)
        : 0;
      const archived = status === 'Completed' && daysSinceUpdate >= 60;

      const progress = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

      let bestPriority = null;
      let bestRank = -1;
      tasks.forEach((t) => {
        if (t.status === 'Completed') return;
        const r = priorityRank(t.priority);
        if (r > bestRank) {
          bestRank = r;
          bestPriority = t.priority;
        }
      });
      if (!bestPriority) {
        const any = tasks.find((t) => t.priority);
        bestPriority = any?.priority || 'Medium';
      }

      const estimatedHours = tasks.reduce((s, t) => s + (Number(t.estimatedHours) || 0), 0);
      const actualHours = tasks.reduce((s, t) => s + (Number(t.actualHours) || 0), 0);

      const moduleSet = new Set();
      [...tasks, ...modules].forEach((t) => {
        if (t.module) moduleSet.add(String(t.module).trim());
      });

      const tagSet = new Set();
      tasks.forEach((t) => {
        if (!t.tags) return;
        String(t.tags)
          .split(/[,|]/)
          .map((x) => x.trim())
          .filter(Boolean)
          .forEach((tag) => tagSet.add(tag));
      });
      const tags = Array.from(tagSet).slice(0, 8);

      const description =
        tasks.find((t) => t.description)?.description ||
        modules.find((t) => t.description)?.description ||
        null;

      return {
        id: proj.id,
        name: proj.name,
        clientName: proj.clientName,
        description: description ? String(description).slice(0, 160) : null,
        totalTasks,
        completed,
        remaining: Math.max(0, totalTasks - completed),
        inDevelopment,
        pending,
        blocked,
        upcoming,
        onHold,
        moduleCount: moduleSet.size || modules.length,
        estimatedHours: Math.round(estimatedHours * 10) / 10,
        actualHours: Math.round(actualHours * 10) / 10,
        priority: bestPriority,
        tags,
        manager,
        lastUpdated,
        createdAt: proj.createdAt,
        startDate,
        dueDate,
        members,
        status,
        archived,
        progress,
      };
    });

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
          const week = row[columnMap.week]?.trim() || '';
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
            week,
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

          const existingIds = await Task.findAll({
            where: { projectId: project.id },
            attributes: ['taskId'],
            transaction,
          });
          const existingSet = new Set(existingIds.map((t) => t.taskId));
          const conflicts = mappedTasks.filter((t) => existingSet.has(t.taskId));
          if (conflicts.length > 0) {
            await transaction.rollback();
            return res.status(400).json({
              error: 'Validation failed',
              details: conflicts.slice(0, 50).map(
                (t) => `Row ${t.rowNum}: Task ID '${t.taskId}' already exists in this project.`
              ),
            });
          }
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
          week: task.week || null,
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
