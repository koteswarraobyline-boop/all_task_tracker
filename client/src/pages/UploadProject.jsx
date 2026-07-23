import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Alert,
  AlertTitle,
  CircularProgress,
  Snackbar,
  Stack,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  DeleteOutlined as DeleteIcon,
} from '@mui/icons-material';
import api from '../services/api';
import PageContainer, { PageHeader } from '../components/PageContainer';

const DB_FIELDS = [
  { key: 'taskName', label: 'Task Name', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'taskId', label: 'Task ID', required: false },
  { key: 'assignedDeveloper', label: 'Assigned Developer', required: false },
  { key: 'module', label: 'Module', required: false },
  { key: 'feature', label: 'Feature', required: false },
  { key: 'priority', label: 'Priority', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'startDate', label: 'Start Date', required: false },
  { key: 'dueDate', label: 'Due Date', required: false },
  { key: 'estimatedHours', label: 'Estimated Hours', required: false },
  { key: 'actualHours', label: 'Actual Hours', required: false },
  { key: 'remarks', label: 'Remarks', required: false },
  { key: 'phase', label: 'Phase', required: false },
  { key: 'estDays', label: 'Est. Days', required: false },
  { key: 'dependencies', label: 'Dependencies', required: false },
];

const FIELD_SYNONYMS = {
  taskName: ['taskname', 'task name', 'name', 'modulename', 'summary', 'title', 'subject'],
  description: ['description', 'desc', 'details', 'detail', 'overview', 'about', 'taskdescription'],
  taskId: ['taskid', 'task id', 'id', 'recordid', 'task key', 'ticket', 'number', 'code'],
  assignedDeveloper: ['developerowner', 'assigneddeveloper', 'assignee', 'owner', 'developer', 'resource'],
  estimatedHours: ['estimatedhours', 'estimated', 'estimate', 'esthours', 'effort'],
  actualHours: ['actualhours', 'spenttime', 'timespent', 'spent', 'logged', 'actual'],
  startDate: ['startdate', 'start date', 'start', 'begin'],
  dueDate: ['duedate', 'due date', 'targetduedate', 'deadline', 'enddate', 'end', 'due'],
  remarks: ['remarks', 'notes', 'note', 'comment', 'comments'],
  phase: ['phase', 'stage', 'release'],
  estDays: ['estdays', 'estimateddays', 'duration'],
  dependencies: ['dependencies', 'depends', 'links'],
  module: ['module', 'componentmodule', 'component', 'parentid', 'parent'],
  feature: ['feature'],
  priority: ['priority', 'prio'],
  status: ['taskstatus', 'status', 'state'],
};

function isFlexibleCsvHeaders(headers) {
  const cleaned = headers.map((h) =>
    String(h || '')
      .replace(/^\uFEFF/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
  );
  const hasType = cleaned.some((h) => ['recordtype', 'rowtype'].includes(h));
  const hasId = cleaned.some((h) => ['id', 'recordid'].includes(h));
  return hasType && hasId;
}

const slideVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.25 } }
};

/** Light table look — overrides global dark table headers for this wizard */
const liteTableSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  boxShadow: 'none !important',
  bgcolor: '#FFFFFF',
  overflow: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: '#CBD5E1 transparent',
  '&::-webkit-scrollbar': { width: 10, height: 10 },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#CBD5E1',
    borderRadius: 8,
    border: '2px solid transparent',
    backgroundClip: 'content-box',
  },
  '& .MuiTableCell-head': {
    bgcolor: '#F8FAFC !important',
    color: '#64748B !important',
    fontWeight: 700,
    fontSize: '0.6875rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    borderBottom: '1px solid #E2E8F0 !important',
    whiteSpace: 'nowrap',
    py: 1.25,
    px: 1.5,
  },
  '& .MuiTableCell-body': {
    py: 1,
    px: 1.5,
    verticalAlign: 'middle',
    borderColor: '#F1F5F9',
  },
  '& .MuiTableRow-root:hover': {
    bgcolor: 'rgba(79,70,229,0.03)',
  },
};

const liteCardSx = {
  borderRadius: 2.5,
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: 'none',
  bgcolor: '#FFFFFF',
};

function columnMinWidth(header) {
  const h = String(header || '').toLowerCase();
  if (h.includes('description')) return 220;
  if (h.includes('name') || h.includes('assignee')) return 160;
  if (h.includes('record type') || h.includes('status') || h.includes('priority')) return 130;
  if (h === 'id' || h.includes('parent')) return 100;
  return 140;
}

