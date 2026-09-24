import React, { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { LockOutlined as LockIcon, LockOpenOutlined as UnlockIcon } from '@mui/icons-material';
import { useProjectWorkspace } from '../context/ProjectWorkspaceContext';
import Can from './Can';

const btnSx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8125rem',
  px: 1.5,
  py: 0.75,
  minHeight: 36,
  borderRadius: '8px',
};

export default function ProjectWorkspaceBar() {
  const {
    viewAs,
    setViewAs,
    unlocked,
    lock,
    unlockWithPassword,
    unlockOpen,
    setUnlockOpen,
    wbs,
  } = useProjectWorkspace();
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const team = wbs?.team || [];

  const onUnlock = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await unlockWithPassword(password);
      setPassword('');
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message || 'Unlock failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.25}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2.5 }}
      >
        <FormControl size="small" sx={{ minWidth: 160, maxWidth: 220 }}>
          <InputLabel id="view-as-label">View as</InputLabel>
          <Select
            labelId="view-as-label"
            label="View as"
            value={viewAs || ''}
            onChange={(e) => setViewAs(e.target.value || null)}
          >
            <MenuItem value="">Everyone</MenuItem>
            {team.map((m) => (
              <MenuItem key={m.id} value={String(m.id)}>
                {m.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Can permission="task.edit">
          <Button
            size="small"
            variant={unlocked ? 'contained' : 'outlined'}
            color={unlocked ? 'primary' : 'inherit'}
            startIcon={unlocked ? <UnlockIcon sx={{ fontSize: 16 }} /> : <LockIcon sx={{ fontSize: 16 }} />}
            onClick={() => (unlocked ? lock() : setUnlockOpen(true))}
            sx={btnSx}
          >
            {unlocked ? 'Editing' : 'View only'}
          </Button>
        </Can>
      </Stack>

      <Dialog open={unlockOpen} onClose={() => setUnlockOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={onUnlock}>
          <DialogTitle sx={{ fontWeight: 600, fontSize: '1.05rem' }}>Unlock editing</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter the unlock password. Your admin permissions still apply.
            </Typography>
            {err && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {err}
              </Alert>
            )}
            <TextField
              autoFocus
              fullWidth
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="small"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button onClick={() => setUnlockOpen(false)} sx={btnSx}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={busy || !password}
              sx={btnSx}
            >
              {busy ? 'Checking…' : 'Unlock'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}

export function ViewAsBanner() {
  const { viewAs, wbs, setViewAs } = useProjectWorkspace();
  if (!viewAs) return null;
  const name = wbs?.team?.find((m) => String(m.id) === String(viewAs))?.name || 'Selected member';
  return (
    <Alert
      severity="info"
      variant="outlined"
      sx={{ mb: 2, py: 0.5 }}
      action={
        <Button color="inherit" size="small" onClick={() => setViewAs(null)} sx={{ fontWeight: 600 }}>
          Clear
        </Button>
      }
    >
      Viewing as <strong>{name}</strong>
    </Alert>
  );
}
