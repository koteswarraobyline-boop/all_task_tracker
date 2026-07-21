const { Op } = require('sequelize');
const { Task, Developer } = require('../models');

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

    // Editable fields: assigned developer, status, actual hours, remarks
    const { developerId, status, actualHours, remarks } = req.body;

    const updates = {};

    if (developerId !== undefined) {
      // Allow unassigning by passing null
      updates.developerId = developerId ? parseInt(developerId) : null;
    }

    if (status !== undefined) {
      const validStatuses = [
        'Upcoming', 'Assigned', 'In Development', 'Code Review',
        'Testing', 'Completed', 'Blocked', 'On Hold'
      ];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
      updates.status = status;
    }

    if (actualHours !== undefined) {
      updates.actualHours = actualHours === '' || actualHours === null ? null : parseFloat(actualHours);
    }

    if (remarks !== undefined) {
      updates.remarks = remarks;
    }

    await task.update(updates);

    // Fetch the updated task with its developer info
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
