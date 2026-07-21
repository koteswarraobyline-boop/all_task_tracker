const { sequelize } = require('../config/database');
const { Developer, Task } = require('../models');

// Helper to validate email format
function isValidEmail(email) {
  if (!email) return true; // Optional
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// GET /developers
exports.getAllDevelopers = async (req, res) => {
  try {
    // Fetch all developers with task counts using subqueries
    const developers = await Developer.findAll({
      attributes: [
        'id',
        'name',
        'email',
        'color',
        'createdAt',
        'updatedAt',
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM tasks AS t
            WHERE t.developer_id = Developer.id
          )`),
          'totalTasks'
        ],
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM tasks AS t
            WHERE t.developer_id = Developer.id AND t.status = 'In Development'
          )`),
          'inDevelopmentTasks'
        ],
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM tasks AS t
            WHERE t.developer_id = Developer.id AND t.status = 'Testing'
          )`),
          'testingTasks'
        ],
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM tasks AS t
            WHERE t.developer_id = Developer.id AND t.status = 'Completed'
          )`),
          'completedTasks'
        ]
      ],
      order: [['name', 'ASC']]
    });

    res.json(developers);
  } catch (error) {
    console.error('Error fetching developers:', error);
    res.status(500).json({ error: 'Failed to fetch developers' });
  }
};

// POST /developers
exports.createDeveloper = async (req, res) => {
  try {
    const { name, email, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if name already exists
    const existing = await Developer.findOne({ where: { name: name.trim() } });
    if (existing) {
      return res.status(400).json({ error: 'A developer with this name already exists' });
    }

    const developer = await Developer.create({
      name: name.trim(),
      email: email ? email.trim() : null,
      color: color || '#1976d2'
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
    const { name, email, color } = req.body;

    const developer = await Developer.findByPk(id);
    if (!developer) {
      return res.status(404).json({ error: 'Developer not found' });
    }

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }
      
      // Check if another developer already has this name
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
      developer.email = email ? email.trim() : null;
    }

    if (color !== undefined) {
      developer.color = color || '#1976d2';
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

    // Since onDelete: 'SET NULL' is configured in index.js, Sequelize will handle updating
    // tasks.developer_id to null when the developer is destroyed.
    await developer.destroy();
    res.json({ message: 'Developer deleted successfully' });
  } catch (error) {
    console.error('Error deleting developer:', error);
    res.status(500).json({ error: 'Failed to delete developer' });
  }
};
