const { Task, Developer, Project } = require('../models');
const { sequelize } = require('../config/database');
const { buildAdminDashboard } = require('../services/adminDashboardService');

// GET /dashboard/global
exports.getGlobalDashboard = async (req, res) => {
  try {
    const projects = await Project.findAll({
      include: [{
        model: Task,
        as: 'tasks',
        attributes: [
          'id', 'taskId', 'taskName', 'status', 'updatedAt', 'recordType', 'startDate', 'dueDate',
          'developerId', 'priority', 'estimatedHours', 'actualHours', 'module', 'tags', 'description',
        ],
        include: [{
          model: Developer,
          as: 'developer',
          attributes: ['id', 'name', 'color'],
          required: false,
        }],
      }],
      order: [['createdAt', 'DESC']],
    });

    const payload = buildAdminDashboard(projects);
    res.json(payload);
  } catch (error) {
    console.error('Error compiling global dashboard:', error);
    res.status(500).json({ error: 'Failed to compile global dashboard metrics' });
  }
};

// GET /dashboard/:projectId
exports.getProjectDashboard = async (req, res) => {
  if (req.params.projectId === 'global') {
    return exports.getGlobalDashboard(req, res);
  }
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Verify project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Fetch work items (exclude module container rows from KPIs)
    const allRows = await Task.findAll({
      where: { projectId },
      include: [{
        model: Developer,
        as: 'developer',
        attributes: ['id', 'name', 'color']
      }],
      order: [['dueDate', 'ASC'], ['createdAt', 'ASC']]
    });
    const tasks = allRows.filter((t) => t.recordType !== 'module');

    // 1. Summary Cards Calculations
    const totalTasks = tasks.length;
    const summary = {
      total: totalTasks,
      upcoming: 0,
      assigned: 0,
      inDevelopment: 0,
      testing: 0,
      completed: 0,
      blocked: 0,
      onHold: 0
    };

    tasks.forEach(t => {
      switch (t.status) {
        case 'Upcoming': summary.upcoming++; break;
        case 'Assigned': summary.assigned++; break;
        case 'In Development': summary.inDevelopment++; break;
        case 'Code Review':
        case 'Testing': summary.testing++; break;
        case 'Completed': summary.completed++; break;
        case 'Blocked': summary.blocked++; break;
        case 'On Hold': summary.onHold++; break;
      }
    });

    // 2. Status Distribution (Pie Chart)
    const statusDistribution = Object.keys(summary)
      .filter(k => k !== 'total')
      .map(key => {
        const readableNames = {
          upcoming: 'Upcoming',
          assigned: 'Assigned',
          inDevelopment: 'In Development',
          testing: 'Testing',
          completed: 'Completed',
          blocked: 'Blocked',
          onHold: 'On Hold'
        };
        return {
          name: readableNames[key],
          value: summary[key]
        };
      })
      .filter(item => item.value > 0); // Only include statuses that have tasks

    // 3. Developer Workload (Bar Chart)
    // Group tasks by developer
    const devWorkloadMap = {};
    
    // Initialize with all developers assigned to at least one task or all developers in system
    const allDevelopers = await Developer.findAll({ attributes: ['id', 'name', 'color'] });
    allDevelopers.forEach(d => {
      devWorkloadMap[d.id] = {
        developerName: d.name,
        color: d.color,
        completed: 0,
        inProgress: 0, // Assigned, In Development, Code Review, Testing, On Hold, Blocked
        upcoming: 0    // Upcoming tasks
      };
    });

    // Handle Unassigned tasks
    devWorkloadMap['unassigned'] = {
      developerName: 'Unassigned',
      color: '#9e9e9e',
      completed: 0,
      inProgress: 0,
      upcoming: 0
    };

    tasks.forEach(t => {
      const devId = t.developerId || 'unassigned';
      if (!devWorkloadMap[devId]) {
        devWorkloadMap[devId] = {
          developerName: t.developer ? t.developer.name : 'Unassigned',
          color: t.developer ? t.developer.color : '#9e9e9e',
          completed: 0,
          inProgress: 0,
          upcoming: 0
        };
      }

      if (t.status === 'Completed') {
        devWorkloadMap[devId].completed++;
      } else if (t.status === 'Upcoming') {
        devWorkloadMap[devId].upcoming++;
      } else {
        devWorkloadMap[devId].inProgress++;
      }
    });

    const developerWorkload = Object.values(devWorkloadMap).filter(dw => 
      dw.completed > 0 || dw.inProgress > 0 || dw.upcoming > 0
    );

    // 4. Task Progress (Line Chart)
    // Create cumulative completion timeline.
    // X-axis: Dates (derived from start_date / due_date of tasks)
    // Y-axis: Cumulative Tasks and Cumulative Completed Tasks
    const dateProgressMap = {};
    
    // Gather all dates, sorting them helps construct the timeline
    tasks.forEach(t => {
      // Use due_date as progress checkpoint. If none, fall back to created_at date.
      const dateStr = t.dueDate || new Date(t.createdAt).toISOString().split('T')[0];
      if (!dateProgressMap[dateStr]) {
        dateProgressMap[dateStr] = {
          totalForDate: 0,
          completedForDate: 0
        };
      }
      dateProgressMap[dateStr].totalForDate++;
      if (t.status === 'Completed') {
        dateProgressMap[dateStr].completedForDate++;
      }
    });

    const sortedDates = Object.keys(dateProgressMap).sort();
    let runningTotal = 0;
    let runningCompleted = 0;
    
    const taskProgressTimeline = sortedDates.map(date => {
      runningTotal += dateProgressMap[date].totalForDate;
      runningCompleted += dateProgressMap[date].completedForDate;
      return {
        date,
        totalTasks: runningTotal,
        completedTasks: runningCompleted
      };
    });

    res.json({
      summary,
      statusDistribution,
      developerWorkload,
      taskProgressTimeline
    });
  } catch (error) {
    console.error('Error compiling dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to compile dashboard metrics' });
  }
};
