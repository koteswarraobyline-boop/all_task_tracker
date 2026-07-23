import { useParams, matchPath, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext';

/**
 * Resolves the active project id for both admin routes (/projects/:id/...)
 * and client share routes (/client/:token/...), without exposing IDs in client URLs.
 * Clients are locked to clientMeta.projectId from the share token — never overridden.
 */
export function useProjectId() {
  const { id } = useParams();
  const location = useLocation();
  const { role, clientMeta } = useRole();

  if (role === 'client') {
    return clientMeta?.projectId != null ? String(clientMeta.projectId) : null;
  }

  if (id) return String(id);

  const match = matchPath('/projects/:id/*', location.pathname);
  return match?.params?.id ? String(match.params.id) : null;
}

export default useProjectId;
