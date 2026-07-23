import { useRole } from '../context/RoleContext';

export function usePermission(permission) {
  const { hasPermission } = useRole();
  return hasPermission(permission);
}

export default usePermission;
