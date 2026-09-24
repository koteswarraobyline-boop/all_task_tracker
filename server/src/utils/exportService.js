const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const { enrichProjectRecord } = require('../services/projectEnrichmentService');
const { buildAdminDashboard } = require('../services/adminDashboardService');

const TASK_HEADERS = [
  'Task ID',
  'Name',
  'Status',
  'Priority',
  'Assignee',
  'Start Date',
  'Due Date',
  'Progress %',
  'Module',
  'Phase',
];

function sanitizeFileName(name) {
  return String(name || 'export')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'export';
}

function normalizePriority(priority) {
  const p = String(priority || '').trim();
  if (!p) return '';
  const upper = p.toUpperCase();
  if (upper === 'P0' || upper === 'CRITICAL') return 'Critical';
  if (upper === 'P1' || upper === 'HIGH') return 'High';
  if (upper === 'P2' || upper === 'MEDIUM') return 'Medium';
  if (upper === 'P3' || upper === 'LOW') return 'Low';
  return p;
}

function taskProgressPercent(task) {
  if (task.status === 'Completed') return 100;
  if (task.progressPercent != null && !Number.isNaN(Number(task.progressPercent))) {
    return Math.round(Number(task.progressPercent));
  }
  const map = {
    Upcoming: 0,
    Assigned: 10,
    'In Development': 50,
    'Code Review': 75,
    Testing: 85,
    Blocked: 40,
    'On Hold': 30,
  };
  return map[task.status] ?? 0;
}

function buildTaskRows(tasks) {
  return (tasks || [])
    .filter((t) => t.recordType !== 'module')
    .map((t) => {
      const plain = t.get ? t.get({ plain: true }) : t;
      const dev = plain.developer;
      return [
        plain.taskId || plain.id,
        plain.taskName || '',
        plain.status || '',
        normalizePriority(plain.priority),
        dev?.name || '',
        plain.startDate || '',
        plain.dueDate || '',
        taskProgressPercent(plain),
        plain.module || '',
        plain.phase || '',
      ];
    });
}

function buildProjectSummary(project, tasks) {
  const list = (tasks || []).filter((t) => {
    const rt = t.get ? t.recordType : t.recordType;
    return rt !== 'module';
  });
  const counts = {
    total: list.length,
    completed: 0,
    inDevelopment: 0,
    testing: 0,
    onHold: 0,
    blocked: 0,
  };
  list.forEach((t) => {
    const status = t.get ? t.status : t.status;
    if (status === 'Completed') counts.completed += 1;
    else if (status === 'In Development') counts.inDevelopment += 1;
    else if (status === 'Testing' || status === 'Code Review') counts.testing += 1;
    else if (status === 'On Hold') counts.onHold += 1;
    else if (status === 'Blocked') counts.blocked += 1;
  });

  const plain = project.get ? project.get({ plain: true }) : project;
  const enriched = enrichProjectRecord(plain);

  return {
    Project: plain.name || '—',
    Client: plain.clientName || '—',
    'Project ID': plain.id ? `PRJ-${String(plain.id).padStart(3, '0')}` : '—',
    Status: plain.status || '—',
    'Delivery Status': enriched.deliveryStatus || '—',
    'Total Tasks': counts.total,
    Completed: counts.completed,
    'In Development': counts.inDevelopment,
    Testing: counts.testing,
    'On Hold': counts.onHold,
    Blocked: counts.blocked,
    'Generated At': new Date().toLocaleString(),
  };
}

function summaryToAoa(summary) {
  return [['Field', 'Value'], ...Object.entries(summary).map(([k, v]) => [k, String(v ?? '')])];
}

function buildCsvBuffer(headers, rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  return Buffer.from(lines, 'utf8');
}

function buildXlsxBuffer(sheets) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, data }) => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function buildPdfBuffer(title, sections) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'left' });
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'left' });
    doc.moveDown(0.5);

    sections.forEach(({ heading, headers, rows }, idx) => {
      if (idx > 0) doc.moveDown(0.75);
      if (heading) {
        doc.fontSize(12).font('Helvetica-Bold').text(heading);
        doc.moveDown(0.25);
      }
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text(headers.join('  |  '), { width: doc.page.width - 80 });
      doc.moveDown(0.15);
      doc.font('Helvetica');
      rows.slice(0, 500).forEach((row) => {
        doc.text(row.map((c) => String(c ?? '')).join('  |  '), { width: doc.page.width - 80 });
      });
      if (rows.length > 500) {
        doc.moveDown(0.25);
        doc.text(`… and ${rows.length - 500} more rows (see Excel export for full data).`);
      }
    });

    doc.end();
  });
}

function mimeAndExt(format) {
  switch (format) {
    case 'xlsx':
      return {
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ext: 'xlsx',
      };
    case 'pdf':
      return { mime: 'application/pdf', ext: 'pdf' };
    default:
      return { mime: 'text/csv;charset=utf-8', ext: 'csv' };
  }
}

