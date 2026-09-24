import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';

const REMARK_STATUSES = new Set(['Blocked', 'On Hold']);

export function needsStatusRemark(status) {
  return REMARK_STATUSES.has(status);
}

/**
 * Prompt for a remark when moving a task to Blocked or On Hold.
 * Remark is stored in task.remarks and shown on overview timeline only.
 */
export default function StatusRemarkDialog({
  open,
  status,
  taskName,
  initialRemark = '',
  saving = false,
  onCancel,
  onConfirm,
  title = 'Reason Required',
  message = 'Please provide a reason for this status.',
}) {
  const [remark, setRemark] = useState(initialRemark || '');

  useEffect(() => {
    if (open) setRemark(initialRemark || '');
  }, [open, initialRemark]);

  const trimmed = remark.trim();

  return (
    <Dialog open={open} onClose={saving ? undefined : onCancel} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>{title}</DialogTitle>
      <DialogContent>
        {taskName ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }} noWrap>
            {taskName}
          </Typography>
        ) : null}
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {message}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          label={status === 'On Hold' ? 'Hold reason' : 'Block reason'}
          placeholder="Enter reason..."
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && trimmed) {
              onConfirm(trimmed);
            }
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={saving || !trimmed}
          onClick={() => onConfirm(trimmed)}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
