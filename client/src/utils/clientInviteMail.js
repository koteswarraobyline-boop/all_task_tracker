/**
 * Build a mailto: URL to send a client their project share link.
 * Opens the user's mail app — no server SMTP required.
 */
export function buildClientInviteMailto({
  to,
  clientName,
  projectName,
  shareUrl,
  passwordProtected = false,
}) {
  const email = String(to || '').trim();
  if (!email || !shareUrl) return null;

  const who = clientName ? String(clientName).trim() : 'there';
  const project = projectName ? String(projectName).trim() : 'the project';
  const subject = `Access link for ${project}`;
  const lines = [
    `Hi ${who},`,
    '',
    `You have been invited to view “${project}” in Task Tracker (read-only).`,
    '',
    `Open this secure link:`,
    shareUrl,
    '',
  ];
  if (passwordProtected) {
    lines.push('This link is password protected. Use the password shared with you separately.', '');
  }
  lines.push('If you have questions, reply to this email.', '', 'Thanks');

  const body = lines.join('\n');
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function openClientInviteEmail(opts) {
  const href = buildClientInviteMailto(opts);
  if (!href) return false;
  window.location.href = href;
  return true;
}
