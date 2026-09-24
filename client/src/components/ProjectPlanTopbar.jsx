import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  LockOutlined as LockIcon,
  LockOpenOutlined as UnlockIcon,
} from '@mui/icons-material';
import { useProjectWorkspaceOptional } from '../context/ProjectWorkspaceContext';
import { tokens } from '../theme';
import Can from './Can';

const TABS = [
  { key: 'overview', label: 'Overview', path: 'overview' },
  { key: 'timeline', label: 'Timeline', path: 'timeline' },
  { key: 'team', label: 'Team', path: 'team' },
  { key: 'hierarchy', label: 'Hierarchy', path: 'hierarchy' },
  { key: 'roadmap', label: 'Roadmap', path: 'roadmap' },
  { key: 'comments', label: 'Comments', path: 'comments' },
];

function activePath(pathname, projectId) {
  const base = `/projects/${projectId}/`;
  if (!pathname.startsWith(base)) return '';
  return pathname.slice(base.length).split('/')[0] || '';
}

const btnSx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8125rem',
  minHeight: 32,
  px: 1.25,
  borderRadius: '8px',
  color: '#E2E8F0',
  borderColor: 'rgba(226,232,240,0.35)',
  '&:hover': {
    borderColor: 'rgba(226,232,240,0.55)',
    bgcolor: 'rgba(255,255,255,0.06)',
  },
};

/**
 * Lumo-style project plan topbar: tabs + View as + View only.
 * Place below the page header on plan views.
 */
export default function ProjectPlanTopbar({ projectId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const workspace = useProjectWorkspaceOptional();
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!projectId) return null;

  const current = activePath(location.pathname, projectId);
  const team = workspace?.wbs?.team || [];
  const viewAs = workspace?.viewAs || '';
  const unlocked = Boolean(workspace?.unlocked);
  const unlockOpen = Boolean(workspace?.unlockOpen);

  const onUnlock = async (e) => {
    e.preventDefault();
    if (!workspace) return;
    setBusy(true);
    setErr('');
    try {
      await workspace.unlockWithPassword(password);
      setPassword('');
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message || 'Unlock failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          mb: 1.5,
          px: { xs: 0.75, sm: 1 },
          py: 0.5,
          borderRadius: `${tokens.radius.planBar}px`,
          bgcolor: tokens.colors.sidebar,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          flexWrap: 'wrap',
          minHeight: 42,
        }}
      >
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            flex: 1,
            minWidth: 0,
            overflowX: 'auto',
            py: 0.25,
            '&::-webkit-scrollbar': { height: 0 },
          }}
        >
          {TABS.map((tab) => {
            const active = current === tab.path;
            return (
              <Button
                key={tab.key}
                onClick={() => navigate(`/projects/${projectId}/${tab.path}`)}
                sx={{
                  ...btnSx,
                  flexShrink: 0,
                  bgcolor: active ? 'primary.main' : 'transparent',
                  color: active ? '#FFFFFF' : 'rgba(226,232,240,0.9)',
                  fontWeight: active ? 650 : 500,
                  border: 'none',
                  borderRadius: '8px',
                  '&:hover': {
                    bgcolor: active ? 'primary.dark' : 'rgba(255,255,255,0.08)',
                    color: '#FFFFFF',
                  },
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Stack>

        {workspace && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0, ml: 'auto' }}>
            <Select
              size="small"
              value={viewAs}
              displayEmpty
              onChange={(e) => workspace.setViewAs(e.target.value || null)}
              sx={{
                minWidth: 148,
                height: 32,
                color: '#E2E8F0',
                fontSize: '0.8125rem',
                fontWeight: 500,
                bgcolor: 'transparent',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(226,232,240,0.35)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(226,232,240,0.55)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(226,232,240,0.65)',
                },
                '.MuiSvgIcon-root': { color: '#CBD5E1' },
              }}
            >
              <MenuItem value="">View as: Everyone</MenuItem>
              {team.map((m) => (
                <MenuItem key={m.id} value={String(m.id)}>
                  View as: {m.name}
                </MenuItem>
              ))}
            </Select>

            <Can permission="task.edit">
              <Button
                size="small"
                variant="outlined"
                startIcon={
                  unlocked ? (
                    <UnlockIcon sx={{ fontSize: 14, color: '#FBBF24' }} />
                  ) : (
                    <LockIcon sx={{ fontSize: 14, color: '#FBBF24' }} />
                  )
                }
                onClick={() => (unlocked ? workspace.lock() : workspace.setUnlockOpen(true))}
                sx={{
                  ...btnSx,
                  borderColor: 'rgba(226,232,240,0.35)',
                  color: '#E2E8F0',
                }}
              >
                {unlocked ? 'Editing' : 'View only'}
              </Button>
            </Can>
          </Stack>
        )}
      </Box>

      {workspace && (
        <Dialog open={unlockOpen} onClose={() => workspace.setUnlockOpen(false)} maxWidth="xs" fullWidth>
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
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => workspace.setUnlockOpen(false)} sx={{ textTransform: 'none' }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={busy || !password}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {busy ? 'Checking…' : 'Unlock'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </>
  );
}
