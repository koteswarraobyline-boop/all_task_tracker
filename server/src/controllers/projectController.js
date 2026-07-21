const fs = require('fs');
const csv = require('csv-parser');
const { sequelize } = require('../config/database');
const { Project, Task, Developer } = require('../models');

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
        attributes: ['id', 'status', 'updatedAt']
      }],
      order: [['createdAt', 'DESC']]
    });

    const projectData = projects.map(proj => {
      const tasks = proj.tasks || [];
      const totalTasks = tasks.length;
      
      const completed = tasks.filter(t => t.status === 'Completed').length;
      const inDevelopment = tasks.filter(t => t.status === 'In Development').length;
      const blocked = tasks.filter(t => t.status === 'Blocked').length;
      const upcoming = tasks.filter(t => t.status === 'Upcoming').length;
      // Pending is anything else (Assigned, Code Review, Testing, On Hold)
      const pending = tasks.filter(t => 
        ['Assigned', 'Code Review', 'Testing', 'On Hold'].includes(t.status)
      ).length;

      // Last updated is the latest updatedAt of any task, or project's updatedAt if no tasks
      let lastUpdated = proj.updatedAt;
      if (tasks.length > 0) {
        const dates = tasks.map(t => new Date(t.updatedAt).getTime());
        lastUpdated = new Date(Math.max(...dates));
      }

      return {
        id: proj.id,
        name: proj.name,
        clientName: proj.clientName,
        totalTasks,
        completed,
        inDevelopment,
        pending,
        blocked,
        upcoming,
        lastUpdated,
        createdAt: proj.createdAt
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
    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Cascading delete is configured, but we do it cleanly
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

  const { name, clientName, mapping } = req.body;
  if (!name) {
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
      const mappedTasks = [];

      // Pre-validation and field mapping
      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        const rowNum = i + 1;

        // Map CSV row to DB fields
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

        // New fields matching spreadsheet specifications
        const phase = row[columnMap.phase]?.trim() || '';
        const week = row[columnMap.week]?.trim() || '';
        const rawEstDays = row[columnMap.estDays]?.trim() || '';
        const dependencies = row[columnMap.dependencies]?.trim() || '';

        // 1. Validate: Missing Task Name
        if (!taskName) {
          validationErrors.push(`Row ${rowNum}: Missing Task Name.`);
        }

        // 2. Validate: Duplicate Task IDs
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
          // Auto-generate task ID if not mapped
          taskId = `T-${rowNum}`;
        }

        // 3. Validate: Invalid Dates
        let startDate = null;
        if (rawStartDate) {
          const parsedStart = new Date(rawStartDate);
          if (isNaN(parsedStart.getTime())) {
            validationErrors.push(`Row ${rowNum}: Invalid Start Date format '${rawStartDate}'.`);
          } else {
            startDate = parsedStart.toISOString().split('T')[0];
          }
        }

        let dueDate = null;
        if (rawDueDate) {
          const parsedDue = new Date(rawDueDate);
          if (isNaN(parsedDue.getTime())) {
            validationErrors.push(`Row ${rowNum}: Invalid Due Date format '${rawDueDate}'.`);
          } else {
            dueDate = parsedDue.toISOString().split('T')[0];
          }
        }

        // Validate hours are numeric
        let estimatedHours = null;
        if (rawEstHours) {
          const est = parseFloat(rawEstHours);
          if (isNaN(est)) {
            validationErrors.push(`Row ${rowNum}: Estimated Hours must be a number.`);
          } else {
            estimatedHours = est;
          }
        }

        let actualHours = null;
        if (rawActHours) {
          const act = parseFloat(rawActHours);
          if (isNaN(act)) {
            validationErrors.push(`Row ${rowNum}: Actual Hours must be a number.`);
          } else {
            actualHours = act;
          }
        }

        // Validate Status matches Enum
        const validStatuses = [
          'Upcoming', 'Assigned', 'In Development', 'Code Review',
          'Testing', 'Completed', 'Blocked', 'On Hold'
        ];
        let status = 'Upcoming';
        if (rawStatus) {
          // Try to clean status string (case insensitive match)
          const matched = validStatuses.find(s => s.toLowerCase() === rawStatus.toLowerCase());
          if (matched) {
            status = matched;
          } else {
            validationErrors.push(`Row ${rowNum}: Invalid Status '${rawStatus}'. Must be one of: ${validStatuses.join(', ')}`);
          }
        } else if (devName) {
          // If developer is assigned but no status, default to 'Assigned'
          status = 'Assigned';
        }

        mappedTasks.push({
          rowNum,
          taskId,
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
        });
      }

      // If any validation errors, return them
      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validationErrors.slice(0, 50) // Return first 50 errors to avoid overwhelming UI
        });
      }

      // Everything valid. Import in transaction!
      const transaction = await sequelize.transaction();
      try {
        // Create project
        const project = await Project.create({
          name,
          clientName: clientName || null
        }, { transaction });

        // Resolve developers. Get unique developer names from file.
        const uniqueDevNames = [...new Set(mappedTasks.map(t => t.devName).filter(Boolean))];
        
        // Find existing developers
        const existingDevs = await Developer.findAll({
          where: { name: uniqueDevNames },
          transaction
        });
        const devMap = {}; // name -> id
        existingDevs.forEach(d => {
          devMap[d.name.toLowerCase()] = d.id;
        });

        // Create new developers for those that don't exist
        for (const devName of uniqueDevNames) {
          if (!devMap[devName.toLowerCase()]) {
            const newDev = await Developer.create({
              name: devName,
              color: getRandomColor()
            }, { transaction });
            devMap[devName.toLowerCase()] = newDev.id;
          }
        }

        // Prepare tasks
        const tasksToInsert = mappedTasks.map(task => ({
          projectId: project.id,
          developerId: task.devName ? devMap[task.devName.toLowerCase()] : null,
          taskId: task.taskId,
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
        }));

        // Bulk create tasks
        await Task.bulkCreate(tasksToInsert, { transaction });
        await transaction.commit();

        res.status(201).json({ 
          message: 'Project imported successfully', 
          projectId: project.id, 
          taskCount: tasksToInsert.length 
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
