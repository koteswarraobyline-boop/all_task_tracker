import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Stack } from '@mui/material';
import { FolderOpen as FilesIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import PageContainer from '../components/PageContainer';
import EmptyState from '../components/EmptyState';
import { ProjectNavTabs } from '../components/ProjectDashboard';
import { useProjectId } from '../hooks/useProjectId';
import { tokens } from '../theme';

export default function ProjectFiles() {
  const projectId = useProjectId();
  const navigate = useNavigate();

  return (
    <PageContainer maxWidth={tokens.layout.maxWidth}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Button
          size="small"
          startIcon={<BackIcon />}
          onClick={() => navigate(`/projects/${projectId}/dashboard`)}
          sx={{ fontWeight: 650 }}
        >
          Back to Overview
        </Button>
      </Stack>
      <Typography variant="h1" sx={{ fontSize: '1.75rem', fontWeight: 800, mb: 0.5 }}>
        Project Files
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Documents and attachments for this project.
      </Typography>
      <ProjectNavTabs projectId={projectId} />
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <EmptyState
          title="Files coming soon"
          description="Upload and manage project documents here. This feature is not available yet."
        />
        <Button
          variant="outlined"
          startIcon={<FilesIcon />}
          onClick={() => navigate(`/projects/${projectId}/dashboard`)}
          sx={{ mt: 2 }}
        >
          Back to Overview
        </Button>
      </Box>
    </PageContainer>
  );
}