async function buildProjectExport(format, project, tasks, summary) {
  const taskRows = buildTaskRows(tasks);
  const baseName = sanitizeFileName(project.name || `project_${project.id}`);
  const { mime, ext } = mimeAndExt(format);

  if (format === 'csv') {
    const summaryLines = Object.entries(summary).map(([k, v]) => `"${k}","${String(v).replace(/"/g, '""')}"`);
    const body = [
      '"Task Tracker Project Export"',
      ...summaryLines,
      '',
      buildCsvBuffer(TASK_HEADERS, taskRows).toString('utf8'),
    ].join('\n');
    return {
      buffer: Buffer.from(body, 'utf8'),
      mime,
      filename: `${baseName}_tasks.${ext}`,
    };
  }

  if (format === 'xlsx') {
    return {
      buffer: buildXlsxBuffer([
        { name: 'Summary', data: summaryToAoa(summary) },
        { name: 'Tasks', data: [TASK_HEADERS, ...taskRows] },
      ]),
      mime,
      filename: `${baseName}_tasks.${ext}`,
    };
  }

  const buffer = await buildPdfBuffer(project.name || 'Project Report', [
    { heading: 'Summary', headers: ['Metric', 'Value'], rows: Object.entries(summary) },
    { heading: 'Tasks', headers: TASK_HEADERS, rows: taskRows },
  ]);
  return { buffer, mime, filename: `${baseName}_tasks.${ext}` };
}

function buildProjectListRows(projects) {
  return projects.map((p) => {
    const plain = p.get ? p.get({ plain: true }) : p;
    const enriched = enrichProjectRecord(plain);
    const tasks = plain.tasks || p.tasks || [];
    const workTasks = tasks.filter((t) => t.recordType !== 'module');
    const completed = workTasks.filter((t) => t.status === 'Completed').length;
    const pct = workTasks.length ? Math.round((completed / workTasks.length) * 100) : 0;
    return [
      plain.name || '',
      plain.clientName || '',
      plain.status || '',
      enriched.deliveryStatus || '',
      workTasks.length,
      `${pct}%`,
      enriched.activeDeliveryDate || plain.dueDate || '',
    ];
  });
}

async function buildGlobalExport(format, projects) {
  const payload = buildAdminDashboard(projects);
  const summary = {
    'Total Projects': payload.kpi.total,
    'Completed Projects': payload.kpi.completed,
    'In Progress': payload.kpi.inProgress,
    'At Risk': payload.kpi.atRisk,
    Overdue: payload.kpi.overdue,
    'Total Tasks': payload.taskStatus.total,
    'Generated At': new Date().toLocaleString(),
  };

  const projectHeaders = ['Project', 'Client', 'Status', 'Delivery', 'Tasks', 'Completed %', 'Target Date'];
  const projectRows = buildProjectListRows(projects);
  const overdueHeaders = ['Project', 'Task', 'Module', 'Days Late', 'Status'];
  const overdueRows = (payload.overdueTasks || []).map((t) => [
    t.projectName,
    t.title,
    t.module || '',
    t.daysLate,
    t.status,
  ]);

  const { mime, ext } = mimeAndExt(format);

  if (format === 'csv') {
    const parts = [
      buildCsvBuffer(['Metric', 'Value'], Object.entries(summary)).toString('utf8'),
      '',
      buildCsvBuffer(projectHeaders, projectRows).toString('utf8'),
      '',
      buildCsvBuffer(overdueHeaders, overdueRows).toString('utf8'),
    ];
    return {
      buffer: Buffer.from(parts.join('\n'), 'utf8'),
      mime,
      filename: `admin_dashboard.${ext}`,
    };
  }

  if (format === 'xlsx') {
    const sheets = [
      { name: 'Summary', data: summaryToAoa(summary) },
      { name: 'Projects', data: [projectHeaders, ...projectRows] },
      { name: 'Overdue', data: [overdueHeaders, ...overdueRows] },
    ];
    if (payload.upcomingDeadlines?.length) {
      sheets.push({
        name: 'Upcoming',
        data: [
          ['Project', 'Task', 'Module', 'Due Date', 'Days Until'],
          ...payload.upcomingDeadlines.map((t) => [
            t.projectName,
            t.title,
            t.module || '',
            t.dueDate,
            t.daysUntil,
          ]),
        ],
      });
    }
    return {
      buffer: buildXlsxBuffer(sheets),
      mime,
      filename: `admin_dashboard.${ext}`,
    };
  }

  const buffer = await buildPdfBuffer('Admin Dashboard Report', [
    { heading: 'Summary', headers: ['Metric', 'Value'], rows: Object.entries(summary) },
    { heading: 'Projects', headers: projectHeaders, rows: projectRows },
    { heading: 'Overdue Tasks', headers: overdueHeaders, rows: overdueRows },
  ]);
  return { buffer, mime, filename: `admin_dashboard.${ext}` };
}

module.exports = {
  TASK_HEADERS,
  buildProjectSummary,
  buildProjectExport,
  buildGlobalExport,
  sanitizeFileName,
};
