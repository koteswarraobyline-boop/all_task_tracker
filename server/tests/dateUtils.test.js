const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseDateOnly,
  daysOverdue,
  daysUntilDue,
  diffCalendarDays,
} = require('../src/utils/dateUtils');

describe('dateUtils', () => {
  const today = parseDateOnly('2026-08-21');

  it('parses YYYY-MM-DD without UTC shift', () => {
    const d = parseDateOnly('2026-08-14');
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 7);
    assert.equal(d.getDate(), 14);
  });

  it('due today is not overdue', () => {
    assert.equal(daysOverdue('2026-08-21', today), 0);
  });

  it('one day overdue', () => {
    assert.equal(daysOverdue('2026-08-20', today), 1);
  });

  it('due tomorrow has one day remaining', () => {
    assert.equal(daysUntilDue('2026-08-22', today), 1);
  });

  it('returns null diff for missing dates', () => {
    assert.equal(diffCalendarDays(null, today), null);
  });
});
