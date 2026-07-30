import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import { CalendarMonth as CalendarIcon, EventRepeat as ExtendIcon } from '@mui/icons-material';
import api from '../services/api';

export default function UpdateDeliveryDateDialog({ open, onClose, project, onUpdated }) {
  const [originalDate, setOriginalDate] = useState('');
  const [revisedDate, setRevisedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project) {
      setOriginalDate(project.originalDeliveryDate || project.dueDate || '');
      setRevisedDate(project.revisedDeliveryDate || '');
      setNotes(project.deliveryNotes || '');
      setError('');
    }
  }, [project, open]);

  const handleSave = async () => {
    if (!project?.id) return;
    setSaving(true);
    setError('');
    try {
      await api.updateProjectDeliveryDate(project.id, {
        originalDeliveryDate: originalDate || null,
        revisedDeliveryDate: revisedDate || null,
        deliveryNotes: notes || null,
      });
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update project delivery date');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(open)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CalendarIcon color="primary" />
        Update Project Delivery Date
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Box>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1 }}>
              Project: <strong>{project?.name || '—'}</strong>
            </Typography>
          </Box>

          <TextField
            label="Original Delivery Date"
            type="date"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            value={originalDate}
            onChange={(e) => setOriginalDate(e.target.value)}
            helperText="The initial promised target completion date"
          />

          <TextField
            label="New / Revised Delivery Date"
            type="date"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            value={revisedDate}
            onChange={(e) => setRevisedDate(e.target.value)}
            helperText="Set a new date if the project has been extended/updated"
          />

          <TextField
            label="Extension Reason / Notes (Optional)"
            multiline
            rows={2}
            fullWidth
            size="small"
            placeholder="e.g., Client requested additional scope / UI changes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="contained"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <ExtendIcon />}
        >
          {saving ? 'Saving...' : 'Save Dates'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
