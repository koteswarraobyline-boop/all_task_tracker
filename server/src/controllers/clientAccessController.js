const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const { ClientAccessRecord, Project, Task } = require('../models');
const { analyzeProjectDelay } = require('../services/projectDelayAnalysisService');
const { toClientProject, toClientDelayAnalysis } = require('../dto/clientProjectDto');
const { toClientTasks } = require('../dto/clientTaskDto');
const { todayStart } = require('../utils/dateUtils');

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuidV4(token) {
  return UUID_V4_REGEX.test(token);
}

function buildShareUrl(token) {
  const base = process.env.CLIENT_APP_URL || 'http://localhost:5174';
  return `${base.replace(/\/$/, '')}/client/${token}`;
}

function serializeRecord(record) {
  const plain = record.toJSON ? record.toJSON() : record;
  const linkedProject = plain.project || plain.Project;
  return {
    id: plain.id,
    token: plain.token,
    projectId: plain.projectId,
    clientName: plain.clientName,
    company: plain.company,
    email: plain.email,
    status: plain.status,
    expiresAt: plain.expiresAt,
    lastOpenedAt: plain.lastOpenedAt,
    passwordProtected: Boolean(plain.passwordHash),
    shareUrl: buildShareUrl(plain.token),
    project: linkedProject
      ? {
          id: linkedProject.id,
          name: linkedProject.name,
          clientName: linkedProject.clientName,
        }
      : undefined,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

/**
 * Resolve share token → bound project. Never trusts a client-supplied projectId.
 */
async function resolveShareAccess(token, password) {
  if (!isValidUuidV4(token)) {
    return { ok: false, status: 400, body: { error: 'Invalid token format' } };
  }

  const record = await ClientAccessRecord.findOne({
    where: { token },
    include: [{ model: Project, as: 'project' }],
  });

  if (!record) {
    return { ok: false, status: 404, body: { error: 'Link not found' } };
  }

  if (record.status === 'disabled') {
    return {
      ok: false,
      status: 403,
      body: { status: 'disabled', error: 'Link is disabled' },
    };
  }

  if (record.passwordHash) {
    if (!password) {
      return {
        ok: false,
        status: 401,
        body: {
          status: 'password_required',
          error: 'Password required',
          clientName: record.clientName,
          company: record.company,
        },
      };
    }

    const ok = await bcrypt.compare(String(password), record.passwordHash);
    if (!ok) {
      return {
        ok: false,
        status: 401,
        body: { status: 'password_required', error: 'Invalid password' },
      };
    }
  }

  if (!record.project) {
    return { ok: false, status: 404, body: { error: 'Linked project not found' } };
  }

  return { ok: true, record };
}

async function loadProjectTasks(projectId) {
  return Task.findAll({
    where: { projectId },
    order: [
      ['module', 'ASC'],
      ['taskId', 'ASC'],
    ],
  });
}

async function validateToken(req, res) {
  try {
    const { token } = req.params;
    const password = req.headers['x-share-password'] || req.query.password;
    const result = await resolveShareAccess(token, password);

    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }

    const { record } = result;
    await record.update({ lastOpenedAt: new Date() });

    const project = record.project;
    const tasks = await loadProjectTasks(project.id);
    const now = todayStart();
    const analysis = analyzeProjectDelay(project, tasks, now);

    return res.json({
      project: toClientProject(project, analysis, {
        clientName: record.clientName,
        company: record.company,
      }),
      delayAnalysis: toClientDelayAnalysis(analysis),
      clientMeta: {
        clientName: record.clientName,
        company: record.company,
        email: record.email,
        projectId: record.projectId,
        token: record.token,
      },
    });
  } catch (error) {
    console.error('validateToken error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /client/:token/tasks
 * Tasks always use record.projectId from the token — never from query/body.
 */
async function getClientTasks(req, res) {
  try {
    const { token } = req.params;
    const password = req.headers['x-share-password'] || req.query.password;
    const result = await resolveShareAccess(token, password);

    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }

    const projectId = result.record.projectId;
    const project = result.record.project;
    const tasks = await loadProjectTasks(projectId);
    const now = todayStart();
    const analysis = analyzeProjectDelay(project, tasks, now);
    const clientTasks = toClientTasks(tasks, now);

    return res.json({
      project: toClientProject(project, analysis, {
        clientName: result.record.clientName,
        company: result.record.company,
      }),
      delayAnalysis: toClientDelayAnalysis(analysis),
      tasks: clientTasks,
      totalCount: clientTasks.length,
    });
  } catch (error) {
    console.error('getClientTasks error:', error);
    return res.status(500).json({ error: 'Failed to load shared project tasks' });
  }
}

async function getClientDelayAnalysis(req, res) {
  try {
    const { token } = req.params;
    const password = req.headers['x-share-password'] || req.query.password;
    const result = await resolveShareAccess(token, password);

    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }

    const project = result.record.project;
    const tasks = await loadProjectTasks(project.id);
    const analysis = analyzeProjectDelay(project, tasks, todayStart());

    return res.json(toClientDelayAnalysis(analysis));
  } catch (error) {
    console.error('getClientDelayAnalysis error:', error);
    return res.status(500).json({ error: 'Failed to load delay analysis' });
  }
}

async function createAccessRecord(req, res) {
  try {
    const {
      projectId,
      clientName,
      company,
      email,
      password,
    } = req.body || {};

    if (!projectId || !clientName) {
      return res.status(400).json({ error: 'projectId and clientName are required' });
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const passwordHash = password
      ? await bcrypt.hash(String(password), 10)
      : null;

    const record = await ClientAccessRecord.create({
      token: randomUUID(),
      projectId: project.id,
      clientName,
      company: company || null,
      email: email || null,
      status: 'active',
      expiresAt: null,
      passwordHash,
    });

    const withProject = await ClientAccessRecord.findByPk(record.id, {
      include: [{ model: Project, as: 'project' }],
    });

    return res.status(201).json(serializeRecord(withProject));
  } catch (error) {
    console.error('createAccessRecord error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors?.[0]?.message || 'Validation error' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function listAccessRecords(req, res) {
  try {
    const where = {};
    if (req.query.projectId) {
      where.projectId = parseInt(req.query.projectId, 10);
    }

    const records = await ClientAccessRecord.findAll({
      where,
      include: [{ model: Project, as: 'project' }],
      order: [['createdAt', 'DESC']],
    });

    return res.json(records.map(serializeRecord));
  } catch (error) {
    console.error('listAccessRecords error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateAccessRecord(req, res) {
  try {
    const { id } = req.params;
    const { status, clientName, company, email, password } = req.body || {};

    const record = await ClientAccessRecord.findByPk(id);
    if (!record) {
      return res.status(404).json({ error: 'Access record not found' });
    }

    const updates = {};
    if (status !== undefined) {
      if (!['active', 'disabled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.status = status;
    }
    updates.expiresAt = null;
    if (clientName !== undefined) updates.clientName = clientName;
    if (company !== undefined) updates.company = company || null;
    if (email !== undefined) updates.email = email || null;
    if (password !== undefined) {
      updates.passwordHash = password
        ? await bcrypt.hash(String(password), 10)
        : null;
    }

    await record.update(updates);

    const withProject = await ClientAccessRecord.findByPk(record.id, {
      include: [{ model: Project, as: 'project' }],
    });

    return res.json(serializeRecord(withProject));
  } catch (error) {
    console.error('updateAccessRecord error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function regenerateToken(req, res) {
  try {
    const { id } = req.params;
    const record = await ClientAccessRecord.findByPk(id);
    if (!record) {
      return res.status(404).json({ error: 'Access record not found' });
    }

    await record.update({ token: randomUUID() });

    const withProject = await ClientAccessRecord.findByPk(record.id, {
      include: [{ model: Project, as: 'project' }],
    });

    return res.json(serializeRecord(withProject));
  } catch (error) {
    console.error('regenerateToken error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteAccessRecord(req, res) {
  try {
    const { id } = req.params;
    const record = await ClientAccessRecord.findByPk(id);
    if (!record) {
      return res.status(404).json({ error: 'Access record not found' });
    }

    await record.destroy();
    return res.json({ success: true });
  } catch (error) {
    console.error('deleteAccessRecord error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  validateToken,
  getClientTasks,
  getClientDelayAnalysis,
  createAccessRecord,
  listAccessRecords,
  updateAccessRecord,
  regenerateToken,
  deleteAccessRecord,
};
