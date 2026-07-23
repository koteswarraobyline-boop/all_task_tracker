export function getDeveloperDisplayName(dev) {
  if (!dev) return 'Unassigned';
  const raw = (dev.name || '').trim();
  const email = (dev.email || '').trim();

  const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const fromLocalPart = (value) => {
    const local = value.split('@')[0] || '';
    return local
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  if (raw && !looksLikeEmail(raw)) return raw;
  if (raw && looksLikeEmail(raw)) return fromLocalPart(raw) || raw;
  if (email) return fromLocalPart(email) || email;
  return 'Unassigned';
}
