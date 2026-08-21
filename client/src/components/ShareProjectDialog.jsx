import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Chip,
  Box,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Refresh as RegenerateIcon,
  LinkOff as DisableIcon,
  Link as EnableIcon,
  Email as EmailIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { openClientInviteEmail } from '../utils/clientInviteMail';

export default function ShareProjectDialog({ open, onClose, project }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [alert, setAlert] = useState(null);

  const loadRecord = async () => {
    if (!project?.id) return;
    setLoading(true);
    setAlert(null);
    try {
      const records = await api.listClientAccess({ projectId: project.id });
      const existing =
        (records || []).find((r) => Number(r.projectId) === Number(project.id)) || null;
      setRecord(existing);
      setClientName(existing?.clientName || project.clientName || '');
      setCompany(existing?.company || '');
      setEmail(existing?.email || '');
      setPasswordProtected(Boolean(existing?.passwordProtected));
      setPassword('');
    } catch (error) {
      console.error(error);
      setAlert({ severity: 'error', message: 'Failed to load share settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadRecord();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id]);

  const showMsg = (message, severity = 'success') => {
    setAlert({ message, severity });
  };

  const handleGenerate = async () => {
    if (!clientName.trim()) {
      showMsg('Client name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const created = await api.createClientAccess({
        projectId: project.id,
        clientName: clientName.trim(),
        company: company.trim() || null,
        email: email.trim() || null,
        expiresAt: null,
        password: passwordProtected && password ? password : undefined,
      });
      setRecord(created);
      setPassword('');
      showMsg('Secure client link generated');
    } catch (error) {
      showMsg(error.response?.data?.error || 'Failed to generate link', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!record?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(record.shareUrl);
      showMsg('Link copied to clipboard');
    } catch {
      const el = document.createElement('textarea');
      el.value = record.shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      showMsg('Link copied to clipboard');
    }
  };

  const handleEmailClient = () => {
    const to = email.trim() || record?.email;
    if (!to) {
      showMsg('Add a client email address first', 'warning');
      return;
    }
    if (!record?.shareUrl) {
      showMsg('Generate a secure link first', 'warning');
      return;
    }
    const opened = openClientInviteEmail({
      to,
      clientName: clientName.trim() || record?.clientName,
      projectName: project?.name,
      shareUrl: record.shareUrl,
      passwordProtected: Boolean(record.passwordProtected || passwordProtected),
    });
    if (opened) {
      showMsg('Opening your email app…');
    } else {
      showMsg('Could not open email. Check the address and try again.', 'error');
    }
  };

  const handleRegenerate = async () => {
    if (!record) return;
    setSaving(true);
    try {
      const updated = await api.regenerateClientAccess(record.id);
      setRecord(updated);
      showMsg('Link regenerated — previous link is invalid');
    } catch (error) {
      showMsg(error.response?.data?.error || 'Failed to regenerate link', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!record) return;
    setSaving(true);
    try {
      const next = record.status === 'active' ? 'disabled' : 'active';
      const updated = await api.updateClientAccess(record.id, { status: next });
      setRecord(updated);
      showMsg(next === 'active' ? 'Link enabled' : 'Link disabled');
    } catch (error) {
      showMsg(error.response?.data?.error || 'Failed to update link', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!record) return;
    setSaving(true);
    try {
      const updated = await api.updateClientAccess(record.id, {
        expiresAt: null,
        clientName: clientName.trim(),
        company: company.trim() || null,
        email: email.trim() || null,
        password: passwordProtected
          ? (password || undefined)
          : '',
      });
      setRecord(updated);
      setPassword('');
      showMsg('Share settings saved');
    } catch (error) {
      showMsg(error.response?.data?.error || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLink = async () => {
    if (!record) return;
    if (!window.confirm(`Are you sure you want to delete the client access link for "${record.clientName}"?`)) return;
    setSaving(true);
    try {
      await api.deleteClientAccess(record.id);
      setRecord(null);
      setClientName('');
      setCompany('');
      setEmail('');
      showMsg('Client access link deleted');
    } catch (error) {
      showMsg(error.response?.data?.error || 'Failed to delete client access link', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 800,
          display: 'flex',
          alignItems: 'baseline',
          gap: 0.75,
          minWidth: 0,
          pr: 3,
        }}
      >
        <Box component="span" sx={{ flexShrink: 0 }}>Share Project</Box>
        {project?.name ? (
          <Typography
            component="span"
            variant="body1"
            noWrap
            sx={{ fontWeight: 600, color: 'text.secondary', minWidth: 0, flex: 1 }}
            title={project.name}
          >
            — {project.name}
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5, overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2.5}>
            {alert && (
              <Alert severity={alert.severity} onClose={() => setAlert(null)}>
                {alert.message}
              </Alert>
            )}

            <Alert severity="info" variant="outlined">
              This link is locked to <strong>{project?.name}</strong>. The client will only see this project&apos;s tasks — not other projects.
            </Alert>

            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontWeight: 600
              }}>
              Access is always read-only for clients.
            </Typography>

            <Stack spacing={2.5}>
              <TextField
                label="Client Name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                fullWidth
                required
                helperText="Shown in the client portal header"
              />
              <TextField
                label="Company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                fullWidth
                helperText="Optional organization name"
              />
              <TextField
                label="Client Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                helperText="Used to email the secure link to your client"
                placeholder="client@company.com"
              />
            </Stack>

            <Stack spacing={2.5}>
              <FormControlLabel
                control={
                  <Switch
                    checked={passwordProtected}
                    onChange={(e) => setPasswordProtected(e.target.checked)}
                  />
                }
                label="Password protect this link"
              />

              {passwordProtected && (
                <TextField
                  label={record?.passwordProtected ? 'New Password (leave blank to keep)' : 'Share Password'}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                />
              )}
            </Stack>

            {record ? (
              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Secure Link
                  </Typography>
                  <Chip
                    size="small"
                    label={record.status === 'active' ? 'Active' : 'Disabled'}
                    color={record.status === 'active' ? 'success' : 'default'}
                  />
                </Box>
                <TextField
                  value={record.shareUrl}
                  fullWidth
                  slotProps={{
                    input: {
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Copy Link">
                            <IconButton onClick={handleCopy} edge="end" aria-label="Copy share link">
                              <CopyIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={email.trim() || record.email ? 'Email link to client' : 'Add client email first'}>
                            <span>
                              <IconButton
                                onClick={handleEmailClient}
                                edge="end"
                                aria-label="Email share link to client"
                                disabled={!(email.trim() || record.email)}
                              >
                                <EmailIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  startIcon={<EmailIcon />}
                  onClick={handleEmailClient}
                  disabled={!(email.trim() || record.email)}
                  sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}
                >
                  Email link to client
                </Button>
              </Stack>
            ) : (
              <Alert severity="info">No share link yet. Generate a secure client link below.</Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          gap: 1,
          flexWrap: 'wrap',
          position: 'sticky',
          bottom: 0,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          zIndex: 1,
        }}
      >
        <Button onClick={onClose}>Close</Button>
        {!record ? (
          <Button variant="contained" onClick={handleGenerate} disabled={saving || loading}>
            Generate Secure Link
          </Button>
        ) : (
          <>
            <Button startIcon={<CopyIcon />} onClick={handleCopy}>
              Copy Link
            </Button>
            <Button
              startIcon={<EmailIcon />}
              onClick={handleEmailClient}
              disabled={!(email.trim() || record.email)}
            >
              Email Client
            </Button>
            <Button startIcon={<RegenerateIcon />} onClick={handleRegenerate} disabled={saving}>
              Regenerate Link
            </Button>
            <Button
              startIcon={record.status === 'active' ? <DisableIcon /> : <EnableIcon />}
              color={record.status === 'active' ? 'warning' : 'success'}
              onClick={handleToggleStatus}
              disabled={saving}
            >
              {record.status === 'active' ? 'Disable Link' : 'Enable Link'}
            </Button>
            <Button startIcon={<DeleteIcon />} color="error" onClick={handleDeleteLink} disabled={saving}>
              Delete Link
            </Button>
            <Button variant="contained" onClick={handleSaveSettings} disabled={saving}>
              Save Settings
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
