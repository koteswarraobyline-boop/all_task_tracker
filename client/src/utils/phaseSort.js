/**
 * Order phase labels as Phase 1, Phase 2, … Phase 10 (not lexicographic).
 * Unassigned / empty names go last; named phases without a number go after numbered ones.
 */
export function comparePhaseNames(a, b) {
  const rank = (name) => {
    const s = String(name || '').trim();
    if (!s || /^unassigned/i.test(s)) {
      return { bucket: 2, n: Number.POSITIVE_INFINITY, label: s.toLowerCase() };
    }
    const match = s.match(/(\d+)/);
    if (match) {
      return { bucket: 0, n: Number.parseInt(match[1], 10), label: s.toLowerCase() };
    }
    return { bucket: 1, n: Number.POSITIVE_INFINITY, label: s.toLowerCase() };
  };

  const left = rank(a);
  const right = rank(b);
  if (left.bucket !== right.bucket) return left.bucket - right.bucket;
  if (left.n !== right.n) return left.n - right.n;
  return left.label.localeCompare(right.label, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}
