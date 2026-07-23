import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { roleHasPermission } from './permissions';

const RoleContext = createContext({
  role: null,
  clientMeta: null,
  project: null,
  hasPermission: () => false,
  loading: true,
  error: null,
  setClientSession: () => {},
  clearClientSession: () => {},
  logout: () => {},
  refreshAdminSession: () => {},
});

function parseJwt(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = parseJwt(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now();
}

export function RoleProvider({ children }) {
  const location = useLocation();
  const [role, setRole] = useState(null);
  const [clientMeta, setClientMeta] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshAdminSession = useCallback(() => {
    const token = localStorage.getItem('authToken');
    if (token && !isTokenExpired(token)) {
      setRole('superadmin');
      setClientMeta(null);
      setProject(null);
      setError(null);
      return true;
    }
    if (token) {
      localStorage.removeItem('authToken');
    }
    setRole(null);
    return false;
  }, []);

  const setClientSession = useCallback((meta, projectData) => {
    setRole('client');
    setClientMeta(meta);
    setProject(projectData || null);
    setError(null);
    setLoading(false);
  }, []);

  const clearClientSession = useCallback(() => {
    setClientMeta(null);
    setProject(null);
    setRole(null);
    if (!location.pathname.startsWith('/client/')) {
      refreshAdminSession();
    }
  }, [location.pathname, refreshAdminSession]);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    setRole(null);
    setClientMeta(null);
    setProject(null);
    setError(null);
  }, []);

  useEffect(() => {
    const isClientRoute = location.pathname.startsWith('/client/');

    if (isClientRoute) {
      // Clear admin session while on share links so project/role cannot bleed over
      setRole((prev) => (prev === 'superadmin' ? null : prev));
      setLoading(false);
      return;
    }

    setLoading(true);
    // Leaving client routes: drop share session
    setClientMeta(null);
    setProject(null);
    refreshAdminSession();
    setLoading(false);
  }, [location.pathname, refreshAdminSession]);

  const hasPermission = useCallback(
    (permission) => roleHasPermission(role, permission),
    [role]
  );

  const value = useMemo(
    () => ({
      role,
      clientMeta,
      project,
      hasPermission,
      loading,
      error,
      setError,
      setClientSession,
      clearClientSession,
      logout,
      refreshAdminSession,
    }),
    [
      role,
      clientMeta,
      project,
      hasPermission,
      loading,
      error,
      setClientSession,
      clearClientSession,
      logout,
      refreshAdminSession,
    ]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}

export default RoleContext;
