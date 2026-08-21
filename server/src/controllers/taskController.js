const { Op } = require('sequelize');
const { Task, Developer, Project } = require('../models');

// GET /projects/:id/tasks
exports.getProjectTasks = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const {
      search,
      status,
      developerId,
      priority,
      module: moduleFilter,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 50,
    } = req.query;

    const whereClause = { project_id: projectId };

    // Apply search filter
    if (search) {
      whereClause[Op.or] = [
        { task_id: { [Op.like]: `%${search}%` } },
        { task_name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    // Apply status filter
    if (status) {
      const statuses = status.split(',');
      whereClause.status = { [Op.in]: statuses };
    }

    // Apply developer filter
    if (developerId) {
      if (developerId === 'null' || developerId === 'unassigned') {
        whereClause.developer_id = null;
      } else {
        whereClause.developer_id = parseInt(developerId);
      }
    }

    // Apply priority filter
    if (priority) {
      whereClause.priority = priority;
    }

    // Apply module filter
    if (moduleFilter) {
      whereClause.module = moduleFilter;
    }

    // Determine pagination parameters
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const offset = (parsedPage - 1) * parsedLimit;

    // Determine sorting options
    // Map frontend sorting keys to database columns
    const allowedSortFields = {
      id: 'id',
      taskId: 'task_id',
      module: 'module',
      feature: 'feature',
      taskName: 'task_name',
      priority: 'priority',
      status: 'status',
      startDate: 'start_date',
      dueDate: 'due_date',
      estimatedHours: 'estimated_hours',
      actualHours: 'actual_hours',
      remarks: 'remarks',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };

    const orderField = allowedSortFields[sortBy] || 'created_at';
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Query options
    const queryOptions = {
      where: whereClause,
      include: [{
        model: Developer,
        as: 'developer',
        attributes: ['id', 'name', 'email', 'color'],
      }],
      order: [[orderField, orderDirection]],
    };

    // Only apply pagination if limit is a positive number
    if (parsedLimit > 0) {
      queryOptions.limit = parsedLimit;
      queryOptions.offset = offset;
    }

    const { count, rows } = await Task.findAndCountAll(queryOptions);

    res.json({
      tasks: rows,
      totalCount: count,
      page: parsedPage,
      limit: parsedLimit > 0 ? parsedLimit : count,
      totalPages: parsedLimit > 0 ? Math.ceil(count / parsedLimit) : 1,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// PUT /tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const {
      developerId,
      status,
      actualHours,
      remarks,
      phase,
      week,
      estDays,
      dependencies,
      taskName,
      description,
      priority,
      module,
      feature,
      startDate,
      dueDate,
      estimatedHours,
    } = req.body;

    const updates = {};

    if (developerId !== undefined) {
      updates.developerId = developerId ? parseInt(developerId) : null;
    }

    if (status !== undefined) {
      const validStatuses = [
        'Upcoming', 'Assigned', 'In Development',
        'Testing', 'Completed', 'Blocked', 'On Hold'
      ];
      let nextStatus = status;
      if (nextStatus === 'Code Review') nextStatus = 'Testing';
      if (nextStatus && !validStatuses.includes(nextStatus)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
      updates.status = nextStatus;
      // Keep Progress % in sync with workflow status unless caller sets it explicitly
      if (req.body.progressPercent === undefined) {
        const statusProgress = {
          Upcoming: 0,
          Assigned: 15,
          'In Development': 40,
          Testing: 80,
          Completed: 100,
          Blocked: 25,
          'On Hold': 20,
        };
        updates.progressPercent = statusProgress[nextStatus] ?? 0;
      }
    }

    if (actualHours !== undefined) {
      updates.actualHours = actualHours === '' || actualHours === null ? null : parseFloat(actualHours);
    }

    if (remarks !== undefined) updates.remarks = remarks;
    if (phase !== undefined) updates.phase = phase || null;
    if (week !== undefined) updates.week = week || null;
    if (estDays !== undefined) {
      updates.estDays = estDays === '' || estDays === null ? null : parseFloat(estDays);
    }
    if (dependencies !== undefined) updates.dependencies = dependencies || null;

    if (taskName !== undefined) {
      const name = String(taskName || '').trim();
      if (!name) {
        return res.status(400).json({ error: 'Task name is required' });
      }
      updates.taskName = name;
    }
    if (description !== undefined) updates.description = description || null;
    if (priority !== undefined) updates.priority = priority || null;
    if (module !== undefined) updates.module = module || null;
    if (feature !== undefined) updates.feature = feature || null;
    if (startDate !== undefined) updates.startDate = startDate || null;
    if (dueDate !== undefined) updates.dueDate = dueDate || null;
    if (estimatedHours !== undefined) {
      updates.estimatedHours =
        estimatedHours === '' || estimatedHours === null ? null : parseFloat(estimatedHours);
    }
    if (req.body.parentId !== undefined) updates.parentId = req.body.parentId || null;
    if (req.body.recordType !== undefined) updates.recordType = req.body.recordType || 'task';
    if (req.body.tags !== undefined) updates.tags = req.body.tags || null;
    if (req.body.progressPercent !== undefined) {
      updates.progressPercent =
        req.body.progressPercent === '' || req.body.progressPercent === null
          ? null
          : parseFloat(req.body.progressPercent);
    }
    if (req.body.customFields !== undefined) updates.customFields = req.body.customFields || null;

    await task.update(updates);

    const updatedTask = await Task.findByPk(taskId, {
      include: [{
        model: Developer,
        as: 'developer',
        attributes: ['id', 'name', 'email', 'color'],
      }],
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

// POST /projects/:id/tasks — create a single task
exports.createTask = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const {
      taskName,
      taskId,
      description,
      status,
      developerId,
      priority,
      module,
      feature,
      phase,
      week,
      startDate,
      dueDate,
      estimatedHours,
      actualHours,
      estDays,
      dependencies,
      remarks,
      parentId,
      recordType,
      tags,
      progressPercent,
      customFields,
    } = req.body || {};

    const name = String(taskName || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Task name is required' });
    }

    const validStatuses = [
      'Upcoming', 'Assigned', 'In Development',
      'Testing', 'Completed', 'Blocked', 'On Hold',
    ];
    let resolvedStatus = status || 'Upcoming';
    if (resolvedStatus === 'Code Review') resolvedStatus = 'Testing';
    if (!validStatuses.includes(resolvedStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    let resolvedTaskId = String(taskId || '').trim();
    if (!resolvedTaskId) {
      const count = await Task.count({ where: { projectId } });
      resolvedTaskId = `T-${count + 1}`;
    } else {
      const existing = await Task.findOne({ where: { projectId, taskId: resolvedTaskId } });
      if (existing) {
        return res.status(400).json({ error: `Task ID '${resolvedTaskId}' already exists in this project` });
      }
    }

    const created = await Task.create({
      projectId,
      taskName: name,
      taskId: resolvedTaskId,
      description: description || null,
      status: resolvedStatus,
      developerId: developerId ? parseInt(developerId, 10) : null,
      priority: priority || null,
      module: module || null,
      feature: feature || null,
      phase: phase || null,
      week: week || null,
      startDate: startDate || null,
      dueDate: dueDate || null,
      estimatedHours:
        estimatedHours === '' || estimatedHours === null || estimatedHours === undefined
          ? null
          : parseFloat(estimatedHours),
      actualHours:
        actualHours === '' || actualHours === null || actualHours === undefined
          ? null
          : parseFloat(actualHours),
      estDays:
        estDays === '' || estDays === null || estDays === undefined
          ? null
          : parseFloat(estDays),
      dependencies: dependencies || null,
      remarks: remarks || null,
      parentId: parentId || null,
      recordType: recordType || 'task',
      tags: tags || null,
      progressPercent:
        progressPercent === '' || progressPercent === null || progressPercent === undefined
          ? ({
              Upcoming: 0,
              Assigned: 15,
              'In Development': 40,
              Testing: 80,
              Completed: 100,
              Blocked: 25,
              'On Hold': 20,
            }[resolvedStatus] ?? 0)
          : parseFloat(progressPercent),
      customFields: customFields || null,
    });

    const full = await Task.findByPk(created.id, {
      include: [{
        model: Developer,
        as: 'developer',
        attributes: ['id', 'name', 'email', 'color'],
      }],
    });

    return res.status(201).json(full);
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({ error: 'Failed to create task' });
  }
};

// DELETE /tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.destroy();
    return res.json({ message: 'Task deleted successfully', id: taskId });
  } catch (error) {
    console.error('Error deleting task:', error);
    return res.status(500).json({ error: 'Failed to delete task' });
  }
};
