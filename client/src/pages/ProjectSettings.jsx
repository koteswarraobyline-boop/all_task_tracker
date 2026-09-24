import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Stack,
  Paper,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Edit as EditIcon,
  CalendarMonth as CalendarIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import PageContainer from '../components/PageContainer';
import { formatProjectId, formatShortDate } from '../components/ProjectDashboard/dashboardHelpers';
import EditProjectDialog from '../components/EditProjectDialog';
import UpdateDeliveryDateDialog from '../components/UpdateDeliveryDateDialog';
import Can from '../components/Can';
import api from '../services/api';
import { useProjectId } from '../hooks/useProjectId';
import { tokens } from '../theme';

export default function ProjectSettings() {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const projects = await api.getProjects();
      const found = (projects || []).find((p) => p.id === parseInt(projectId, 10));
      setProject(found || { id: projectId, name: `Project #${projectId}` });
    } catch (e) {
      console.error(e);
      setError('Failed to load project settings');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageContainer maxWidth={960}>
      <Typography variant="h1" sx={{ fontSize: '1.5rem', fontWeight: 650, mb: 0.5 }}>
        Project Settings
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {project ? `${formatProjectId(project.id)} · ${project.name}` : 'Configure project details'}
      </Typography>

      {loading ? (
        <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
      ) : error ? (
        <Alert severity="error" action={<Button onClick={load}>Retry</Button>}>
          {error}
        </Alert>
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: `${tokens.radius.card}px`,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: tokens.shadow.card,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <SettingsIcon color="primary" />
            <Typography sx={{ fontWeight: 750, fontSize: '1rem' }}>General</Typography>
          </Stack>

          <Stack spacing={2} sx={{ mb: 3 }}>
            {[
              ['Project name', project?.name],
              ['Client', project?.clientName || '—'],
              ['Start date', formatShortDate(project?.startDate)],
              ['Target delivery', formatShortDate(project?.activeDeliveryDate || project?.dueDate)],
            ].map(([label, value]) => (
              <Box key={label}>
                <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
                  {label}
                </Typography>
                <Typography sx={{ fontWeight: 650 }}>{value}</Typography>
              </Box>
            ))}
          </Stack>

          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            <Can permission="project.edit">
              <Button variant="contained" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
                Edit Project
              </Button>
            </Can>
            <Can permission="project.edit">
              <Button variant="outlined" startIcon={<CalendarIcon />} onClick={() => setDateOpen(true)}>
                Update Delivery Date
              </Button>
            </Can>
            <Can permission="csv.upload">
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => navigate(`/projects/upload?projectId=${projectId}`)}
              >
                Import CSV
              </Button>
            </Can>
          </Stack>
        </Paper>
      )}

      <EditProjectDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
        onUpdated={load}
      />
      <UpdateDeliveryDateDialog
        open={dateOpen}
        onClose={() => setDateOpen(false)}
        project={project}
        onUpdated={load}
      />
    </PageContainer>
  );
}
