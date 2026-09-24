import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as ShowIcon,
  VisibilityOff as HideIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { tokens } from '../theme';
import { useRole } from '../context/RoleContext';

const btnSx = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8125rem',
  borderRadius: `${tokens.radius.button}px`,
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: `${tokens.radius.input}px`,
    bgcolor: '#FFFFFF',
  },
};

function EmptyDash({ children }) {
  return (
    <Box
      sx={{
        border: `1px dashed ${tokens.colors.border}`,
        borderRadius: `${tokens.radius.sm}px`,
        bgcolor: '#F8FAFC',
        px: 2,
        py: 2.5,
        textAlign: 'center',
      }}
    >
      <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary }}>{children}</Typography>
    </Box>
  );
}

/**
 * Comments + review links for a WBS node and/or board task.
 * Works for admin (JWT) and client share token modes.
 */
export default function CommentsReviewLinksModal({
  open,
  onClose,
  onChanged,
  /** WBS node (Overview flow) */
  node = null,
  /** Board / calendar task */
  task = null,
  projectId = null,
  /** When true, team can post comments + review links (no edit-unlock required) */
  canManage = true,
  titleName = null,
}) {
  const { role, clientMeta } = useRole();
  const isClient = role === 'client';
  const clientToken = clientMeta?.token;
  const sharePassword = clientToken
    ? sessionStorage.getItem(`share-password:${clientToken}`) || undefined
    : undefined;

  const [comments, setComments] = useState([]);
  const [links, setLinks] = useState([]);
  const [note, setNote] = useState(null);
  const [resolvedNodeId, setResolvedNodeId] = useState(node?.id || null);
  const [resolvedTaskId, setResolvedTaskId] = useState(task?.id || node?.taskId || null);
  const [displayName, setDisplayName] = useState(titleName || node?.name || task?.taskName || 'Task');
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkUsername, setLinkUsername] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [commentError, setCommentError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(() => new Set());

  const canPostComment = isClient || canManage;
  const canManageLinks = !isClient && canManage;
  const canResolve = !isClient && canManage;

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setCommentError('');
    try {
      let data = null;
      if (isClient && clientToken && task?.id) {
        data = await api.getClientTaskCollab(clientToken, task.id, sharePassword);
      } else if (projectId && task?.id) {
        data = await api.getTaskCollab(projectId, task.id);
      } else if (projectId && node?.id) {
        data = await api.getNodeCollab(projectId, node.id);
      } else {
        throw new Error('Missing task or node context');
      }

      setComments(data.comments || []);
      setLinks(data.reviewLinks || []);
      setNote(data.note || null);
      setResolvedNodeId(data.nodeId || node?.id || null);
      setResolvedTaskId(data.taskId || task?.id || null);
      setDisplayName(data.taskName || titleName || node?.name || task?.taskName || 'Task');
    } catch (err) {
      setCommentError(err.response?.data?.error || err.message || 'Failed to load');
      setComments([]);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [
    open,
    isClient,
    clientToken,
    sharePassword,
    projectId,
    task?.id,
    node?.id,
    titleName,
    node?.name,
    task?.taskName,
  ]);

  useEffect(() => {
    if (!open) return;
    setText('');
    setLinkUrl('');
    setLinkUsername('');
    setLinkPassword('');
    setPasswordProtected(false);
    setLinkError('');
    setCommentError('');
    setRevealed(new Set());
    load();
  }, [open, load]);

  const toggleReveal = (id) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const publishLink = async () => {
    setLinkError('');
    if (!linkUrl.trim()) {
      setLinkError('Review URL is required.');
      return;
    }
    if (passwordProtected && !linkPassword.trim() && !linkUsername.trim()) {
      setLinkError('Add the site username and/or password so the client can open it.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        url: linkUrl.trim(),
        username: passwordProtected ? linkUsername.trim() || null : null,
        password: passwordProtected ? linkPassword.trim() || null : null,
      };
      let created;
      if (resolvedTaskId || task?.id) {
        created = await api.createTaskReviewLink(projectId, resolvedTaskId || task.id, payload);
      } else if (resolvedNodeId || node?.id) {
        created = await api.createReviewLink(projectId, resolvedNodeId || node.id, payload);
      } else {
        throw new Error('No task/node to attach link');
      }
      setLinks((prev) => [...prev, created]);
      setLinkUrl('');
      setLinkUsername('');
      setLinkPassword('');
      setPasswordProtected(false);
      onChanged?.({ commentCount: comments.length, reviewLinkCount: links.length + 1 });
      await load();
    } catch (err) {
      setLinkError(err.response?.data?.error || err.message || 'Failed to save review link');
    } finally {
      setBusy(false);
    }
  };

  const removeLink = async (linkId) => {
    if (!window.confirm('Delete this review link?')) return;
    setBusy(true);
    try {
      await api.deleteReviewLink(projectId, linkId);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      onChanged?.();
    } catch (err) {
      setLinkError(err.response?.data?.error || err.message || 'Failed to delete link');
    } finally {
      setBusy(false);
    }
  };

  const postComment = async () => {
    if (!text.trim()) return;
    setCommentError('');
    setBusy(true);
    try {
      if (isClient && clientToken && (resolvedTaskId || task?.id)) {
        await api.createClientTaskComment(
          clientToken,
          resolvedTaskId || task.id,
          {
            body: text.trim(),
            authorName: clientMeta?.clientName || 'Client',
          },
          sharePassword
        );
      } else if (projectId && (resolvedTaskId || task?.id)) {
        await api.createTaskComment(projectId, resolvedTaskId || task.id, {
          body: text.trim(),
        });
      } else if (projectId && (resolvedNodeId || node?.id)) {
        await api.createProjectComment(projectId, {
          nodeId: resolvedNodeId || node.id,
          body: text.trim(),
        });
      } else {
        throw new Error('Cannot post comment without task/node');
      }
      setText('');
      await load();
      onChanged?.();
    } catch (err) {
      setCommentError(err.response?.data?.error || err.message || 'Failed to post comment');
    } finally {
      setBusy(false);
    }
  };

  const resolveComment = async (c) => {
    if (!projectId) return;
    const resolved = c.status === 'resolved';
    setBusy(true);
    try {
      await api.updateProjectComment(projectId, c.id, {
        status: resolved ? 'open' : 'resolved',
      });
      await load();
      onChanged?.();
    } catch (err) {
      setCommentError(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteComment = async (c) => {
    if (!projectId || !window.confirm('Delete this comment?')) return;
    setBusy(true);
    try {
      await api.deleteProjectComment(projectId, c.id);
      await load();
      onChanged?.();
    } catch (err) {
      setCommentError(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      postComment();
    }
  };

  const sortedComments = useMemo(() => [...comments], [comments]);
  const countLabel = `${comments.length}${links.length ? ` · ${links.length} links` : ''}`;

  if (!node && !task) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: `${tokens.radius.dialog}px`,
          border: `1px solid ${tokens.colors.border}`,
          boxShadow: tokens.shadow.dialog,
          maxHeight: '90vh',
          width: { xs: '100%', sm: 560 },
        },
      }}
      slotProps={{
        backdrop: { sx: { bgcolor: 'rgba(15, 23, 42, 0.5)' } },
      }}
      TransitionProps={{ timeout: 200 }}
    >
      <DialogTitle sx={{ p: 2.5, pb: 1.5 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: tokens.colors.text }}>
              Comments & review links
            </Typography>
            <Typography sx={{ mt: 0.35, fontSize: '0.8125rem', color: tokens.colors.textSecondary }}>
              Task · {displayName}
              {countLabel !== '0' ? ` · ${countLabel}` : ''}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ color: tokens.colors.textMuted }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 1.5 }}>
        {note && (
          <Box
            sx={{
              mb: 2.5,
              p: 1.5,
              borderRadius: `${tokens.radius.sm}px`,
              bgcolor: tokens.colors.primarySofter,
              border: `1px solid ${tokens.colors.border}`,
            }}
          >
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', color: tokens.colors.textMuted, mb: 0.5 }}>
              NOTE
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textBody, whiteSpace: 'pre-wrap' }}>
              {note}
            </Typography>
          </Box>
        )}

        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: tokens.colors.text, mb: 0.5 }}>
          Review links
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary, mb: 1.5 }}>
          {isClient
            ? 'Open the review URL. If the site is password-protected, credentials are shown below.'
            : 'Save a review URL for the client. If the site needs a password, store it here so they can see it on the share link.'}
        </Typography>

        {!links.length ? (
          <EmptyDash>No review links on this task yet.</EmptyDash>
        ) : (
          <Stack spacing={1} sx={{ mb: 1.5 }}>
            {links.map((link) => {
              const hasCreds = Boolean(link.username || link.password);
              const openCreds = revealed.has(link.id);
              return (
                <Box
                  key={link.id}
                  sx={{
                    border: `1px solid ${tokens.colors.border}`,
                    borderRadius: `${tokens.radius.sm}px`,
                    p: 1.5,
                    bgcolor: '#FFFFFF',
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                    <Typography
                      component="a"
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: tokens.colors.primary,
                        wordBreak: 'break-all',
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {link.url}
                    </Typography>
                    {canManageLinks && (
                      <Button
                        size="small"
                        disabled={busy}
                        onClick={() => removeLink(link.id)}
                        sx={{ ...btnSx, color: tokens.colors.danger, minWidth: 0 }}
                      >
                        Delete
                      </Button>
                    )}
                  </Stack>
                  {hasCreds ? (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1.25 }} alignItems="center">
                      {link.username && (
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: '0.68rem', color: tokens.colors.textMuted, fontWeight: 650 }}>
                            USERNAME
                          </Typography>
                          <Typography component="code" sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                            {openCreds ? link.username : '••••••••'}
                          </Typography>
                        </Box>
                      )}
                      {link.password && (
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: '0.68rem', color: tokens.colors.textMuted, fontWeight: 650 }}>
                            PASSWORD
                          </Typography>
                          <Typography component="code" sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                            {openCreds ? link.password : '••••••••'}
                          </Typography>
                        </Box>
                      )}
                      <Button size="small" onClick={() => toggleReveal(link.id)} sx={{ ...btnSx, color: tokens.colors.primary }}>
                        {openCreds ? 'Hide' : 'Show'}
                      </Button>
                    </Stack>
                  ) : (
                    <Typography sx={{ mt: 1, fontSize: '0.75rem', color: tokens.colors.textMuted }}>
                      No password on this link
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}

        {canManageLinks && (
          <Stack spacing={1.25} sx={{ mt: 1.75 }}>
            <TextField
              size="small"
              label="Review URL"
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              fullWidth
              sx={fieldSx}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={passwordProtected}
                  onChange={(e) => {
                    setPasswordProtected(e.target.checked);
                    if (!e.target.checked) {
                      setLinkUsername('');
                      setLinkPassword('');
                    }
                  }}
                  color="primary"
                />
              }
              label={
                <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.text }}>
                  Site is password-protected — save credentials for the client
                </Typography>
              }
              sx={{ ml: 0, alignItems: 'center' }}
            />
            {passwordProtected && (
              <>
                <TextField
                  size="small"
                  label="Username (optional)"
                  placeholder="If the site asks for a username"
                  value={linkUsername}
                  onChange={(e) => setLinkUsername(e.target.value)}
                  fullWidth
                  sx={fieldSx}
                />
                <TextField
                  size="small"
                  label="Password"
                  placeholder="Site password for the client"
                  type={showPassword ? 'text' : 'password'}
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  fullWidth
                  sx={fieldSx}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          size="small"
                          onClick={() => setShowPassword((v) => !v)}
                          startIcon={
                            showPassword ? <HideIcon sx={{ fontSize: 16 }} /> : <ShowIcon sx={{ fontSize: 16 }} />
                          }
                          sx={{ ...btnSx, color: tokens.colors.textSecondary, minWidth: 0 }}
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </Button>
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            )}
            {linkError && <Alert severity="error">{linkError}</Alert>}
            <Button
              fullWidth
              variant="contained"
              disabled={busy}
              onClick={publishLink}
              sx={{
                ...btnSx,
                bgcolor: tokens.colors.primary,
                py: 1.1,
                boxShadow: 'none',
                '&:hover': { bgcolor: tokens.colors.primaryHover },
              }}
            >
              Save review link for client
            </Button>
          </Stack>
        )}

        <Box sx={{ mt: 3, pt: 2.5, borderTop: `1px solid ${tokens.colors.border}` }}>
          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: tokens.colors.text, mb: 1.25 }}>
            Comments & chat
          </Typography>

          {loading && !sortedComments.length ? (
            <Typography sx={{ fontSize: '0.8125rem', color: tokens.colors.textSecondary }}>Loading…</Typography>
          ) : !sortedComments.length ? (
            <EmptyDash>No comments yet. Be the first to add one.</EmptyDash>
          ) : (
            <Stack spacing={1.25} sx={{ mb: 1.5, maxHeight: 240, overflowY: 'auto' }}>
              {sortedComments.map((c) => {
                const resolved = c.status === 'resolved';
                return (
                  <Box
                    key={c.id}
                    sx={{
                      border: `1px solid ${tokens.colors.border}`,
                      borderRadius: `${tokens.radius.sm}px`,
                      p: 1.5,
                      bgcolor: resolved ? tokens.colors.successBg : '#FFFFFF',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 650, color: tokens.colors.text }}>
                        {c.authorName || 'Team'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: tokens.colors.textMuted }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                      </Typography>
                    </Stack>
                    <Typography sx={{ mt: 0.75, fontSize: '0.8125rem', color: tokens.colors.textBody, whiteSpace: 'pre-wrap' }}>
                      {c.body}
                    </Typography>
                    {canResolve && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button
                          size="small"
                          disabled={busy}
                          onClick={() => resolveComment(c)}
                          sx={{ ...btnSx, color: tokens.colors.primary, fontSize: '0.72rem', minWidth: 0 }}
                        >
                          {resolved ? 'Reopen' : 'Resolve'}
                        </Button>
                        <Button
                          size="small"
                          disabled={busy}
                          onClick={() => deleteComment(c)}
                          sx={{ ...btnSx, color: tokens.colors.danger, fontSize: '0.72rem', minWidth: 0 }}
                        >
                          Delete
                        </Button>
                      </Stack>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}

          {commentError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {commentError}
            </Alert>
          )}

          <Typography sx={{ mt: 2, mb: 0.75, fontSize: '0.8125rem', fontWeight: 650, color: tokens.colors.text }}>
            {isClient ? 'Add a note or question' : 'Add a comment or query'}
          </Typography>
          <TextField
            size="small"
            multiline
            minRows={3}
            fullWidth
            disabled={!canPostComment}
            placeholder="Write a comment... (Ctrl+Enter to post)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            sx={fieldSx}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.75, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            ...btnSx,
            border: `1px solid ${tokens.colors.border}`,
            color: tokens.colors.text,
            bgcolor: '#FFFFFF',
            px: 2,
          }}
        >
          Close
        </Button>
        <Button
          variant="contained"
          disabled={!canPostComment || busy || !text.trim()}
          onClick={postComment}
          sx={{
            ...btnSx,
            bgcolor: tokens.colors.primary,
            px: 2.5,
            boxShadow: 'none',
            '&:hover': { bgcolor: tokens.colors.primaryHover },
          }}
        >
          Post
        </Button>
      </DialogActions>
    </Dialog>
  );
}
