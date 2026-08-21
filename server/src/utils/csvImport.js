/**
 * Flexible + legacy CSV import helpers.
 *
 * Flexible schema (v1) — extend with new columns anytime; unknown columns
 * can be folded into Custom Fields JSON without breaking imports.
 *
 * Required headers (flexible): Record Type, ID, Name (or Module Name / Task Name)
 * Optional: Parent ID, Description, Status, Priority, Assignee, Start Date,
 * Due Date, Estimated Hours, Actual Hours, Progress %, Tags, Dependencies,
 * Created At, Updated At, Phase, Feature, …
 * Prefer plain-text columns only. Leave missing values blank.
 */

const VALID_STATUSES = [
  'Upcoming',
  'Assigned',
  'In Development',
  'Testing',
  'Completed',
  'Blocked',
  'On Hold',
];

const STATUS_ALIASES = {
  upcoming: 'Upcoming',
  assigned: 'Assigned',
  'in development': 'In Development',
  testing: 'Testing',
  completed: 'Completed',
  blocked: 'Blocked',
  'on hold': 'On Hold',
  new: 'Upcoming',
  todo: 'Upcoming',
  'to do': 'Upcoming',
  'to-do': 'Upcoming',
  backlog: 'Upcoming',
  planned: 'Upcoming',
  open: 'Upcoming',
  pending: 'Upcoming',
  'not started': 'Upcoming',
  active: 'In Development',
  'in progress': 'In Development',
  'in-progress': 'In Development',
  inprogress: 'In Development',
  progress: 'In Development',
  doing: 'In Development',
  working: 'In Development',
  development: 'In Development',
  review: 'Testing',
  'code review': 'Testing',
  'in review': 'Testing',
  qa: 'Testing',
  done: 'Completed',
  finished: 'Completed',
  closed: 'Completed',
  complete: 'Completed',
  hold: 'On Hold',
  paused: 'On Hold',
  stuck: 'Blocked',
};

/** Normalize header for matching: "Record Type" → "recordtype" */
function cleanHeader(h) {
  return String(h || '')
    .toLowerCase()
    .replace(/[%]/g, 'percent')
    .replace(/[^a-z0-9]/g, '');
}

function buildHeaderIndex(row) {
  const index = {};
  Object.keys(row || {}).forEach((key) => {
    index[cleanHeader(key)] = key;
  });
  return index;
}

function sanitizePlainText(value) {
  if (value == null) return '';
  let s = String(value).trim();
  if (!s) return '';
  s = s.replace(/\{[^{}]*\}/g, ' ').replace(/\[[^[\]]*\]/g, ' ');
  s = s
    .replace(/^[,\s;|]+|[,\s;|]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!s || s === 'null' || s === 'undefined') return '';
  if (/^[{[]/.test(s) || /[}\]]$/.test(s)) return '';
  return s;
}

function cell(row, headerIndex, ...aliases) {
  for (const alias of aliases) {
    const key = headerIndex[cleanHeader(alias)];
    if (key != null && row[key] != null && String(row[key]).trim() !== '') {
      const cleaned = sanitizePlainText(row[key]);
      if (cleaned) return cleaned;
    }
  }
  return '';
}

