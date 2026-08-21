/** Mirrors client/src/utils/taskProgress.js — explicit progressPercent wins over status defaults. */

const STATUS_PROGRESS = {
  Upcoming: 0,
  Assigned: 15,
  'In Development': 40,
  Testing: 80,
  Completed: 100,
  Blocked: 25,
  'On Hold': 20,
  'Code Review': 80,
};

function progressFromStatus(status) {
  if (!status) return 0;
  return STATUS_PROGRESS[status] ?? 0;
}

function getTaskProgressPercent(taskOrStatus, progressPercent) {
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

function isTaskComplete(task) {
  return task?.status === 'Completed' || getTaskProgressPercent(task) >= 100;
}

module.exports = {
  STATUS_PROGRESS,
  progressFromStatus,
  getTaskProgressPercent,
  isTaskComplete,
};
