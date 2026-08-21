export const DELIVERY_STATUS = {
  ON_TRACK: 'ON_TRACK',
  AT_RISK: 'AT_RISK',
  DUE_SOON: 'DUE_SOON',
  OVERDUE: 'OVERDUE',
  COMPLETED: 'COMPLETED',
};

export const DELIVERY_STATUS_LABELS = {
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  DUE_SOON: 'Due Soon',
  OVERDUE: 'Overdue',
  COMPLETED: 'Completed',
};

export const DELIVERY_STATUS_COLORS = {
  ON_TRACK: { bg: '#D1FAE5', color: '#047857', border: '#A7F3D0' },
  AT_RISK: { bg: '#FFEDD5', color: '#C2410C', border: '#FED7AA' },
  DUE_SOON: { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  OVERDUE: { bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA' },
  COMPLETED: { bg: '#DBEAFE', color: '#1D4ED8', border: '#BFDBFE' },
};

export function deliveryStatusLabel(status) {
  return DELIVERY_STATUS_LABELS[status] || status || 'Unknown';
}

export function formatShortDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export function deliveryTimingText(projectOrAnalysis) {
  const status = projectOrAnalysis?.deliveryStatus;
  const daysOverdue = projectOrAnalysis?.daysOverdue ?? projectOrAnalysis?.projectOverdueDays ?? 0;
  const daysRemaining = projectOrAnalysis?.daysRemaining;

  if (status === 'COMPLETED') return 'Completed';
  if (status === 'OVERDUE' || projectOrAnalysis?.isProjectOverdue) {
    return `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} late`;
  }
  if (status === 'DUE_SOON' && daysRemaining != null) {
    return `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`;
  }
  if (daysRemaining != null && daysRemaining >= 0) {
    return `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`;
  }
  return deliveryStatusLabel(status);
}
