const { getTaskProgressPercent } = require('../services/taskProgressService');
const { getTaskScheduleHealth } = require('../services/projectHealthService');

/**
 * Client-safe task — strips all internal/admin fields at the API layer.
 */
function toClientTask(task, now) {
  const plain = task?.toJSON ? task.toJSON() : { ...task };
  const schedule = getTaskScheduleHealth(plain, now);
  const progress = getTaskProgressPercent(plain);

  let publicStatusNote = null;
  if (plain.status === 'Blocked') {
    publicStatusNote = 'This work item is currently blocked and may affect the schedule.';
  } else if (plain.status === 'On Hold') {
    publicStatusNote = 'This work item is on hold and may affect the schedule.';
  }

  return {
    id: plain.id,
    taskId: plain.taskId,
    taskName: plain.taskName,
    description: plain.description || null,
    module: plain.module || null,
    phase: plain.phase || null,
    status: plain.status,
    progressPercent: progress,
    startDate: plain.startDate || null,
    dueDate: plain.dueDate || null,
    recordType: plain.recordType || 'task',
    parentId: plain.parentId || null,
    scheduleStatus: schedule.scheduleStatus,
    daysBehindSchedule: schedule.daysLate,
    isOverdue: schedule.isOverdue,
    publicStatusNote,
    updatedAt: plain.updatedAt || null,
  };
}

function toClientTasks(tasks, now) {
  return (tasks || [])
    .filter((t) => t.recordType !== 'module')
    .map((t) => toClientTask(t, now));
}

module.exports = {
  toClientTask,
  toClientTasks,
};
