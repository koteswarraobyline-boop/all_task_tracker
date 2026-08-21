/**
 * Date-only utilities — avoid UTC off-by-one for DATEONLY / YYYY-MM-DD values.
 */

function parseDateOnly(value) {
  if (value == null || value === '') return null;
  const str = String(value).slice(0, 10);
  const parts = str.split('-');
  if (parts.length === 3) {
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      const date = new Date(y, m - 1, d);
      date.setHours(0, 0, 0, 0);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function todayStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateOnly(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : parseDateOnly(date);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Whole calendar days from `from` to `to` (exclusive of time). Positive = to is later. */
function diffCalendarDays(from, to) {
  const a = parseDateOnly(from);
  const b = parseDateOnly(to);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Days overdue: positive when due date is before reference (default today). */
function daysOverdue(dueDate, referenceDate = todayStart()) {
  const due = parseDateOnly(dueDate);
  const ref = parseDateOnly(referenceDate) || todayStart(referenceDate);
  if (!due) return 0;
  const diff = diffCalendarDays(due, ref);
  return diff > 0 ? diff : 0;
}

/** Days until due: positive when due is in the future; negative when overdue. */
function daysUntilDue(dueDate, referenceDate = todayStart()) {
  const due = parseDateOnly(dueDate);
  const ref = parseDateOnly(referenceDate) || todayStart(referenceDate);
  if (!due) return null;
  return diffCalendarDays(ref, due);
}

module.exports = {
  parseDateOnly,
  todayStart,
  formatDateOnly,
  diffCalendarDays,
  daysOverdue,
  daysUntilDue,
};
