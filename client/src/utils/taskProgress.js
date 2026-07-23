/** Progress % derived from workflow status when no explicit Progress % is set. */
export const STATUS_PROGRESS = {
  Upcoming: 0,
  Assigned: 15,
  'In Development': 40,
  'Code Review': 60,
  Testing: 80,
  Completed: 100,
  Blocked: 25,
  'On Hold': 20,
};

export function progressFromStatus(status) {
  if (!status) return 0;
  return STATUS_PROGRESS[status] ?? 0;
}

/**
 * Prefer explicit progressPercent; otherwise map from status.
 * Hours-based progress is not used here so the bar tracks workflow status.
 */
export function getTaskProgressPercent(taskOrStatus, progressPercent) {
  if (typeof taskOrStatus === 'string') {
    const explicit =
      progressPercent !== null && progressPercent !== undefined && progressPercent !== ''
        ? Number(progressPercent)
        : NaN;
    if (!Number.isNaN(explicit)) return Math.min(100, Math.max(0, Math.round(explicit)));
    return progressFromStatus(taskOrStatus);
  }

  const task = taskOrStatus || {};
  const explicit =
    task.progressPercent !== null && task.progressPercent !== undefined && task.progressPercent !== ''
      ? Number(task.progressPercent)
      : NaN;
  if (!Number.isNaN(explicit)) return Math.min(100, Math.max(0, Math.round(explicit)));
  return progressFromStatus(task.status);
}

export function progressBarColor(pct) {
  if (pct >= 100) return 'success';
  if (pct >= 60) return 'info';
  if (pct >= 40) return 'primary';
  if (pct > 0) return 'warning';
  return 'inherit';
}