/** Columns never shown in upload preview / confirm edit grid */
const HIDDEN_CSV_HEADERS = new Set([
  'customfields',
  'custom fields',
  'custom',
  'extra',
  'metadata',
  'createdat',
  'created at',
  'updatedat',
  'updated at',
]);

function isHiddenCsvHeader(header) {
  const clean = String(header || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return (
    HIDDEN_CSV_HEADERS.has(String(header || '').toLowerCase().trim()) ||
    ['customfields', 'createdat', 'updatedat', 'metadata'].includes(clean)
  );
}

/**
 * Missing → blank. Strip object/array blobs so they never appear in the UI.
 * e.g. {"module":"assessment"},Phase 1 → Phase 1
 *      {} → (blank)
 */
function sanitizeCsvValue(value) {
  if (value == null) return '';
  let s = String(value).trim();
  if (!s) return '';

  // Remove {...} and [...] segments (including empty {})
  s = s.replace(/\{[^{}]*\}/g, ' ').replace(/\[[^[\]]*\]/g, ' ');
  // Collapse leftover commas/spaces from stripped segments
  s = s
    .replace(/^[,\s;|]+|[,\s;|]+$/g, '')
    .replace(/[,\s;|]+/g, (m) => (m.includes(',') ? ', ' : ' '))
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!s) return '';
  if (s === 'null' || s === 'undefined' || s === 'NaN') return '';
  // Anything still looking like structured code
  if (/^[{[]/.test(s) || /[}\]]$/.test(s)) return '';
  return s;
}

function displayCsvCell(value) {
  return sanitizeCsvValue(value);
}

function sanitizeCsvRow(row) {
  const next = {};
  Object.keys(row || {}).forEach((key) => {
    if (isHiddenCsvHeader(key)) {
      next[key] = '';
      return;
    }
    next[key] = sanitizeCsvValue(row[key]);
  });
  return next;
}

