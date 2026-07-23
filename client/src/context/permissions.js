export const PERMISSIONS = {
  superadmin: new Set([
    'project.create',
    'project.delete',
    'project.share',
    'task.edit',
    'task.delete',
    'task.assign',
    'task.status',
    'developer.manage',
    'csv.upload',
    'report.export',
    'report.export.pdf',
    'settings.view',
    'users.manage',
    'task.view',
    'task.search',
    'task.filter',
    'task.sort',
  ]),
  client: new Set([
    'task.view',
    'task.search',
    'task.filter',
    'task.sort',
  ]),
};

export function roleHasPermission(role, permission) {
  if (!role || !permission) return false;
  const set = PERMISSIONS[role];
  return Boolean(set && set.has(permission));
}
