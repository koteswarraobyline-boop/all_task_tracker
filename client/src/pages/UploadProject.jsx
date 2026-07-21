import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import api from '../services/api';

const DB_FIELDS = [
  { key: 'taskName', label: 'Task Name', required: true },
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
  { key: 'description', label: 'Description', required: false },
  { key: 'phase', label: 'Phase', required: false },
  { key: 'week', label: 'Week', required: false },
  { key: 'estDays', label: 'Est. Days', required: false },
  { key: 'dependencies', label: 'Dependencies', required: false },
];

const slideVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.25 } }
};

export default function UploadProject() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  // Form Fields
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // CSV Parsing
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState([]); // First 20 rows
  
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

    // Parse Headers and Preview rows using PapaParse
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 21, // Read first 21 rows (to get 20 rows for preview)
      complete: (results) => {
        if (results.data.length === 0) {
          showAlert('CSV file appears to be empty', 'error');
          return;
        }

        const headers = Object.keys(results.data[0]);
        setCsvHeaders(headers);
        setCsvPreviewRows(results.data.slice(0, 20));

        // Auto map columns based on keyword matching
        const initialMapping = {};
        DB_FIELDS.forEach((field) => {
          const match = findBestHeaderMatch(field.label, headers);
          if (match) {
            initialMapping[field.key] = match;
          } else {
            initialMapping[field.key] = '';
          }
        });
        setMapping(initialMapping);
      },
      error: (err) => {
        console.error('CSV Parsing Error:', err);
        showAlert('Failed to parse CSV file', 'error');
      },
    });
  };

  const findBestHeaderMatch = (label, headers) => {
    const cleanLabel = label.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Exact match or contains matches
    for (const header of headers) {
      const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanHeader === cleanLabel || cleanHeader.includes(cleanLabel) || cleanLabel.includes(cleanHeader)) {
        return header;
      }
    }
    
    // Extra synonyms
    const synonyms = {
      taskName: ['task', 'name', 'summary', 'title', 'subject'],
      taskId: ['id', 'taskid', 'number', 'key', 'code'],
      assignedDeveloper: ['owner', 'assigned', 'developer', 'dev', 'assignee', 'resource'],
      estimatedHours: ['est', 'estimated', 'estimate', 'hours', 'effort'],
      actualHours: ['act', 'actual', 'logged', 'time spent'],
      startDate: ['start', 'startdate', 'begin'],
      dueDate: ['due', 'duedate', 'deadline', 'end'],
      phase: ['phase', 'stage', 'release'],
      week: ['week', 'sprint', 'schedule'],
      estDays: ['est days', 'est. days', 'estimated days', 'days', 'duration'],
      dependencies: ['dependencies', 'depends', 'links'],
    };

    for (const [key, list] of Object.entries(synonyms)) {
      const matchedField = DB_FIELDS.find(f => f.key === key);
      if (matchedField && matchedField.label === label) {
        for (const header of headers) {
          const cleanHeader = header.toLowerCase();
          if (list.some(syn => cleanHeader.includes(syn))) {
            return header;
          }
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

  // Run preview validation whenever mapping changes
  useEffect(() => {
    if (csvPreviewRows.length === 0) return;
    runPreviewValidation();
  }, [mapping, csvPreviewRows]);

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
      if (!projectName.trim()) {
        showAlert('Project Name is required', 'warning');
        return;
      }
      if (!selectedFile) {
        showAlert('Please upload a CSV file', 'warning');
        return;
      }
    }
    
    if (activeStep === 1) {
      if (!mapping.taskName) {
        showAlert('You must map the Task Name column', 'error');
        return;
      }
    }

    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setServerErrors([]);
  };

  const handleImport = async () => {
    setImporting(true);
    setServerErrors([]);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', projectName);
    formData.append('clientName', clientName);
    formData.append('mapping', JSON.stringify(mapping));

    try {
      const response = await api.uploadProject(formData);
      showAlert(response.message || 'Project imported successfully!');
      
      setTimeout(() => {
        navigate(`/projects/${response.projectId}/tasks`);
      }, 1000);
    } catch (error) {
      console.error('Import failed:', error);
      const msg = error.response?.data?.error || 'Import failed';
      const details = error.response?.data?.details || [];
      showAlert(msg, 'error');
      if (details.length > 0) {
        setServerErrors(details);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.025em' }}>
          Import Task Spreadsheet
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Create a project by uploading a task backlog CSV. Select header mappings and run checks before importing.
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 5 }}>
        <Step><StepLabel>Upload CSV File</StepLabel></Step>
        <Step><StepLabel>Map Columns & Preview</StepLabel></Step>
        <Step><StepLabel>Validate & Confirm</StepLabel></Step>
      </Stepper>

      <AnimatePresence mode="wait">
        {/* STEP 0: Upload & Details */}
        {activeStep === 0 && (
          <motion.div key="step0" variants={slideVariants} initial="initial" animate="animate" exit="exit">
            <Grid container spacing={4}>
              <Grid item xs={12} md={5}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3.5 }}>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                      Project Details
                    </Typography>
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
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={7}>
                <Paper
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  sx={{
                    p: 4,
                    height: '100%',
                    minHeight: 280,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderStyle: 'dashed',
                    borderWidth: 2,
                    borderColor: isDragOver ? 'primary.main' : 'primary.light',
                    borderRadius: 4,
                    backgroundColor: isDragOver 
                      ? (theme => theme.palette.mode === 'dark' ? '#1f293730' : '#4f46e505') 
                      : 'transparent',
                    transition: 'all 0.25s ease',
                    transform: isDragOver ? 'scale(1.01)' : 'scale(1)',
                  }}
                >
                  <input
                    accept=".csv"
                    style={{ display: 'none' }}
                    id="csv-file-upload-wizard"
                    type="file"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="csv-file-upload-wizard">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<UploadIcon />}
                      sx={{ mb: 2, py: 1.2, px: 3, borderRadius: 3 }}
                    >
                      Choose CSV File
                    </Button>
                  </label>

                  {selectedFile ? (
                    <Box sx={{ textAlign: 'center', mt: 1.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {selectedFile.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Size: {(selectedFile.size / 1024).toFixed(2)} KB
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1, lineHeight: 1.6 }}>
                      Drag and drop your spreadsheet here or click to select.<br />
                      File must be formatted as `.csv`.
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </motion.div>
        )}

        {/* STEP 1: Configure Column Mapping & Preview */}
        {activeStep === 1 && (
          <motion.div key="step1" variants={slideVariants} initial="initial" animate="animate" exit="exit">
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Card sx={{ maxHeight: 600, overflowY: 'auto' }}>
                  <CardContent sx={{ p: 3.5 }}>
                    <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
                      Column Mapping
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Map database schema attributes to corresponding CSV header names.
                    </Typography>

                    <Divider sx={{ mb: 2.5 }} />

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
                        sx={{ mb: 2.5 }}
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

              <Grid item xs={12} md={8}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ p: 3.5, flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                      Mapped Rows Preview (First 20 Rows)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                      Verify mapped rows show correctly structured values.
                    </Typography>

                    {!mapping.taskName ? (
                      <Alert severity="info" sx={{ mt: 4, borderRadius: 3 }}>
                        Please map the <strong>Task Name</strong> column to render the table preview.
                      </Alert>
                    ) : (
                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 440, borderRadius: 3, borderColor: 'divider' }}>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                              {DB_FIELDS.filter(f => mapping[f.key]).map((field) => (
                                <TableCell key={field.key} sx={{ fontWeight: 700 }}>
                                  {field.label}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {csvPreviewRows.map((row, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{idx + 1}</TableCell>
                                {DB_FIELDS.filter(f => mapping[f.key]).map((field) => (
                                  <TableCell key={field.key}>
                                    {row[mapping[field.key]] || <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.8rem' }}>empty</span>}
                                  </TableCell>
                                ))}
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
          </motion.div>
        )}

        {/* STEP 2: Validate & Confirm */}
        {activeStep === 2 && (
          <motion.div key="step2" variants={slideVariants} initial="initial" animate="animate" exit="exit">
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                  Confirm & Review
                </Typography>

                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">Project Name</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.5 }}>{projectName}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">Client / Team</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.5 }}>{clientName || 'Internal'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">CSV File</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.5 }}>{selectedFile?.name}</Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ mb: 4 }} />

                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  Pre-import Sheet Validation
                </Typography>

                {validationReport.isValid ? (
                  <Alert severity="success" icon={<SuccessIcon />} sx={{ mb: 4, borderRadius: 3 }}>
                    <AlertTitle sx={{ fontWeight: 700 }}>Checks Passed</AlertTitle>
                    All preview rows contain correct formats and fields. Ready to insert tasks.
                  </Alert>
                ) : (
                  <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 4, borderRadius: 3 }}>
                    <AlertTitle sx={{ fontWeight: 700 }}>Validation warnings found ({validationReport.errors.length})</AlertTitle>
                    <Box sx={{ maxHeight: 200, overflowY: 'auto', mt: 1 }}>
                      <ul style={{ paddingLeft: 16 }}>
                        {validationReport.errors.map((err, idx) => (
                          <li key={idx} style={{ marginBottom: 4, fontSize: '0.875rem' }}>{err}</li>
                        ))}
                      </ul>
                    </Box>
                  </Alert>
                )}

                {serverErrors.length > 0 && (
                  <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>
                    <AlertTitle sx={{ fontWeight: 700 }}>Server-Side Parse Failures</AlertTitle>
                    <Box sx={{ maxHeight: 200, overflowY: 'auto', mt: 1 }}>
                      <ul style={{ paddingLeft: 16 }}>
                        {serverErrors.map((err, idx) => (
                          <li key={idx} style={{ marginBottom: 4, fontSize: '0.875rem' }}>{err}</li>
                        ))}
                      </ul>
                    </Box>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={activeStep === 0 ? () => navigate('/projects') : handleBack}
          disabled={importing}
          sx={{ py: 1.2, px: 3, borderRadius: 3 }}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>
        
        {activeStep < 2 ? (
          <Button
            variant="contained"
            endIcon={<NextIcon />}
            onClick={handleNext}
            sx={{ py: 1.2, px: 3, borderRadius: 3 }}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            startIcon={importing ? <CircularProgress size={20} color="inherit" /> : <SuccessIcon />}
            onClick={handleImport}
            disabled={importing || !validationReport.isValid}
            sx={{
              py: 1.2,
              px: 4,
              borderRadius: 3,
              boxShadow: '0 4px 14px 0 rgba(34, 197, 94, 0.3)',
            }}
          >
            {importing ? 'Importing Tasks...' : 'Confirm & Import Project'}
          </Button>
        )}
      </Box>

      {/* Snackbar notifications */}
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