function parseDate(raw, rowNum, label, errors) {
  if (!raw) return null;
  const s = String(raw).trim();
  // Keep CSV YYYY-MM-DD as-is (no UTC shift)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const isoDay = s.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (isoDay) return isoDay[1];
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    const yyyy = dmy[3];
    const check = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (
      check.getFullYear() === Number(yyyy) &&
      check.getMonth() === Number(mm) - 1 &&
      check.getDate() === Number(dd)
    ) {
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  const parsed = new Date(s);
  if (isNaN(parsed.getTime())) {
    errors.push(`Row ${rowNum}: Invalid ${label} '${raw}'.`);
    return null;
  }
  // Local calendar parts — avoids toISOString day-shift in IST / other offsets
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseNumber(raw, rowNum, label, errors) {
  if (!raw) return null;
  const n = parseFloat(raw);
  if (isNaN(n)) {
    errors.push(`Row ${rowNum}: ${label} must be a number.`);
    return null;
  }
  return n;
}

function normalizeStatus(rawStatus, hasAssignee, rowNum, errors) {
  if (!rawStatus) {
    return hasAssignee ? 'Assigned' : 'Upcoming';
  }
  const normalized = rawStatus.toLowerCase().trim().replace(/\s+/g, ' ');
  if (normalized === 'code review') return 'Testing';
  const matched =
    STATUS_ALIASES[normalized] ||
    VALID_STATUSES.find((s) => s.toLowerCase() === normalized);
  if (matched) return matched;
  errors.push(
    `Row ${rowNum}: Invalid Status '${rawStatus}'. Use one of: ${VALID_STATUSES.join(', ')} (or aliases like Todo, In Progress, Done, Active).`
  );
  return 'Upcoming';
}

/**
 * Detect flexible module/task CSV by presence of "Record Type" (not bare "Type")
 * plus an ID column — avoids false positives on legacy sheets.
 */
function isFlexibleCsv(headers) {
  const cleaned = (headers || []).map(cleanHeader);
  const hasRecordType = cleaned.some((h) =>
    ['recordtype', 'rowtype'].includes(h)
  );
  const hasId = cleaned.some((h) => ['id', 'recordid'].includes(h));
  return hasRecordType && hasId;
}

/**
 * Parse flexible CSV rows into internal mapped task objects.
 * Modules and tasks both become Task rows (recordType distinguishes them).
 */
function parseFlexibleRows(rawRows) {
  const validationErrors = [];
  const idsInCsv = new Set();
  const mappedTasks = [];

  if (!rawRows.length) {
    return { mappedTasks, validationErrors: ['CSV file is empty'] };
  }

  const headerIndex = buildHeaderIndex(rawRows[0]);

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2; // +2: header is row 1

    const recordTypeRaw = cell(row, headerIndex, 'Record Type', 'Row Type');
    const normalizedType = recordTypeRaw.toLowerCase().trim();
    let recordType = '';
    if (normalizedType.startsWith('mod')) recordType = 'module';
    else if (normalizedType.startsWith('task')) recordType = 'task';
    else if (normalizedType) recordType = ''; // invalid — reject below

    if (!recordTypeRaw) {
      // Skip blank / trailing rows instead of failing the whole import
      const anyValue = Object.values(row || {}).some((v) => String(v || '').trim() !== '');
      if (!anyValue) continue;
      validationErrors.push(`Row ${rowNum}: Missing Record Type (Module or Task).`);
      continue;
    }
    if (recordType !== 'module' && recordType !== 'task') {
      validationErrors.push(
        `Row ${rowNum}: Record Type must be Module or Task (got '${recordTypeRaw}').`
      );
      continue;
    }

    let id = cell(row, headerIndex, 'ID', 'Record ID', 'Task ID');
    const parentId = cell(row, headerIndex, 'Parent ID', 'Parent', 'Parent Module');
    const name = cell(
      row,
      headerIndex,
      'Name',
      recordType === 'module' ? 'Module Name' : 'Task Name',
      'Title',
      'Summary'
    );
    const description = cell(row, headerIndex, 'Description', 'Desc', 'Details');
    const priority = cell(row, headerIndex, 'Priority', 'Prio');
    const assignee = cell(
      row,
      headerIndex,
      'Assignee',
      'Assigned Developer',
      'Developer',
      'Owner'
    );
    const startDate = parseDate(
      cell(row, headerIndex, 'Start Date', 'Start'),
      rowNum,
      'Start Date',
      validationErrors
    );
    const dueDate = parseDate(
      cell(row, headerIndex, 'Due Date', 'End Date', 'Target Due Date'),
      rowNum,
      'Due Date',
      validationErrors
    );
    const estimatedHours = parseNumber(
      cell(row, headerIndex, 'Estimated Hours', 'Estimate', 'Est Hours'),
      rowNum,
      'Estimated Hours',
      validationErrors
    );
    const actualHours = parseNumber(
      cell(row, headerIndex, 'Actual Hours', 'Spent Hours', 'Spent Time'),
      rowNum,
      'Actual Hours',
      validationErrors
    );
    const progressPercent = parseNumber(
      cell(row, headerIndex, 'Progress %', 'Progress', 'Progress Percent'),
      rowNum,
      'Progress %',
      validationErrors
    );
    const tags = cell(row, headerIndex, 'Tags', 'Labels');
    const dependencies = cell(row, headerIndex, 'Dependencies', 'Depends On', 'Blocked By');
    const phase = cell(row, headerIndex, 'Phase', 'Stage');
    const feature = cell(row, headerIndex, 'Feature');
    const remarks = cell(row, headerIndex, 'Remarks', 'Notes', 'Comment');

    // Created At / Updated At are informational in CSV; DB timestamps still apply
    // Custom Fields / JSON blobs are ignored — keep CSV plain-text only

    if (!name) {
      validationErrors.push(`Row ${rowNum}: Missing Name.`);
    }

    if (!id) {
      id = recordType === 'module' ? `M-${rowNum}` : `T-${rowNum}`;
    }
    if (idsInCsv.has(id)) {
      validationErrors.push(`Row ${rowNum}: Duplicate ID '${id}'.`);
    } else {
      idsInCsv.add(id);
    }

    const status = normalizeStatus(
      cell(row, headerIndex, 'Status', 'Task Status', 'State'),
      Boolean(assignee),
      rowNum,
      validationErrors
    );

    // Hierarchy storage:
    // - module: module = own ID (group key); parentId = parent module if nested
    // - task: module = Parent ID (or blank for standalone); parentId = Parent ID
    const moduleKey =
      recordType === 'module' ? id : parentId || null;

    mappedTasks.push({
      rowNum,
      taskId: id,
      parentId: parentId || null,
      recordType,
      module: moduleKey,
      feature: feature || null,
      taskName: name,
      description: description || null,
      priority: priority || null,
      status,
      startDate,
      dueDate,
      estimatedHours,
      actualHours,
      remarks: remarks || null,
      phase: phase || null,
      estDays: null,
      dependencies: dependencies || null,
      tags: tags || null,
      progressPercent,
      customFields: null,
      devName: assignee || '',
    });
  }

  // Validate parent references exist in file (modules or tasks)
  for (const t of mappedTasks) {
    if (t.parentId && !idsInCsv.has(t.parentId)) {
      validationErrors.push(
        `Row ${t.rowNum}: Parent ID '${t.parentId}' not found in this CSV.`
      );
    }
  }

  return { mappedTasks, validationErrors };
}

/**
 * Detect if raw CSV headers indicate flexible format.
 */
function detectFlexibleFromRows(rawRows) {
  if (!rawRows.length) return false;
  return isFlexibleCsv(Object.keys(rawRows[0]));
}

module.exports = {
  VALID_STATUSES,
  STATUS_ALIASES,
  isFlexibleCsv,
  detectFlexibleFromRows,
  parseFlexibleRows,
  normalizeStatus,
  parseDate,
  parseNumber,
  cleanHeader,
  cell,
  buildHeaderIndex,
};