export default function UploadProject() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams] = useSearchParams();
  const appendProjectId = searchParams.get('projectId');
  const [activeStep, setActiveStep] = useState(0);
  const [csvFormat, setCsvFormat] = useState('legacy'); // 'legacy' | 'flexible'

  // Form Fields
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [appendProjectName, setAppendProjectName] = useState('');

  useEffect(() => {
    if (!appendProjectId) return;
    api.getProjects()
      .then((list) => {
        const found = list.find((p) => String(p.id) === String(appendProjectId));
        if (found) {
          setAppendProjectName(found.name);
          setProjectName(found.name);
          setClientName(found.clientName || '');
        }
      })
      .catch(() => {});
  }, [appendProjectId]);

  // CSV Parsing
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState([]); // First 20 rows
  const [editableRows, setEditableRows] = useState([]); // Full sheet for step-3 fixes
  const [rowsDirty, setRowsDirty] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Mapping State (dbFieldKey -> csvHeader)
  const [mapping, setMapping] = useState({});
  
  // Validation States
  const [validationReport, setValidationReport] = useState({
    errors: [],
    warnings: [],
    isValid: true,
  });

  // Action states
  const [importing, setImporting] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [serverErrors, setServerErrors] = useState([]);

  const EDITABLE_COLUMNS = useMemo(() => {
    if (!csvHeaders.length) return [];
    const preferred = [
      'Record Type', 'ID', 'Parent ID', 'Name', 'Description', 'Status',
      'Priority', 'Assignee', 'Tags', 'Dependencies', 'Phase',
    ];
    const preferredFound = preferred.filter((p) =>
      csvHeaders.some((h) => h.toLowerCase() === p.toLowerCase() && !isHiddenCsvHeader(h))
    );
    if (preferredFound.length) return preferredFound;
    return csvHeaders.filter((h) => !isHiddenCsvHeader(h)).slice(0, 10);
  }, [csvHeaders]);

  const previewHeaders = useMemo(
    () => csvHeaders.filter((h) => !isHiddenCsvHeader(h)).slice(0, 12),
    [csvHeaders]
  );

  const rowsWithErrors = useMemo(() => {
    const set = new Set();
    serverErrors.forEach((err) => {
      const m = String(err).match(/Row\s+(\d+)/i);
      if (m) {
        // Server row numbers: header=1, first data=2 → editable index = n - 2
        const idx = parseInt(m[1], 10) - 2;
        if (idx >= 0) set.add(idx);
      }
    });
    return set;
  }, [serverErrors]);

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file) => {
    if (!file.name.endsWith('.csv')) {
      showAlert('Only CSV files are supported', 'error');
      return;
    }

    setSelectedFile(file);
    
    // Auto fill project name from filename
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    setProjectName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));

    // Parse full CSV for editable confirm step + preview
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        if (results.data.length === 0) {
          showAlert('CSV file appears to be empty', 'error');
          return;
        }

        const headers = Object.keys(results.data[0] || {}).map((h) =>
          String(h || '').replace(/^\uFEFF/, '')
        );
        // Rebuild rows with cleaned header keys if BOM was present
        const rawRows = results.data;
        const originalKeys = Object.keys(rawRows[0] || {});
        const needsKeyRewrite = originalKeys.some((k, i) => k !== headers[i]);
        const normalizedRows = needsKeyRewrite
          ? rawRows.map((row) => {
              const next = {};
              originalKeys.forEach((k, i) => {
                next[headers[i] || k] = row[k];
              });
              return next;
            })
          : rawRows;

        const cleaned = normalizedRows.filter((row) =>
          Object.values(row || {}).some((v) => String(v || '').trim() !== '')
        );

        if (cleaned.length === 0) {
          showAlert('CSV file appears to be empty', 'error');
          return;
        }

        const sanitized = cleaned.map((r) => sanitizeCsvRow(r));
        // Drop hidden columns from in-memory rows used by the UI
        const uiRows = sanitized.map((row) => {
          const next = {};
          headers.forEach((h) => {
            if (isHiddenCsvHeader(h)) return;
            next[h] = row[h] ?? '';
          });
          return next;
        });
        const uiHeaders = headers.filter((h) => !isHiddenCsvHeader(h));
        setCsvHeaders(uiHeaders.length ? uiHeaders : headers);
        setEditableRows(uiRows.map((r) => ({ ...r })));
        setCsvPreviewRows(uiRows.slice(0, 20));
        setEditMode(false);
        setRowsDirty(false);
        setServerErrors([]);

        const flexible = isFlexibleCsvHeaders(headers);
        setCsvFormat(flexible ? 'flexible' : 'legacy');

        if (flexible) {
          const nameHeader =
            uiHeaders.find((h) => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '') === 'name') ||
            uiHeaders.find((h) => /task\s*name/i.test(String(h || ''))) ||
            '';
          setMapping(nameHeader ? { taskName: nameHeader } : {});
          setValidationReport({ errors: [], warnings: [], isValid: true });
          showAlert('Flexible Module/Task CSV detected — columns map automatically', 'success');
          return;
        }

        // Auto map columns (each CSV header used at most once)
        const initialMapping = {};
        const usedHeaders = new Set();
        DB_FIELDS.forEach((field) => {
          const match = findBestHeaderMatch(field.key, field.label, uiHeaders, usedHeaders);
          initialMapping[field.key] = match || '';
          if (match) usedHeaders.add(match);
        });
        setMapping(initialMapping);
      },
      error: (err) => {
        console.error('CSV Parsing Error:', err);
        showAlert('Failed to parse CSV file', 'error');
      },
    });
  };

  const findBestHeaderMatch = (fieldKey, label, headers, usedHeaders = new Set()) => {
    const available = headers.filter((h) => !usedHeaders.has(h));
    const cleanLabel = label.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1) Exact cleaned match (e.g. Description → Description)
    for (const header of available) {
      if (normalize(header) === cleanLabel || normalize(header) === normalize(fieldKey)) {
        return header;
      }
    }

    // 2) Synonym match — exact cleaned synonym first, then header starts with / equals synonym
    const synonyms = [...(FIELD_SYNONYMS[fieldKey] || [])].sort((a, b) => b.length - a.length);
    for (const syn of synonyms) {
      const cleanSyn = normalize(syn);
      if (!cleanSyn) continue;
      for (const header of available) {
        const cleanHeader = normalize(header);
        if (cleanHeader === cleanSyn) return header;
      }
    }
    for (const syn of synonyms) {
      const cleanSyn = normalize(syn);
      if (cleanSyn.length < 4) continue;
      for (const header of available) {
        const cleanHeader = normalize(header);
        if (cleanHeader.startsWith(cleanSyn) || cleanHeader.endsWith(cleanSyn)) {
          return header;
        }
      }
    }

    // 3) Loose contains match on label (avoid very short labels like "id")
    if (cleanLabel.length >= 4) {
      for (const header of available) {
        const cleanHeader = normalize(header);
        if (cleanHeader.includes(cleanLabel) || cleanLabel.includes(cleanHeader)) {
          return header;
        }
      }
    }

    return null;
  };

  const handleMappingChange = (fieldKey, value) => {
    setMapping((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  // Run preview validation whenever mapping changes (legacy only)
  useEffect(() => {
    if (csvFormat === 'flexible') {
      setValidationReport({ errors: [], warnings: [], isValid: true });
      return;
    }
    if (csvPreviewRows.length === 0) return;
    runPreviewValidation();
  }, [mapping, csvPreviewRows, csvFormat]);

  const runPreviewValidation = () => {
    const errors = [];
    const warnings = [];
    const taskIds = new Set();

    const mappedTaskNameCol = mapping.taskName;
    const mappedTaskIdCol = mapping.taskId;
    const mappedStartDateCol = mapping.startDate;
    const mappedDueDateCol = mapping.dueDate;
    const mappedEstCol = mapping.estimatedHours;
    const mappedActCol = mapping.actualHours;

    if (!mappedTaskNameCol) {
      errors.push('Task Name column mapping is required.');
      setValidationReport({ errors, warnings, isValid: false });
      return;
    }

    csvPreviewRows.forEach((row, index) => {
      const rowNum = index + 1;
      
      const nameVal = row[mappedTaskNameCol]?.trim();
      if (!nameVal) {
        errors.push(`Row ${rowNum}: Task Name is empty.`);
      }

      if (mappedTaskIdCol) {
        const idVal = row[mappedTaskIdCol]?.trim();
        if (!idVal) {
          errors.push(`Row ${rowNum}: Task ID is empty.`);
        } else if (taskIds.has(idVal)) {
          errors.push(`Row ${rowNum}: Duplicate Task ID '${idVal}' in preview.`);
        } else {
          taskIds.add(idVal);
        }
      }

      if (mappedStartDateCol) {
        const startVal = row[mappedStartDateCol]?.trim();
        if (startVal && isNaN(Date.parse(startVal))) {
          errors.push(`Row ${rowNum}: Start Date '${startVal}' is invalid.`);
        }
      }
      if (mappedDueDateCol) {
        const dueVal = row[mappedDueDateCol]?.trim();
        if (dueVal && isNaN(Date.parse(dueVal))) {
          errors.push(`Row ${rowNum}: Due Date '${dueVal}' is invalid.`);
        }
      }

      if (mappedEstCol) {
        const estVal = row[mappedEstCol]?.trim();
        if (estVal && isNaN(parseFloat(estVal))) {
          errors.push(`Row ${rowNum}: Estimated Hours must be a number.`);
        }
      }
      if (mappedActCol) {
        const actVal = row[mappedActCol]?.trim();
        if (actVal && isNaN(parseFloat(actVal))) {
          errors.push(`Row ${rowNum}: Actual Hours must be a number.`);
        }
      }
    });

    setValidationReport({
      errors,
      warnings,
      isValid: errors.length === 0,
    });
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!appendProjectId && !projectName.trim()) {
        showAlert('Project Name is required', 'warning');
        return;
      }
      if (!selectedFile) {
        showAlert('Please upload a CSV file', 'warning');
        return;
      }
    }
    
    if (activeStep === 1) {
      if (csvFormat !== 'flexible' && !mapping.taskName) {
        showAlert('You must map the Task Name column', 'error');
        return;
      }
    }

    setActiveStep((prev) => prev + 1);
    setAlert({ open: false, message: '', severity: 'success' });
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setServerErrors([]);
    setEditMode(false);
  };

  const updateEditableCell = (rowIndex, header, value) => {
    setRowsDirty(true);
    const cleaned = sanitizeCsvValue(value);
    setEditableRows((prev) =>
      prev.map((row, i) => (i === rowIndex ? { ...row, [header]: cleaned } : row))
    );
  };

  const removeEditableRow = (rowIndex) => {
    setRowsDirty(true);
    setEditableRows((prev) => prev.filter((_, i) => i !== rowIndex));
    setServerErrors([]);
  };

  const buildCsvFileFromRows = () => {
    const csvText = Papa.unparse({
      fields: csvHeaders,
      data: editableRows.map((row) => csvHeaders.map((h) => row[h] ?? '')),
    });
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const baseName = (selectedFile?.name || 'import.csv').replace(/\.csv$/i, '');
    return new File([blob], `${baseName}-fixed.csv`, { type: 'text/csv' });
  };

  const handleImport = async (opts = {}) => {
    const forceOriginal = opts.forceOriginal === true;
    setImporting(true);
    setServerErrors([]);
    setAlert({ open: false, message: '', severity: 'success' });

    if (forceOriginal) {
      setEditMode(false);
      setRowsDirty(false);
    }

    const useEdited = !forceOriginal && (rowsDirty || editMode) && editableRows.length > 0;
    const fileToUpload = useEdited ? buildCsvFileFromRows() : selectedFile;

    if (!fileToUpload) {
      setImporting(false);
      showAlert('CSV file is missing. Go back and re-upload the file.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('name', projectName);
    formData.append('clientName', clientName || '');
    formData.append('mapping', JSON.stringify(mapping || {}));
    if (appendProjectId) {
      formData.append('projectId', appendProjectId);
    }

    try {
      const response = await api.uploadProject(formData);
      showAlert(response.message || 'Imported successfully!');
      setEditMode(false);
      setRowsDirty(false);

      setTimeout(() => {
        navigate(`/projects/${response.projectId}/tasks`);
      }, 800);
    } catch (error) {
      console.error('Import failed:', error);
      const msg = error.response?.data?.error || 'Import failed';
      const details = error.response?.data?.details || [];
      showAlert(msg, 'error');
      if (details.length > 0) {
        setServerErrors(details);
        setEditMode(true);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <PageContainer
      maxWidth="100%"
      sx={{
        px: { xs: 1.5, sm: 2, md: 2.5, lg: 3 },
        py: { xs: 2, md: 2.5 },
        maxWidth: '100%',
      }}
    >
      <PageHeader
        title={appendProjectId ? 'Import CSV into project' : 'Upload Project CSV'}
        subtitle={
          appendProjectId
            ? `Add more tasks to${appendProjectName ? ` “${appendProjectName}”` : ' this project'} from a CSV file.`
            : 'Create a project by uploading a task backlog CSV. Select header mappings and run checks before importing.'
        }
        sx={{ mb: 3 }}
      />

      <Box
        sx={{
          ...liteCardSx,
          px: { xs: 2, md: 3 },
          pt: { xs: 2, md: 2.5 },
          pb: { xs: 2, md: 2.5 },
          mb: 2.5,
        }}
      >
        <Stepper
          activeStep={activeStep}
          alternativeLabel={isXs}
          sx={{
            mb: 0,
            '& .MuiStepLabel-label': {
              fontWeight: 600,
              fontSize: '0.8125rem',
              color: 'text.secondary',
              '&.Mui-active, &.Mui-completed': { color: 'text.primary', fontWeight: 700 },
            },
            '& .MuiStepIcon-root': {
              color: '#E2E8F0',
              '&.Mui-active, &.Mui-completed': { color: 'primary.main' },
            },
            ...(isXs && {
              overflowX: 'auto',
              pb: 1,
              '& .MuiStepConnector-root': { flex: '0 0 auto' },
              '& .MuiStep-root': { minWidth: 88 },
            }),
          }}
        >
          <Step><StepLabel>Upload CSV File</StepLabel></Step>
          <Step><StepLabel>Map Columns & Preview</StepLabel></Step>
          <Step><StepLabel>Validate & Confirm</StepLabel></Step>
        </Stepper>
      </Box>

      <AnimatePresence mode="wait">
        {activeStep === 0 && (
          <motion.div key="step0" variants={slideVariants} initial="initial" animate="animate" exit="exit">
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ ...liteCardSx, height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 700, fontSize: '1.05rem' }}>
                      {appendProjectId ? 'Target Project' : 'Project Details'}
                    </Typography>
                    {appendProjectId ? (
                      <Alert severity="info" sx={{ mb: 1, borderRadius: 2 }}>
                        Tasks will be added to <strong>{appendProjectName || `Project #${appendProjectId}`}</strong>. Existing tasks are kept.
                      </Alert>
                    ) : (
                      <>
                        <TextField
                          label="Project Name"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          fullWidth
                          required
                          margin="normal"
                          placeholder="e.g. E-Commerce Refactor"
                        />
                        <TextField
                          label="Client / Team Name (Optional)"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          fullWidth
                          margin="normal"
                          placeholder="e.g. Internal Platform"
                        />
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 8 }}>
                <Paper
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  sx={{
                    p: { xs: 3, md: 5 },
                    height: '100%',
                    minHeight: 280,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderStyle: 'dashed',
                    borderWidth: 1.5,
                    borderColor: isDragOver ? 'primary.main' : 'divider',
                    borderRadius: 2.5,
                    bgcolor: isDragOver ? 'rgba(79,70,229,0.04)' : '#FFFFFF',
                    boxShadow: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    accept=".csv"
                    style={{ display: 'none' }}
                    id="csv-file-upload-wizard"
                    type="file"
                    onChange={handleFileChange}
                  />
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: '#EEF2FF',
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <UploadIcon />
                  </Box>
                  <label htmlFor="csv-file-upload-wizard">
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={<UploadIcon />}
                      sx={{ mb: 1.5, py: 1.1, px: 2.75, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                    >
                      Choose CSV File
                    </Button>
                  </label>

                  {selectedFile ? (
                    <Box sx={{ textAlign: 'center', mt: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {selectedFile.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Size: {(selectedFile.size / 1024).toFixed(2)} KB
                      </Typography>
                    </Box>
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary', textAlign: 'center', mt: 0.5, lineHeight: 1.6, maxWidth: 420 }}
                    >
                      Drag and drop your spreadsheet here, or click to browse.
                      <br />
                      Supports flexible Module / Task CSV format.
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </motion.div>
        )}

        {activeStep === 1 && (
          <motion.div key="step1" variants={slideVariants} initial="initial" animate="animate" exit="exit">
            {csvFormat === 'flexible' ? (
              <Card sx={liteCardSx}>
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }}>
                    <AlertTitle sx={{ fontWeight: 700 }}>Flexible Module / Task CSV</AlertTitle>
                    Detected <strong>Record Type</strong> + <strong>ID</strong> columns. Modules, nested
                    submodules, tasks, and standalone tasks import automatically — no column mapping needed.
                  </Alert>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    Preview (first {csvPreviewRows.length} rows). Template:{' '}
                    <code>sample_flexible_modules_tasks.csv</code>
                  </Typography>
                  <TableContainer sx={{ ...liteTableSx, maxHeight: { xs: 420, md: 'min(62vh, 640px)' } }}>
                    <Table stickyHeader size="small" sx={{ minWidth: Math.max(960, previewHeaders.length * 140) }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 48 }}>#</TableCell>
                          {previewHeaders.map((header) => (
                            <TableCell key={header} sx={{ minWidth: columnMinWidth(header) }}>
                              {header}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {csvPreviewRows.map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{idx + 1}</TableCell>
                            {previewHeaders.map((header) => {
                              const text = displayCsvCell(row[header]);
                              return (
                              <TableCell key={header} title={text || ''}>
                                <Typography variant="body2" noWrap sx={{ maxWidth: columnMinWidth(header) + 40, fontSize: '0.8125rem' }}>
                                  {text}
                                </Typography>
                              </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            ) : (
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card sx={{ ...liteCardSx, maxHeight: 640, overflowY: 'auto' }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, fontSize: '1.05rem' }}>
                        Column Mapping
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
                        Map CSV headers to task fields. Prefer the flexible Module/Task format when possible.
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      {DB_FIELDS.map((field) => (
                        <TextField
                          key={field.key}
                          select
                          label={`${field.label} ${field.required ? '*' : '(Optional)'}`}
                          value={mapping[field.key] || ''}
                          onChange={(e) => handleMappingChange(field.key, e.target.value)}
                          fullWidth
                          margin="dense"
                          size="small"
                          sx={{ mb: 2 }}
                        >
                          <MenuItem value="">
                            <em>-- Unmapped --</em>
                          </MenuItem>
                          {csvHeaders.map((header) => (
                            <MenuItem key={header} value={header}>
                              {header}
                            </MenuItem>
                          ))}
                        </TextField>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                  <Card sx={{ ...liteCardSx, height: '100%' }}>
                    <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                      <Typography variant="h6" sx={{ mb: 0.75, fontWeight: 700, fontSize: '1.05rem' }}>
                        Mapped Rows Preview
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                        First 20 rows — verify values look correct before continuing.
                      </Typography>

                      {!mapping.taskName ? (
                        <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                          Please map the <strong>Task Name</strong> column to render the table preview.
                        </Alert>
                      ) : (
                        <TableContainer sx={{ ...liteTableSx, maxHeight: { xs: 420, md: 'min(62vh, 640px)' } }}>
                          <Table stickyHeader size="small" sx={{ minWidth: 880 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ width: 48 }}>#</TableCell>
                                {DB_FIELDS.filter((f) => mapping[f.key]).map((field) => (
                                  <TableCell key={field.key} sx={{ minWidth: columnMinWidth(field.label) }}>
                                    {field.label}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {csvPreviewRows.map((row, idx) => (
                                <TableRow key={idx}>
                                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{idx + 1}</TableCell>
                                  {DB_FIELDS.filter((f) => mapping[f.key]).map((field) => {
                                    const text = displayCsvCell(row[mapping[field.key]]);
                                    return (
                                    <TableCell key={field.key} title={text || ''}>
                                      <Typography variant="body2" noWrap sx={{ maxWidth: 220, fontSize: '0.8125rem' }}>
                                        {text}
                                      </Typography>
                                    </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </motion.div>
        )}

        {activeStep === 2 && (
          <motion.div key="step2" variants={slideVariants} initial="initial" animate="animate" exit="exit">
            <Card sx={liteCardSx}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography sx={{ fontWeight: 750, fontSize: '1.15rem', mb: 0.5 }}>
                  Confirm & Review
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
                  Choose how you want to proceed — edit rows first, or import the CSV as-is.
                </Typography>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: 1.5,
                    mb: 3,
                  }}
                >
                  <Box
                    onClick={() => {
                      setEditMode(true);
                      setAlert({ open: false, message: '', severity: 'success' });
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setEditMode(true);
                    }}
                    sx={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      p: 2.25,
                      borderRadius: 2,
                      border: '1.5px solid',
                      borderColor: editMode ? 'primary.main' : 'divider',
                      bgcolor: editMode ? 'rgba(79,70,229,0.06)' : '#FFFFFF',
                      transition: 'border-color 0.15s ease, background 0.15s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'rgba(79,70,229,0.04)',
                      },
                    }}
                  >
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, mb: 0.75 }}>
                      <EditIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                      <Typography sx={{ fontWeight: 750, fontSize: '0.95rem' }}>Manual edit</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                      Open the sheet below, fix any values, then import your edits.
                    </Typography>
                  </Box>

                  <Box
                    onClick={() => {
                      if (!importing && validationReport.isValid && selectedFile) {
                        handleImport({ forceOriginal: true });
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !importing && validationReport.isValid && selectedFile) {
                        handleImport({ forceOriginal: true });
                      }
                    }}
                    sx={{
                      textAlign: 'left',
                      cursor: importing || !validationReport.isValid || !selectedFile ? 'not-allowed' : 'pointer',
                      opacity: importing || !validationReport.isValid || !selectedFile ? 0.55 : 1,
                      p: 2.25,
                      borderRadius: 2,
                      border: '1.5px solid',
                      borderColor: 'success.main',
                      bgcolor: 'rgba(34,197,94,0.06)',
                      transition: 'background 0.15s ease',
                      '&:hover': {
                        bgcolor: importing ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.12)',
                      },
                    }}
                  >
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, mb: 0.75 }}>
                      <SuccessIcon sx={{ color: 'success.main', fontSize: 22 }} />
                      <Typography sx={{ fontWeight: 750, fontSize: '0.95rem' }}>
                        Continue without changes
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                      Skip editing and import the uploaded CSV exactly as it is.
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                    gap: 1.5,
                    mb: 3,
                  }}
                >
                  {[
                    ['Project Name', projectName],
                    ['Client / Team', clientName || 'Internal'],
                    ['CSV File', selectedFile?.name || '—'],
                  ].map(([label, value]) => (
                    <Box
                      key={label}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: '#F8FAFC',
                        border: '1px solid',
                        borderColor: 'divider',
                        minWidth: 0,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 650, letterSpacing: '0.03em' }}>
                        {label}
                      </Typography>
                      <Typography sx={{ fontWeight: 700, mt: 0.35, fontSize: '0.9375rem' }} noWrap title={value}>
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {validationReport.isValid ? (
                  <Alert severity="success" icon={<SuccessIcon />} sx={{ mb: 2.5, borderRadius: 2 }}>
                    <AlertTitle sx={{ fontWeight: 700 }}>Checks Passed</AlertTitle>
                    All preview rows contain correct formats and fields. Ready to insert tasks.
                  </Alert>
                ) : (
                  <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2.5, borderRadius: 2 }}>
                    <AlertTitle sx={{ fontWeight: 700 }}>
                      Validation warnings found ({validationReport.errors.length})
                    </AlertTitle>
                    <Box sx={{ maxHeight: 160, overflowY: 'auto', mt: 1 }}>
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {validationReport.errors.map((err, idx) => (
                          <li key={idx} style={{ marginBottom: 4, fontSize: '0.875rem' }}>{err}</li>
                        ))}
                      </ul>
                    </Box>
                  </Alert>
                )}

                {serverErrors.length > 0 && (
                  <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                    <AlertTitle sx={{ fontWeight: 700 }}>Server-Side Parse Failures</AlertTitle>
                    <Box sx={{ maxHeight: 140, overflowY: 'auto', mt: 1 }}>
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {serverErrors.map((err, idx) => (
                          <li key={idx} style={{ marginBottom: 4, fontSize: '0.875rem' }}>{err}</li>
                        ))}
                      </ul>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1.5 }}>
                      Fix the highlighted rows below, then click <strong>Confirm & Import</strong> again.
                    </Typography>
                  </Alert>
                )}

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 1.5, gap: 1 }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                    {editMode ? 'Editing sheet' : 'Sheet preview'}
                    <Typography component="span" sx={{ ml: 1, color: 'text.secondary', fontWeight: 500, fontSize: '0.8125rem' }}>
                      {editableRows.length} row{editableRows.length === 1 ? '' : 's'}
                    </Typography>
                  </Typography>
                  {editMode && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setEditMode(false)}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 650 }}
                    >
                      Cancel editing
                    </Button>
                  )}
                </Stack>

                <TableContainer sx={{ ...liteTableSx, maxHeight: { xs: 420, md: 'min(58vh, 560px)' } }}>
                  <Table stickyHeader size="small" sx={{ minWidth: Math.max(1100, EDITABLE_COLUMNS.length * 150) }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 52 }}>#</TableCell>
                        {EDITABLE_COLUMNS.map((header) => (
                          <TableCell key={header} sx={{ minWidth: columnMinWidth(header) }}>
                            {header}
                          </TableCell>
                        ))}
                        {editMode && (
                          <TableCell sx={{ width: 56, textAlign: 'center' }}>Del</TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {editableRows.map((row, idx) => {
                        const hasError = rowsWithErrors.has(idx);
                        return (
                          <TableRow
                            key={idx}
                            sx={{ bgcolor: hasError ? 'rgba(239,68,68,0.06)' : undefined }}
                          >
                            <TableCell
                              sx={{
                                fontWeight: hasError ? 800 : 600,
                                color: hasError ? 'error.main' : 'text.secondary',
                                width: 52,
                              }}
                            >
                              {idx + 1}
                            </TableCell>
                            {EDITABLE_COLUMNS.map((header) => (
                              <TableCell key={header} sx={{ minWidth: columnMinWidth(header) }}>
                                {editMode ? (
                                  header.toLowerCase().includes('record type') ? (
                                    <TextField
                                      select
                                      size="small"
                                      value={sanitizeCsvValue(row[header]) || ''}
                                      onChange={(e) => updateEditableCell(idx, header, e.target.value)}
                                      fullWidth
                                      sx={{
                                        minWidth: 120,
                                        '& .MuiOutlinedInput-root': {
                                          bgcolor: '#fff',
                                          '& fieldset': { borderColor: '#E2E8F0' },
                                        },
                                      }}
                                    >
                                      <MenuItem value="">—</MenuItem>
                                      <MenuItem value="Module">Module</MenuItem>
                                      <MenuItem value="Task">Task</MenuItem>
                                    </TextField>
                                  ) : (
                                    <TextField
                                      size="small"
                                      value={sanitizeCsvValue(row[header])}
                                      onChange={(e) => updateEditableCell(idx, header, e.target.value)}
                                      fullWidth
                                      title={sanitizeCsvValue(row[header])}
                                      sx={{
                                        '& .MuiOutlinedInput-root': {
                                          bgcolor: '#fff',
                                          '& fieldset': { borderColor: '#E2E8F0' },
                                        },
                                        '& .MuiInputBase-input': {
                                          fontSize: '0.8125rem',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        },
                                      }}
                                    />
                                  )
                                ) : (
                                  <Typography
                                    variant="body2"
                                    noWrap
                                    title={displayCsvCell(row[header]) || ''}
                                    sx={{ maxWidth: columnMinWidth(header) + 48, fontSize: '0.8125rem', minHeight: '1.25em' }}
                                  >
                                    {displayCsvCell(row[header])}
                                  </Typography>
                                )}
                              </TableCell>
                            ))}
                            {editMode && (
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  color="error"
                                  aria-label="Remove row"
                                  onClick={() => removeEditableRow(idx)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          mt: 2.5,
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          position: 'sticky',
          bottom: 0,
          bgcolor: '#F8FAFC',
          zIndex: 5,
          pb: 1,
          mt: 2.5,
          boxShadow: '0 -4px 16px rgba(15,23,42,0.04)',
        }}
      >
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={activeStep === 0 ? () => navigate('/projects') : handleBack}
          disabled={importing}
          sx={{ py: 1.1, px: 2.5, borderRadius: 2, textTransform: 'none', fontWeight: 650 }}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        {activeStep < 2 ? (
          <Button
            variant="contained"
            endIcon={<NextIcon />}
            onClick={handleNext}
            sx={{ py: 1.1, px: 2.75, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Continue
          </Button>
        ) : editMode || rowsDirty || serverErrors.length > 0 ? (
          <Button
            variant="contained"
            color="success"
            startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <SuccessIcon />}
            onClick={() => handleImport({ forceOriginal: false })}
            disabled={importing || !validationReport.isValid}
            sx={{ py: 1.1, px: 3, borderRadius: 2, textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}
          >
            {importing ? 'Importing…' : 'Import with my edits'}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <SuccessIcon />}
            onClick={() => handleImport({ forceOriginal: true })}
            disabled={importing || !validationReport.isValid || !selectedFile}
            sx={{ py: 1.1, px: 3, borderRadius: 2, textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}
          >
            {importing ? 'Importing…' : 'Continue without changes'}
          </Button>
        )}
      </Box>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
