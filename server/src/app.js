const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize, ensureDatabaseExists } = require('./config/database');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const developerRoutes = require('./routes/developerRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api', taskRoutes); // Register tasks and put task routes
app.use('/api/developers', developerRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express Error Handler:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected error occurred'
  });
});

// Start server
async function startServer() {
  try {
    // 1. Ensure the database exists
    await ensureDatabaseExists();

    // 2. Authenticate connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // 3. Sync Models (alter table structure if changed in development)
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start the server:', error);
    process.exit(1);
  }
}

startServer();
