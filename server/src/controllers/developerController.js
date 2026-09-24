const { sequelize } = require('../config/database');
const { Developer, Task, Project } = require('../models');
const { QueryTypes, Op } = require('sequelize');

const VALID_STATUSES = ['Active', 'On Leave', 'Inactive'];
const WORKLOAD_CAPACITY_HOURS = 40;
const WORKLOAD_CAPACITY_TASKS = 12;

function isValidEmail(email) {
  if (!email) return true;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function computeWorkloadPercent(activeTasks, openEstimatedHours) {
  const hours = parseFloat(openEstimatedHours) || 0;
  const active = parseInt(activeTasks, 10) || 0;
  if (hours > 0) {
    return Math.min(100, Math.round((hours / WORKLOAD_CAPACITY_HOURS) * 100));
  }
  return Math.min(100, Math.round((active / WORKLOAD_CAPACITY_TASKS) * 100));
}

function mapDeveloperRow(row) {
  const plain = row.get ? row.get({ plain: true }) : row;
  const activeTasks = parseInt(plain.activeTasks, 10) || 0;
  const workloadPercent = computeWorkloadPercent(activeTasks, plain.openEstimatedHours);

  return {
    ...plain,
    activeTasks,
    totalTasks: parseInt(plain.totalTasks, 10) || 0,
    inDevelopmentTasks: parseInt(plain.inDevelopmentTasks, 10) || 0,
    testingTasks: parseInt(plain.testingTasks, 10) || 0,
    completedTasks: parseInt(plain.completedTasks, 10) || 0,
    openEstimatedHours: parseFloat(plain.openEstimatedHours) || 0,
    workloadPercent,
    status: plain.status || 'Active',
    lastActiveAt: plain.lastActiveAt || plain.updatedAt || null,
    projects: plain.projects || [],
  };
}

async function fetchDeveloperProjectsMap() {
  const rows = await sequelize.query(
    `SELECT
      t.developer_id AS developerId,
      p.id AS projectId,
      p.name AS projectName,
      COUNT(*) AS totalTasks,
      SUM(CASE WHEN t.status != 'Completed' THEN 1 ELSE 0 END) AS activeTasks
    FROM tasks t
    INNER JOIN projects p ON p.id = t.project_id
    WHERE t.developer_id IS NOT NULL
      AND (t.record_type IS NULL OR t.record_type = 'task')
    GROUP BY t.developer_id, p.id, p.name
    ORDER BY activeTasks DESC, p.name ASC`,
    { type: QueryTypes.SELECT }
  );

  const map = new Map();
  for (const row of rows) {
    const devId = row.developerId;
    if (!map.has(devId)) map.set(devId, []);
    map.get(devId).push({
      id: row.projectId,
      name: row.projectName,
      totalTasks: parseInt(row.totalTasks, 10) || 0,
      activeTasks: parseInt(row.activeTasks, 10) || 0,
    });
  }
  return map;
}

const DEVELOPER_TASK_STATS_ATTRIBUTES = [
  [
    sequelize.literal(`(
      SELECT COUNT(*)
      FROM tasks AS t
      WHERE t.developer_id = Developer.id
        AND (t.record_type IS NULL OR t.record_type = 'task')
    )`),
    'totalTasks',
  ],
  [
    sequelize.literal(`(
      SELECT COUNT(*)
      FROM tasks AS t
      WHERE t.developer_id = Developer.id
        AND t.status != 'Completed'
        AND (t.record_type IS NULL OR t.record_type = 'task')
    )`),
    'activeTasks',
  ],
  [
    sequelize.literal(`(
      SELECT COUNT(*)
      FROM tasks AS t
      WHERE t.developer_id = Developer.id AND t.status = 'In Development'
    )`),
    'inDevelopmentTasks',
  ],
  [
    sequelize.literal(`(
      SELECT COUNT(*)
      FROM tasks AS t
      WHERE t.developer_id = Developer.id AND t.status = 'Testing'
    )`),
    'testingTasks',
  ],
  [
    sequelize.literal(`(
      SELECT COUNT(*)
      FROM tasks AS t
      WHERE t.developer_id = Developer.id AND t.status = 'Completed'
    )`),
    'completedTasks',
  ],
  [
    sequelize.literal(`(
      SELECT COALESCE(SUM(t.estimated_hours), 0)
      FROM tasks AS t
      WHERE t.developer_id = Developer.id
        AND t.status != 'Completed'
        AND (t.record_type IS NULL OR t.record_type = 'task')
    )`),
    'openEstimatedHours',
  ],
  [
    sequelize.literal(`(
      SELECT MAX(t.updated_at)
      FROM tasks AS t
      WHERE t.developer_id = Developer.id
    )`),
    'lastActiveAt',
  ],
];

function mapDeveloperTaskRow(task) {
  const plain = task.get ? task.get({ plain: true }) : task;
  return {
    id: plain.id,
    taskId: plain.taskId,
    taskName: plain.taskName,
    module: plain.module,
    phase: plain.phase,
    feature: plain.feature,
    status: plain.status,
    priority: plain.priority,
    dueDate: plain.dueDate,
    startDate: plain.startDate,
    progressPercent: plain.progressPercent,
    estimatedHours: plain.estimatedHours,
    projectId: plain.projectId,
    projectName: plain.project?.name || null,
    updatedAt: plain.updatedAt,
    remarks: plain.remarks,
  };
}

// GET /developers
exports.getAllDevelopers = async (req, res) => {
  try {
    const developers = await Developer.findAll({
      attributes: [
        'id',
        'name',
        'email',
        'color',
        'role',
        'team',
        'status',
        'skills',
        'createdAt',
        'updatedAt',
        ...DEVELOPER_TASK_STATS_ATTRIBUTES,
      ],
      order: [['name', 'ASC']],
    });

    const projectMap = await fetchDeveloperProjectsMap();

    res.json(
      developers.map((row) => {
        const mapped = mapDeveloperRow(row);
        mapped.projects = projectMap.get(mapped.id) || [];
        return mapped;
      })
    );
  } catch (error) {
    console.error('Error fetching developers:', error);
    res.status(500).json({ error: 'Failed to fetch developers' });
  }
};

// GET /developers/:id
exports.getDeveloperById = async (req, res) => {
  try {
    const { id } = req.params;
    const developer = await Developer.findByPk(id, {
      attributes: [
        'id',
        'name',
        'email',
        'color',
        'role',
        'team',
        'status',
        'skills',
        'createdAt',
        'updatedAt',
        ...DEVELOPER_TASK_STATS_ATTRIBUTES,
      ],
    });

    if (!developer) {
      return res.status(404).json({ error: 'Developer not found' });
    }

    const tasks = await Task.findAll({
      where: {
        developerId: id,
        [Op.or]: [{ recordType: 'task' }, { recordType: null }],
      },
      include: [{ model: Project, as: 'project', attributes: ['id', 'name'] }],
      order: [['updatedAt', 'DESC']],
    });

    const projectMap = await fetchDeveloperProjectsMap();
    const mapped = mapDeveloperRow(developer);
    mapped.projects = projectMap.get(mapped.id) || [];
    mapped.tasks = tasks.map(mapDeveloperTaskRow);

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching developer:', error);
    res.status(500).json({ error: 'Failed to fetch developer' });
  }
};

async function validateUniqueEmail(email, excludeId = null) {
  if (!email) return null;
  const trimmed = email.trim();
  const existing = await Developer.findOne({ where: { email: trimmed } });
  if (existing && existing.id !== excludeId) {
    return 'A developer with this email already exists';
  }
  return null;
}

// POST /developers
exports.createDeveloper = async (req, res) => {
  try {
    const { name, email, color, role, team, status, skills, allocation } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const emailError = await validateUniqueEmail(email);
    if (emailError) {
      return res.status(400).json({ error: emailError });
    }

    const existing = await Developer.findOne({ where: { name: name.trim() } });
    if (existing) {
      return res.status(400).json({ error: 'A developer with this name already exists' });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const developer = await Developer.create({
      name: name.trim(),
      email: email ? email.trim() : null,
      color: color || '#1976d2',
      role: role ? String(role).trim() : null,
      team: team ? String(team).trim() : null,
      status: status || 'Active',
      skills: skills ? String(skills).trim() : null,
      allocation:
        allocation === undefined || allocation === null || allocation === ''
          ? 100
          : Math.min(100, Math.max(0, parseInt(allocation, 10) || 0)),
    });

    res.status(201).json(developer);
  } catch (error) {
    console.error('Error creating developer:', error);
    res.status(500).json({ error: 'Failed to create developer' });
  }
};

// PUT /developers/:id
exports.updateDeveloper = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, color, role, team, status, skills, allocation } = req.body;

    const developer = await Developer.findByPk(id);
    if (!developer) {
      return res.status(404).json({ error: 'Developer not found' });
    }

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const existing = await Developer.findOne({ where: { name: name.trim() } });
      if (existing && existing.id !== developer.id) {
        return res.status(400).json({ error: 'A developer with this name already exists' });
      }
      developer.name = name.trim();
    }

    if (email !== undefined) {
      if (email && !isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      const emailError = await validateUniqueEmail(email, developer.id);
      if (emailError) {
        return res.status(400).json({ error: emailError });
      }
      developer.email = email ? email.trim() : null;
    }

    if (color !== undefined) {
      developer.color = color || '#1976d2';
    }

    if (role !== undefined) {
      developer.role = role ? String(role).trim() : null;
    }

    if (team !== undefined) {
      developer.team = team ? String(team).trim() : null;
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      developer.status = status;
    }

    if (skills !== undefined) {
      developer.skills = skills ? String(skills).trim() : null;
    }

    if (allocation !== undefined) {
      developer.allocation = Math.min(
        100,
        Math.max(0, parseInt(allocation, 10) || 0)
      );
    }

    await developer.save();
    res.json(developer);
  } catch (error) {
    console.error('Error updating developer:', error);
    res.status(500).json({ error: 'Failed to update developer' });
  }
};

// DELETE /developers/:id
exports.deleteDeveloper = async (req, res) => {
  try {
    const { id } = req.params;
    const developer = await Developer.findByPk(id);
    if (!developer) {
      return res.status(404).json({ error: 'Developer not found' });
    }

    await developer.destroy();
    res.json({ message: 'Developer deleted successfully' });
  } catch (error) {
    console.error('Error deleting developer:', error);
    res.status(500).json({ error: 'Failed to delete developer' });
  }
};
