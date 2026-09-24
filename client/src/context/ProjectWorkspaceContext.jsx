import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const ProjectWorkspaceContext = createContext(null);

function unlockStorageKey(projectId) {
  return `tt_edit_unlocked_${projectId}`;
}

function viewAsStorageKey(projectId) {
  return `tt_view_as_${projectId}`;
}

export function ProjectWorkspaceProvider({ projectId, children }) {
  const [viewAs, setViewAsState] = useState(() => {
    if (!projectId) return null;
    const raw = sessionStorage.getItem(viewAsStorageKey(projectId));
    return raw || null;
  });
  const [unlocked, setUnlockedState] = useState(() => {
    if (!projectId) return false;
    return sessionStorage.getItem(unlockStorageKey(projectId)) === '1';
  });
  const [wbs, setWbs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unlockOpen, setUnlockOpen] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    const raw = sessionStorage.getItem(viewAsStorageKey(projectId));
    setViewAsState(raw || null);
    setUnlockedState(sessionStorage.getItem(unlockStorageKey(projectId)) === '1');
  }, [projectId]);

  const setViewAs = useCallback(
    (developerId) => {
      const next = developerId ? String(developerId) : null;
      setViewAsState(next);
      if (!projectId) return;
      if (next) sessionStorage.setItem(viewAsStorageKey(projectId), next);
      else sessionStorage.removeItem(viewAsStorageKey(projectId));
    },
    [projectId]
  );

  const lock = useCallback(() => {
    setUnlockedState(false);
    if (projectId) sessionStorage.removeItem(unlockStorageKey(projectId));
  }, [projectId]);

  const unlockWithPassword = useCallback(
    async (password) => {
      if (!projectId) throw new Error('No project');
      await api.unlockProjectEditing(projectId, password);
      setUnlockedState(true);
      sessionStorage.setItem(unlockStorageKey(projectId), '1');
      setUnlockOpen(false);
      return true;
    },
    [projectId]
  );

  const loadWbs = useCallback(
    async ({ forceSync = false } = {}) => {
      if (!projectId) return null;
      setLoading(true);
      setError(null);
      try {
        const data = await api.getProjectWbs(projectId, {
          viewAs: viewAs || undefined,
          sync: forceSync ? 1 : undefined,
        });
        setWbs(data);
        return data;
      } catch (err) {
        const msg = err.response?.data?.error || err.message || 'Failed to load project plan';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [projectId, viewAs]
  );

  useEffect(() => {
    if (!projectId) return;
    loadWbs().catch(() => {});
  }, [projectId, viewAs, loadWbs]);

  const canEdit = unlocked;

  const value = useMemo(
    () => ({
      projectId,
      viewAs,
      setViewAs,
      unlocked,
      canEdit,
      lock,
      unlockWithPassword,
      unlockOpen,
      setUnlockOpen,
      wbs,
      loading,
      error,
      loadWbs,
      refresh: () => loadWbs({ forceSync: true }),
    }),
    [
      projectId,
      viewAs,
      setViewAs,
      unlocked,
      canEdit,
      lock,
      unlockWithPassword,
      unlockOpen,
      wbs,
      loading,
      error,
      loadWbs,
    ]
  );

  return (
    <ProjectWorkspaceContext.Provider value={value}>{children}</ProjectWorkspaceContext.Provider>
  );
}

export function useProjectWorkspace() {
  const ctx = useContext(ProjectWorkspaceContext);
  if (!ctx) {
    throw new Error('useProjectWorkspace must be used within ProjectWorkspaceProvider');
  }
  return ctx;
}

/** Safe hook when provider may be absent */
export function useProjectWorkspaceOptional() {
  return useContext(ProjectWorkspaceContext);
}

export default ProjectWorkspaceContext;
