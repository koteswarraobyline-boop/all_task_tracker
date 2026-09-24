import React, { useMemo } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import {
  CalendarMonthOutlined as CalendarIcon,
  TrendingUp as TrendingIcon,
  AccessTime as ClockIcon,
  ChevronRight as ChevronIcon,
} from '@mui/icons-material';
import { tokens } from '../theme';
import SimpleDonutChart from './SimpleDonutChart';

function fmtMile(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

function shortName(name, index) {
  if (!name) return `Phase ${index + 1}`;
  const cut = String(name).split(/\s+[–—-]\s+/)[0].trim();
  return cut.length > 16 ? `${cut.slice(0, 14)}…` : cut;
}

/**
 * Mockup-matched program schedule + KPI row (app theme #4F46E5).
 */
export default function ProgramPhaseTimeline({ phases = [], metrics = {} }) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const dated = phases.filter((p) => p.rangeStart && p.rangeEnd);
  let programStart = metrics.kickoff ? new Date(metrics.kickoff) : null;
  let programEnd = metrics.finalDelivery ? new Date(metrics.finalDelivery) : null;
  if (!programStart && dated.length) {
    programStart = new Date(Math.min(...dated.map((p) => new Date(p.rangeStart).getTime())));
  }
  if (!programEnd && dated.length) {
    programEnd = new Date(Math.max(...dated.map((p) => new Date(p.rangeEnd).getTime())));
  }

  const spanMs =
    programStart && programEnd && programEnd > programStart ? programEnd - programStart : 0;
  let todayPct = null;
  if (spanMs > 0) {
    todayPct = Math.max(0, Math.min(100, ((today - programStart) / spanMs) * 100));
  }

  const overall = Math.min(100, Number(metrics.overall) || 0);
  const donutData = [
    { key: 'done', color: tokens.colors.primary, count: Math.max(overall, 0.01) },
    { key: 'rest', color: tokens.colors.progressTrack, count: Math.max(100 - overall, 0.01) },
  ];

  // Highlight first in-progress phase, else first phase
  const activeIdx = (() => {
    const ip = phases.findIndex(
      (p) => (Number(p.progress) || 0) > 0 && (Number(p.progress) || 0) < 100
    );
    if (ip >= 0) return ip;
    const done = phases.findIndex((p) => (Number(p.progress) || 0) >= 100);
    if (done >= 0 && done < phases.length - 1) return done + 1;
    return 0;
  })();

  if (!phases.length) return null;

  return (
    <Stack spacing={1.5} sx={{ mb: 1.5 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderRadius: `${tokens.radius.card}px`,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: tokens.shadow.card,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} mb={0.35}>
          <CalendarIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography sx={{ fontWeight: 650, fontSize: '0.9375rem', color: 'text.primary' }}>
            Program schedule
          </Typography>
        </Stack>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mb: 1.75, ml: 3.5 }}>
          Kick-off {fmtMile(metrics.kickoff)} · Delivery {fmtMile(metrics.finalDelivery)}
        </Typography>

        {/* Phase mini-cards with chevrons (mockup 1) */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            overflowX: 'auto',
            pb: 0.5,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
          }}
        >
          {phases.map((p, i) => {
            const active = i === activeIdx;
            return (
              <React.Fragment key={p.id}>
                {i > 0 && (
                  <ChevronIcon
                    sx={{
                      fontSize: 18,
                      color: 'text.disabled',
                      flexShrink: 0,
                    }}
                  />
                )}
                <Box
                  sx={{
                    flex: '1 1 0',
                    minWidth: 108,
                    maxWidth: 150,
                    px: 1.25,
                    py: 1.1,
                    borderRadius: `${tokens.radius.button}px`,
                    border: '1.5px solid',
                    borderColor: active ? 'primary.main' : 'divider',
                    bgcolor: active ? tokens.colors.primarySoft : 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    transition: tokens.motion.fast,
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      bgcolor: active ? 'primary.main' : tokens.colors.primarySoft,
                      color: active ? '#fff' : 'primary.main',
                    }}
                  >
                    {i + 1}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 650,
                        fontSize: '0.75rem',
                        color: 'text.primary',
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={p.name}
                    >
                      {shortName(p.name, i)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.625rem', color: 'text.secondary', mt: 0.15 }}>
                      {p.rangeStart && p.rangeEnd
                        ? `${fmtMile(p.rangeStart)} – ${fmtMile(p.rangeEnd)}`
                        : 'No dates'}
                    </Typography>
                  </Box>
                </Box>
              </React.Fragment>
            );
          })}
        </Box>

        {/* Today track */}
        <Box sx={{ position: 'relative', mt: 2.25, mx: 0.5, height: 22 }}>
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 8,
              height: 3,
              borderRadius: 2,
              bgcolor: tokens.colors.progressTrack,
            }}
          />
          {todayPct != null && (
            <Box
              sx={{
                position: 'absolute',
                left: `${todayPct}%`,
                top: 4,
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  border: '2px solid #fff',
                  boxShadow: `0 0 0 2px ${tokens.colors.primary}`,
                }}
              />
              <Typography
                sx={{
                  mt: 0.35,
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: 'primary.main',
                }}
              >
                Today
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* KPI cards — separate white cards (reference layout) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 1.25,
        }}
      >
        <KpiCard>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 56, height: 56, flexShrink: 0, position: 'relative' }}>
              <SimpleDonutChart
                data={donutData}
                size={56}
                innerRadius={18}
                outerRadius={26}
                paddingAngle={0}
              />
              <Typography
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  color: 'primary.main',
                }}
              >
                {overall}%
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 500 }}>
                Complete
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', color: tokens.colors.text }}>
                {metrics.done ?? 0} / {metrics.tasks ?? 0}
              </Typography>
            </Box>
          </Stack>
        </KpiCard>

        <KpiCard>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <IconBubble color={tokens.colors.primarySoft} iconColor={tokens.colors.primary}>
              <TrendingIcon sx={{ fontSize: 20 }} />
            </IconBubble>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 500 }}>
                In progress
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.35rem', color: tokens.colors.text }}>
                {metrics.inProgress ?? 0}
              </Typography>
            </Box>
          </Stack>
        </KpiCard>

        <KpiCard>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <IconBubble color="#F1F5F9" iconColor={tokens.colors.textSecondary}>
              <CalendarIcon sx={{ fontSize: 20 }} />
            </IconBubble>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 500 }}>
                Days left
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.35rem', color: tokens.colors.text }}>
                {metrics.daysToDelivery == null ? '—' : metrics.daysToDelivery}
              </Typography>
            </Box>
          </Stack>
        </KpiCard>

        <KpiCard>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <IconBubble color={tokens.colors.dangerBg} iconColor={tokens.colors.danger}>
              <ClockIcon sx={{ fontSize: 20 }} />
            </IconBubble>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 500 }}>
                Past due
              </Typography>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '1.35rem',
                  color: tokens.colors.danger,
                }}
              >
                {metrics.pastDue ?? 0}
              </Typography>
            </Box>
          </Stack>
        </KpiCard>
      </Box>
    </Stack>
  );
}

function KpiCard({ children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.75,
        borderRadius: `${tokens.radius.card}px`,
        border: '1px solid',
        borderColor: tokens.colors.border,
        bgcolor: tokens.colors.card,
        boxShadow: tokens.shadow.card,
        height: '100%',
      }}
    >
      {children}
    </Paper>
  );
}

function IconBubble({ children, color, iconColor }) {
  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: `${tokens.radius.button}px`,
        bgcolor: color,
        color: iconColor,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}
