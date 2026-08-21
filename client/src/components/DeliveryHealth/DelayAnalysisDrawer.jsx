import React from 'react';
import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import ProjectHealthBadge from './ProjectHealthBadge';
import DelayDriverCard from './DelayDriverCard';
import DeliveryHealthCard from './DeliveryHealthCard';
import { deliveryTimingText, formatShortDate } from '../../utils/deliveryHealth';

export default function DelayAnalysisDrawer({ open, onClose, analysis }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!analysis) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: isMobile ? '100%' : 480,
          maxWidth: '100%',
          p: 0,
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, pb: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>Delay Analysis</Typography>
        <IconButton onClick={onClose} aria-label="Close delay analysis">
          <CloseIcon />
        </IconButton>
      </Stack>

      <Box sx={{ px: 2, pb: 3, overflow: 'auto' }}>
        <DeliveryHealthCard analysis={analysis} compact sx={{ mb: 2.5 }} />

        <Section title="Delivery Summary">
          <SummaryRow label="Status" value={<ProjectHealthBadge status={analysis.deliveryStatus} />} />
          <SummaryRow label="Target date" value={formatShortDate(analysis.deliveryDate)} />
          <SummaryRow label="Timing" value={deliveryTimingText(analysis)} />
          <SummaryRow label="Completion" value={`${analysis.completionPercent ?? 0}%`} />
          {analysis.estimatedCompletion && (
            <SummaryRow
              label="Estimated completion"
              value={formatShortDate(analysis.estimatedCompletion)}
            />
          )}
          {analysis.projectedDelayDays > 0 && (
            <SummaryRow label="Projected delay" value={`${analysis.projectedDelayDays} days`} />
          )}
        </Section>

        {analysis.primaryDelayDriver && (
          <Section title="Primary Delay Driver">
            <DelayDriverCard task={analysis.primaryDelayDriver} variant="primary" />
          </Section>
        )}

        {(analysis.majorContributors || []).length > 0 && (
          <Section title="Major Contributors">
            <Stack spacing={1.5}>
              {analysis.majorContributors.map((task) => (
                <DelayDriverCard key={task.id || task.taskId} task={task} variant="contributor" />
              ))}
            </Stack>
          </Section>
        )}

        <Section title="Delay Breakdown">
          <Stack spacing={0.75}>
            {(analysis.riskFactors || []).map((factor) => (
              <Typography key={factor} sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                • {factor}
              </Typography>
            ))}
            {analysis.summary && (
              <Typography sx={{ fontSize: '0.8125rem', mt: 1 }}>{analysis.summary}</Typography>
            )}
          </Stack>
        </Section>

        {(analysis.recommendations || []).length > 0 && (
          <Section title="Recommended Actions">
            <List dense disablePadding>
              {analysis.recommendations.map((rec) => (
                <ListItem key={rec} disableGutters sx={{ alignItems: 'flex-start' }}>
                  <ListItemText
                    primary={rec}
                    primaryTypographyProps={{ fontSize: '0.8125rem', lineHeight: 1.5 }}
                  />
                </ListItem>
              ))}
            </List>
          </Section>
        )}

        {(analysis.otherLateWork || []).length > 0 && (
          <Section title="Other Late Work">
            <Stack spacing={1}>
              {analysis.otherLateWork.map((task) => (
                <Box
                  key={task.id || task.taskId}
                  sx={{
                    p: 1.25,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>{task.taskName}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {task.overdueDays > 0 ? `${task.overdueDays} days overdue · ` : ''}
                    {task.progress}% complete
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Section>
        )}
      </Box>
    </Drawer>
  );
}

function Section({ title, children }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', mb: 1.25 }}>{title}</Typography>
      {children}
      <Divider sx={{ mt: 2 }} />
    </Box>
  );
}

function SummaryRow({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{label}</Typography>
      <Box sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>{value}</Box>
    </Stack>
  );
}
