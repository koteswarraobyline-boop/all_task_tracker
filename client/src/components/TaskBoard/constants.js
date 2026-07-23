export const ALL_STATUSES = [
  'Upcoming',
  'Assigned',
  'In Development',
  'Code Review',
  'Testing',
  'Completed',
  'Blocked',
  'On Hold',
];

export const STATUS_LABELS = {
  Upcoming: 'Planned',
  Assigned: 'Assigned',
  'In Development': 'In Development',
  'Code Review': 'Code Review',
  Testing: 'Testing',
  Completed: 'Completed',
  Blocked: 'Blocked',
  'On Hold': 'On Hold',
  Planned: 'Planned',
};

export const PRIORITY_BADGES_LIGHT = {
  P0: { color: '#EF4444', bgcolor: '#FEF2F2', borderColor: '#FCA5A5' },
  P1: { color: '#D97706', bgcolor: '#FEF3C7', borderColor: '#FDE047' },
  P2: { color: '#2563EB', bgcolor: '#EFF6FF', borderColor: '#BFDBFE' },
  P3: { color: '#059669', bgcolor: '#ECFDF5', borderColor: '#A7F3D0' },
  High: { color: '#EF4444', bgcolor: '#FEF2F2', borderColor: '#FCA5A5' },
  Medium: { color: '#D97706', bgcolor: '#FEF3C7', borderColor: '#FDE047' },
  Low: { color: '#059669', bgcolor: '#ECFDF5', borderColor: '#A7F3D0' },
};

export const PRIORITY_BADGES_DARK = {
  P0: { color: '#FCA5A5', bgcolor: '#450a0a', borderColor: '#7f1d1d' },
  P1: { color: '#FCD34D', bgcolor: '#451a03', borderColor: '#92400e' },
  P2: { color: '#93C5FD', bgcolor: '#1e3a8a', borderColor: '#1e40af' },
  P3: { color: '#6EE7B7', bgcolor: '#064e3b', borderColor: '#065f46' },
  High: { color: '#FCA5A5', bgcolor: '#450a0a', borderColor: '#7f1d1d' },
  Medium: { color: '#FCD34D', bgcolor: '#451a03', borderColor: '#92400e' },
  Low: { color: '#6EE7B7', bgcolor: '#064e3b', borderColor: '#065f46' },
};

export const PHASE_ACCENTS = [
  '#6366F1',
  '#0EA5E9',
  '#8B5CF6',
  '#F59E0B',
  '#10B981',
  '#EC4899',
  '#14B8A6',
  '#F97316',
];

export function getStatusStyle(statusVal, isDark = false) {
  const map = {
    Completed: isDark
      ? { bgcolor: '#064e3b', color: '#6EE7B7', border: '1px solid #065f46', text: 'Completed' }
      : { bgcolor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', text: 'Completed' },
    'In Development': isDark
      ? { bgcolor: '#1e3a8a', color: '#93C5FD', border: '1px solid #1e40af', text: 'In Development' }
      : { bgcolor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', text: 'In Development' },
    Testing: isDark
      ? { bgcolor: '#581c87', color: '#D8B4FE', border: '1px solid #6b21a8', text: 'Testing' }
      : { bgcolor: '#FAF5FF', color: '#9333EA', border: '1px solid #E9D5FF', text: 'Testing' },
    'Code Review': isDark
      ? { bgcolor: '#312e81', color: '#A5B4FC', border: '1px solid #3730a3', text: 'Code Review' }
      : { bgcolor: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE', text: 'Code Review' },
    Blocked: isDark
      ? { bgcolor: '#450a0a', color: '#FCA5A5', border: '1px solid #7f1d1d', text: 'Blocked' }
      : { bgcolor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', text: 'Blocked' },
    'On Hold': isDark
      ? { bgcolor: '#7c2d12', color: '#FDBA74', border: '1px solid #9a3412', text: 'On Hold' }
      : { bgcolor: '#FFF7ED', color: '#EA580C', border: '1px solid #FFEDD5', text: 'On Hold' },
    Assigned: isDark
      ? { bgcolor: '#1e3a8a', color: '#93C5FD', border: '1px solid #1e40af', text: 'Assigned' }
      : { bgcolor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', text: 'Assigned' },
    Upcoming: isDark
      ? { bgcolor: '#1f2937', color: '#94A3B8', border: '1px solid #334155', text: 'Planned' }
      : { bgcolor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', text: 'Planned' },
    Planned: isDark
      ? { bgcolor: '#1f2937', color: '#94A3B8', border: '1px solid #334155', text: 'Planned' }
      : { bgcolor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', text: 'Planned' },
  };
  return (
    map[statusVal] || {
      bgcolor: isDark ? '#1f2937' : '#F8FAFC',
      color: isDark ? '#94A3B8' : '#64748B',
      border: isDark ? '1px solid #334155' : '1px solid #E2E8F0',
      text: statusVal || '—',
    }
  );
}

export function phaseAccent(index) {
  return PHASE_ACCENTS[index % PHASE_ACCENTS.length];
}
