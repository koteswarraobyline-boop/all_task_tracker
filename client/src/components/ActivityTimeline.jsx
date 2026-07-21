import React from 'react';
import { Box, Typography, Avatar, Stack, Chip, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import {
  Update as UpdateIcon,
  CheckCircle as CheckIcon,
  PlayCircle as PlayIcon,
  HourglassEmpty as UpcomingIcon,
} from '@mui/icons-material';

const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } }
};

export default function ActivityTimeline({ tasks }) {
  if (!tasks || tasks.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No recent activity logged for this project.
        </Typography>
      </Box>
    );
  }

  // Sort tasks by updatedAt descending and take first 6
  const recentActivities = [...tasks]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />;
      case 'In Development':
        return <PlayIcon sx={{ fontSize: 14, color: 'primary.main' }} />;
      case 'Upcoming':
      case 'Assigned':
        return <UpcomingIcon sx={{ fontSize: 14, color: 'text.secondary' }} />;
      default:
        return <UpdateIcon sx={{ fontSize: 14, color: 'warning.main' }} />;
    }
  };

  const timeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <Box sx={{ position: 'relative', pl: 3.5, py: 1 }}>
        {/* Vertical Line Timeline Track */}
        <Box
          sx={{
            position: 'absolute',
            left: '11px',
            top: 12,
            bottom: 12,
            width: '2px',
            bgcolor: 'divider',
          }}
        />

        <Stack spacing={3.5}>
          {recentActivities.map((task, index) => {
            const dev = task.developer;
            const statusLabel = task.status;
            
            return (
              <motion.div key={task.id} variants={itemVariants}>
                <Box sx={{ position: 'relative' }}>
                  {/* Circle Node Anchor */}
                  <Avatar
                    sx={{
                      position: 'absolute',
                      left: '-36px',
                      top: 2,
                      width: 24,
                      height: 24,
                      bgcolor: dev ? dev.color : 'grey.300',
                      boxShadow: '0 0 0 4px ' + (theme => theme.palette.background.paper),
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    {dev ? dev.name.charAt(0).toUpperCase() : '?'}
                  </Avatar>

                  {/* Activity Details Card */}
                  <Box>
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                      <Chip
                        label={task.taskId}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1f2937' : '#f1f5f9',
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 650, color: 'text.primary' }}>
                        {task.taskName}
                      </Typography>
                    </Stack>
                    
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.6 }}>
                      {getStatusIcon(statusLabel)}
                      <span>
                        {dev ? `Assigned to ${dev.name}` : 'Unassigned'} &bull; Status is <strong>{statusLabel}</strong>
                      </span>
                      <span style={{ margin: '0 4px', color: '#cbd5e1' }}>&bull;</span>
                      <span>{timeAgo(task.updatedAt)}</span>
                    </Typography>

                    {task.remarks && (
                      <Paper
                        variant="outlined"
                        sx={{
                          mt: 1,
                          p: 1.2,
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1f293730' : '#f8fafc',
                          borderRadius: 2,
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                          "{task.remarks}"
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                </Box>
              </motion.div>
            );
          })}
        </Stack>
      </Box>
    </motion.div>
  );
}
