import React from 'react';
import { usePermission } from '../hooks/usePermission';

/**
 * Renders children only when the current role holds the permission.
 * Example: <Can permission="task.edit">...</Can>
 */
export function Can({ permission, children, fallback = null }) {
  const allowed = usePermission(permission);
  return allowed ? children : fallback;
}

export default Can;
