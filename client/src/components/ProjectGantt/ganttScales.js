/**
 * Scale presets for Day / Week / Month / Quarter timeline views.
 * Compatible with @svar-ui/react-gantt IScaleConfig.
 */

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function weekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function quarter(date) {
  return Math.floor(date.getMonth() / 3) + 1;
}

export const VIEW_PRESETS = {
  day: {
    id: 'day',
    label: 'Day',
    lengthUnit: 'day',
    cellWidth: 48,
    scales: [
      { unit: 'month', step: 1, format: (d) => `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}` },
      { unit: 'day', step: 1, format: (d) => String(d.getDate()) },
    ],
  },
  week: {
    id: 'week',
    label: 'Week',
    lengthUnit: 'week',
    cellWidth: 88,
    scales: [
      { unit: 'month', step: 1, format: (d) => `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}` },
      { unit: 'week', step: 1, format: (d) => `W${weekNumber(d)}` },
    ],
  },
  month: {
    id: 'month',
    label: 'Month',
    lengthUnit: 'month',
    cellWidth: 110,
    scales: [
      { unit: 'year', step: 1, format: (d) => String(d.getFullYear()) },
      { unit: 'month', step: 1, format: (d) => MONTHS_SHORT[d.getMonth()] },
    ],
  },
  quarter: {
    id: 'quarter',
    label: 'Quarter',
    lengthUnit: 'quarter',
    cellWidth: 160,
    scales: [
      { unit: 'year', step: 1, format: (d) => String(d.getFullYear()) },
      { unit: 'quarter', step: 1, format: (d) => `Q${quarter(d)}` },
    ],
  },
};

/** Zoom levels used by SVAR's built-in zoom (scroll / controls). */
export const ZOOM_LEVELS = [
  {
    minCellWidth: 28,
    maxCellWidth: 48,
    scales: VIEW_PRESETS.day.scales,
  },
  {
    minCellWidth: 44,
    maxCellWidth: 80,
    scales: VIEW_PRESETS.week.scales,
  },
  {
    minCellWidth: 60,
    maxCellWidth: 110,
    scales: VIEW_PRESETS.month.scales,
  },
  {
    minCellWidth: 100,
    maxCellWidth: 180,
    scales: VIEW_PRESETS.quarter.scales,
  },
];
