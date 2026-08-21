const { parseDateOnly, todayStart, daysOverdue, daysUntilDue, formatDateOnly } = require('../utils/dateUtils');

/**
 * Central delivery-date resolution.
 *
 * Priority: targetDeliveryDate → revisedDeliveryDate → originalDeliveryDate → latest task due date.
 * `activeDeliveryDate` is the single source of truth for schedule comparisons.
 */
function resolveDeliveryDates(project = {}, taskDueDates = []) {
  const sortedDueDates = [...taskDueDates].filter(Boolean).sort();
  const fallbackDue = sortedDueDates.length ? sortedDueDates[sortedDueDates.length - 1] : null;

  const originalDeliveryDate = project.originalDeliveryDate || fallbackDue || null;
  const revisedDeliveryDate = project.revisedDeliveryDate || null;
  const storedTarget = project.targetDeliveryDate || null;
  const targetDeliveryDate =
    storedTarget || revisedDeliveryDate || originalDeliveryDate || fallbackDue || null;
  const activeDeliveryDate = targetDeliveryDate;

  return {
    originalDeliveryDate,
    revisedDeliveryDate,
    targetDeliveryDate,
    activeDeliveryDate,
    /** @deprecated use activeDeliveryDate */
    effectiveDueDate: activeDeliveryDate,
    isProjectExtended: Boolean(revisedDeliveryDate),
  };
}

function getDeliveryTiming(activeDeliveryDate, isComplete, now = todayStart()) {
  if (!activeDeliveryDate) {
    return {
      daysRemaining: null,
      daysOverdue: 0,
      isOverdue: false,
      isDueSoon: false,
    };
  }

  const daysRemaining = daysUntilDue(activeDeliveryDate, now);
  const overdue = !isComplete && daysRemaining !== null && daysRemaining < 0;
  const overdueDays = overdue ? daysOverdue(activeDeliveryDate, now) : 0;
  const isDueSoon =
    !isComplete && !overdue && daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;

  return {
    daysRemaining: isComplete ? 0 : daysRemaining,
    daysOverdue: overdueDays,
    isOverdue: overdue,
    isDueSoon,
  };
}

function syncTargetOnRevisedUpdate(updates) {
  if (updates.revisedDeliveryDate !== undefined && updates.targetDeliveryDate === undefined) {
    updates.targetDeliveryDate = updates.revisedDeliveryDate || null;
  }
  return updates;
}

module.exports = {
  resolveDeliveryDates,
  getDeliveryTiming,
  syncTargetOnRevisedUpdate,
  parseDateOnly,
  formatDateOnly,
  todayStart,
};
