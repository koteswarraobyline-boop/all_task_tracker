import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import api from '../services/api';

export default function EditProjectDialog({ open, onClose, project, onUpdated }) {
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [originalDeliveryDate, setOriginalDeliveryDate] = useState('');
  const [revisedDeliveryDate, setRevisedDeliveryDate] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setClientName(project.clientName || '');
      setOriginalDeliveryDate(project.originalDeliveryDate || project.dueDate || '');
      setRevisedDeliveryDate(project.revisedDeliveryDate || '');
      setDeliveryNotes(project.deliveryNotes || '');
      setError('');
    }
  }, [project, open]);

  const handleSave = async () => {
    if (!project?.id) return;
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.updateProject(project.id, {
        name: name.trim(),
        clientName: clientName.trim() || null,
        originalDeliveryDate: originalDeliveryDate || null,
        revisedDeliveryDate: revisedDeliveryDate || null,
        deliveryNotes: deliveryNotes || null,
      });
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(open)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <EditIcon color="primary" />
        Edit Project Details
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Project Name"
            fullWidth
            required
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <TextField
            label="Client Name"
            fullWidth
            size="small"
            placeholder="e.g. Acme Corp"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Original Delivery Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={originalDeliveryDate}
              onChange={(e) => setOriginalDeliveryDate(e.target.value)}
            />

            <TextField
              label="Revised Delivery Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={revisedDeliveryDate}
              onChange={(e) => setRevisedDeliveryDate(e.target.value)}
            />
          </Stack>

          <TextField
            label="Delivery / Extension Notes (Optional)"
            multiline
            rows={2}
            fullWidth
            size="small"
            placeholder="e.g., Client requested scope changes"
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !name.trim()}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
