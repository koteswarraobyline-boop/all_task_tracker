const { Task, Developer, Project } = require('../models');
const exportService = require('../utils/exportService');

const ALLOWED_FORMATS = new Set(['csv', 'xlsx', 'pdf']);

function parseFormat(raw) {
  const format = String(raw || 'csv').toLowerCase();
  return ALLOWED_FORMATS.has(format) ? format : null;
}

function sendExportFile(res, { buffer, mime, filename }) {
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

/** GET /projects/:id/export/tasks?format=csv|xlsx|pdf */
exports.exportProjectTasks = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const format = parseFormat(req.query.format);
    if (!format) {
      return res.status(400).json({ error: 'Invalid format. Use csv, xlsx, or pdf.' });
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const tasks = await Task.findAll({
      where: { projectId },
      include: [{
        model: Developer,
        as: 'developer',
        attributes: ['id', 'name', 'email', 'color'],
      }],
      order: [['task_id', 'ASC']],
    });

    const summary = exportService.buildProjectSummary(project, tasks);
    const file = await exportService.buildProjectExport(format, project, tasks, summary);
    return sendExportFile(res, file);
  } catch (error) {
    console.error('Error exporting project tasks:', error);
    return res.status(500).json({ error: 'Failed to export project tasks' });
  }
};

/** GET /dashboard/global/export?format=csv|xlsx|pdf */
exports.exportGlobalDashboard = async (req, res) => {
  try {
    const format = parseFormat(req.query.format);
    if (!format) {
      return res.status(400).json({ error: 'Invalid format. Use csv, xlsx, or pdf.' });
    }

    const projects = await Project.findAll({
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
      order: [['createdAt', 'DESC']],
    });

    const file = await exportService.buildGlobalExport(format, projects);
    return sendExportFile(res, file);
  } catch (error) {
    console.error('Error exporting global dashboard:', error);
    return res.status(500).json({ error: 'Failed to export dashboard' });
  }
};
