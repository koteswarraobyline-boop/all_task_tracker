import { isWorkTask, normalizePriority } from './taskManagementConstants';
import { getDeveloperDisplayName } from './developerDisplay';
import { getTaskProgressPercent } from './taskProgress';

async function loadXlsx() {
  const mod = await import('xlsx');
  return mod.default || mod;
}

async function loadPdfKit() {
  const [{ jsPDF }, autoTable] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF, autoTable: autoTable.default || autoTable };
}

export const TASK_EXPORT_HEADERS = [
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

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildTaskExportRows(tasks) {
  return (tasks || [])
    .filter(isWorkTask)
    .map((t) => [
      t.taskId || t.id,
      t.taskName || '',
      t.status || '',
      normalizePriority(t.priority) || t.priority || '',
      getDeveloperDisplayName(t.developer) || '',
      t.startDate || '',
      t.dueDate || '',
      getTaskProgressPercent(t),
      t.module || '',
      t.phase || '',
    ]);
}

export function buildProjectSummarySheet(summary = {}) {
  const entries = Object.entries(summary).filter(([, v]) => v != null && v !== '');
  return [['Field', 'Value'], ...entries.map(([k, v]) => [k, String(v)])];
}

export function buildProjectExportSummary(project, metrics = {}, extras = {}) {
  return {
    Project: project?.name || '—',
    Client: project?.clientName || '—',
    'Project ID': project?.id ? `PRJ-${String(project.id).padStart(3, '0')}` : '—',
    Status: project?.status || '—',
    'Delivery Status': extras.deliveryStatus || project?.deliveryStatus || '—',
    'Total Tasks': metrics.total ?? 0,
    Completed: metrics.completed ?? 0,
    'In Development': metrics.inDevelopment ?? 0,
    Testing: metrics.testing ?? 0,
    'On Hold': metrics.onHold ?? 0,
    Blocked: metrics.blocked ?? 0,
    'Generated At': new Date().toLocaleString(),
  };
}

export function buildGlobalExportSummary(data, projects = []) {
  return {
    'Total Projects': data?.kpi?.total ?? projects.length,
    'Completed Projects': data?.kpi?.completed ?? 0,
    'In Progress': data?.kpi?.inProgress ?? 0,
    'At Risk': data?.kpi?.atRisk ?? 0,
    Overdue: data?.kpi?.overdue ?? 0,
    'Total Tasks (all projects)': data?.taskStatus?.total ?? 0,
    'Generated At': new Date().toLocaleString(),
  };
}

export function exportTasksCsv(tasks, projectName = 'project') {
  const rows = buildTaskExportRows(tasks);
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [TASK_EXPORT_HEADERS, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${sanitizeFileName(projectName)}_tasks.csv`);
}

export async function exportTasksExcel(tasks, projectName = 'project', summary = null) {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();

  if (summary && Object.keys(summary).length) {
    const summarySheet = XLSX.utils.aoa_to_sheet(buildProjectSummarySheet(summary));
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
  }

  const rows = buildTaskExportRows(tasks);
  const taskSheet = XLSX.utils.aoa_to_sheet([TASK_EXPORT_HEADERS, ...rows]);
  XLSX.utils.book_append_sheet(wb, taskSheet, 'Tasks');

  XLSX.writeFile(wb, `${sanitizeFileName(projectName)}_tasks.xlsx`);
}

export async function exportTasksPdf(tasks, projectName = 'project', summary = null) {
  const { jsPDF, autoTable } = await loadPdfKit();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(String(projectName || 'Project Report'), 40, 36);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 52);

  let startY = 64;

  if (summary && Object.keys(summary).length) {
    autoTable(doc, {
      startY,
      head: [['Metric', 'Value']],
      body: Object.entries(summary).map(([k, v]) => [k, String(v ?? '')]),
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      margin: { left: 40, right: 40 },
      tableWidth: 320,
    });
    startY = doc.lastAutoTable.finalY + 16;
  }

  autoTable(doc, {
    startY,
    head: [TASK_EXPORT_HEADERS],
    body: buildTaskExportRows(tasks),
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`${sanitizeFileName(projectName)}_tasks.pdf`);
}

const PROJECT_LIST_HEADERS = [
  'Project',
  'Client',
  'Status',
  'Delivery',
  'Tasks',
  'Completed %',
  'Target Date',
];

function buildProjectListRows(projects = []) {
  return projects.map((p) => [
    p.name || '',
    p.clientName || '',
    p.status || '',
    p.deliveryStatus || 'ON_TRACK',
    p.totalTasks ?? p.taskCount ?? '',
    p.completionPercent != null ? `${p.completionPercent}%` : '',
    p.activeDeliveryDate || p.dueDate || '',
  ]);
}

const OVERDUE_HEADERS = ['Project', 'Task', 'Module', 'Days Late', 'Status'];

function buildOverdueRows(items = []) {
  return items.map((t) => [
    t.projectName || '',
    t.title || '',
    t.module || '',
    t.daysLate ?? '',
    t.status || '',
  ]);
}

export function exportGlobalDashboardCsv(data, projects = []) {
  const summary = buildGlobalExportSummary(data, projects);
  const lines = [
    'Task Tracker — Admin Dashboard Export',
    ...Object.entries(summary).map(([k, v]) => `${k},${JSON.stringify(String(v))}`),
    '',
    PROJECT_LIST_HEADERS.join(','),
    ...buildProjectListRows(projects).map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
    '',
    OVERDUE_HEADERS.join(','),
    ...buildOverdueRows(data?.overdueTasks || []).map((r) =>
      r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, 'admin_dashboard.csv');
}

export async function exportGlobalDashboardExcel(data, projects = []) {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  const summary = buildGlobalExportSummary(data, projects);

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(buildProjectSummarySheet(summary)),
    'Summary'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([PROJECT_LIST_HEADERS, ...buildProjectListRows(projects)]),
    'Projects'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([OVERDUE_HEADERS, ...buildOverdueRows(data?.overdueTasks || [])]),
    'Overdue Tasks'
  );

  if (data?.upcomingDeadlines?.length) {
    const upcomingHeaders = ['Project', 'Task', 'Module', 'Due Date', 'Days Until'];
    const upcomingRows = data.upcomingDeadlines.map((t) => [
      t.projectName || '',
      t.title || '',
      t.module || '',
      t.dueDate || '',
      t.daysUntil ?? '',
    ]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([upcomingHeaders, ...upcomingRows]),
      'Upcoming'
    );
  }

  XLSX.writeFile(wb, 'admin_dashboard.xlsx');
}

export async function exportGlobalDashboardPdf(data, projects = []) {
  const { jsPDF, autoTable } = await loadPdfKit();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const summary = buildGlobalExportSummary(data, projects);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Admin Dashboard Report', 40, 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 56);

  autoTable(doc, {
    startY: 68,
    head: [['Metric', 'Value']],
    body: Object.entries(summary).map(([k, v]) => [k, String(v)]),
    theme: 'plain',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    margin: { left: 40, right: 40 },
    tableWidth: 280,
  });

  let y = doc.lastAutoTable.finalY + 20;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Projects', 40, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [PROJECT_LIST_HEADERS],
    body: buildProjectListRows(projects),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    margin: { left: 40, right: 40 },
  });

  if (data?.overdueTasks?.length) {
    y = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(12);
    doc.text('Overdue Tasks', 40, y);
    autoTable(doc, {
      startY: y + 8,
      head: [OVERDUE_HEADERS],
      body: buildOverdueRows(data.overdueTasks),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38], textColor: 255 },
      margin: { left: 40, right: 40 },
    });
  }

  doc.save('admin_dashboard.pdf');
}

export function downloadExportBlob(blob, filename) {
  triggerDownload(blob, filename);
}

export function parseFilenameFromDisposition(header, fallback) {
  if (!header) return fallback;
  const match = /filename="?([^";\n]+)"?/i.exec(header);
  return match?.[1] || fallback;
}
