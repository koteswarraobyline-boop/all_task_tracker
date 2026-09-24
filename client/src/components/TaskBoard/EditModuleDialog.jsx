import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ALL_STATUSES } from './constants';

function moduleDialogMeta(mod) {
  if (!mod) return { mode: 'record', title: 'Edit Module' };
  if (mod.moduleId === 'Unassigned') {
    return {
      mode: 'standalone',
      title: 'Edit Standalone Tasks',
      subtitle: `Convert standalone tasks in ${mod.phaseName || 'this phase'} into a module, or update phase only (leave module name empty).`,
    };
  }
  if (mod.parentTask) {
    return {
      mode: 'record',
      title: 'Edit Module',
      subtitle: 'Update module details. Phase changes apply to all tasks in this module.',
    };
  }
  return {
    mode: 'orphan',
    title: 'Edit Module Group',
    subtitle: 'Update the module label and phase for all tasks in this group.',
  };
}

export default function EditModuleDialog({ open, mod, saving, onClose, onSave }) {
  const meta = moduleDialogMeta(mod);
  const [form, setForm] = useState({
    name: '',
    moduleId: '',
    phase: '',
    description: '',
    status: 'Upcoming',
  });

  useEffect(() => {
    if (!open || !mod) return;
    if (mod.parentTask) {
      setForm({
        name: mod.parentTask.taskName || '',
        moduleId: mod.parentTask.taskId || mod.moduleId || '',
        phase: mod.parentTask.phase || mod.phaseName || '',
        description: mod.parentTask.description || '',
        status: mod.parentTask.status || 'Upcoming',
      });
      return;
    }
    if (mod.moduleId === 'Unassigned') {
      setForm({
        name: '',
        moduleId: '',
        phase: mod.phaseName || mod.tasks?.[0]?.phase || '',
        description: '',
        status: 'Upcoming',
      });
      return;
    }
    setForm({
      name: mod.name || mod.moduleId || '',
      moduleId: mod.moduleId || '',
      phase: mod.phaseName || mod.tasks?.[0]?.phase || '',
      description: '',
      status: 'Upcoming',
    });
  }, [open, mod]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.(form);
  };

  const isStandalone = meta.mode === 'standalone';
  const hasRecord = meta.mode === 'record';

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 800 }}>{meta.title}</DialogTitle>
        <DialogContent>
          {meta.subtitle ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              {meta.subtitle}
            </Typography>
          ) : null}
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label={isStandalone ? 'New module name' : 'Module name'}
              required={isStandalone || hasRecord}
              fullWidth
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={isStandalone ? 'e.g. Authentication' : undefined}
            />
            <TextField
              label={isStandalone ? 'New module ID' : 'Module ID'}
              fullWidth
              value={form.moduleId}
              onChange={(e) => setForm((prev) => ({ ...prev, moduleId: e.target.value }))}
              placeholder={isStandalone ? 'Auto-generated if blank' : undefined}
              helperText={
                hasRecord
                  ? 'Module ID cannot be changed after creation.'
                  : isStandalone
                    ? 'Leave blank to auto-generate an ID.'
                    : undefined
              }
              disabled={hasRecord}
            />
            <TextField
              label="Phase"
              fullWidth
              value={form.phase}
              onChange={(e) => setForm((prev) => ({ ...prev, phase: e.target.value }))}
            />
            {(hasRecord || isStandalone) && (
              <>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  minRows={2}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
                <TextField
                  select
                  label="Status"
                  fullWidth
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  {ALL_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving || (hasRecord && !form.name.trim())}
          >
            {saving ? 'Saving…' : isStandalone ? (form.name.trim() ? 'Convert & Save' : 'Update Phase') : 'Save Changes'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
