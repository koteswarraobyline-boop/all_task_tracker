import axios from 'axios';

/** Same-origin /api works in dev (Vite proxy) and prod (Express serves dist). */
function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) {
    return String(configured).replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:5004/api';
}

const API_BASE_URL = resolveApiBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const url = config.url || '';
  const isClientShare = url.includes('/client/');
  if (isClientShare) {
    // Share links must not use admin JWT (avoids wrong-project / role bleed)
    if (config.headers) {
      delete config.headers.Authorization;
      delete config.headers.authorization;
    }
    return config;
  }
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLogin = error.config?.url?.includes('/auth/login');
      const isClientToken = error.config?.url?.includes('/client/');
      if (!isLogin && !isClientToken && localStorage.getItem('authToken')) {
        localStorage.removeItem('authToken');
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/client/')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  login: async (username, password) => {
    const response = await apiClient.post('/auth/login', { username, password });
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Projects
  getProjects: async () => {
    const response = await apiClient.get('/projects');
    return response.data;
  },

  uploadProject: async (formData) => {
    const response = await apiClient.post('/projects/upload', formData, {
      // Must not send application/json — browser needs to set multipart boundary
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  },

  updateProject: async (id, data) => {
    const response = await apiClient.put(`/projects/${id}`, data);
    return response.data;
  },

  deleteProject: async (id) => {
    const response = await apiClient.delete(`/projects/${id}`);
    return response.data;
  },

  updateProjectDeliveryDate: async (id, data) => {
    const response = await apiClient.put(`/projects/${id}/delivery-date`, data);
    return response.data;
  },

  getProjectDelayAnalysis: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/delay-analysis`);
    return response.data;
  },

  // Tasks
  getProjectTasks: async (projectId, params = {}) => {
    const response = await apiClient.get(`/projects/${projectId}/tasks`, { params });
    return response.data;
  },

  createTask: async (projectId, data) => {
    const response = await apiClient.post(`/projects/${projectId}/tasks`, data);
    return response.data;
  },

  updateTask: async (taskId, data) => {
    const response = await apiClient.put(`/tasks/${taskId}`, data);
    return response.data;
  },

  deleteTask: async (taskId) => {
    const response = await apiClient.delete(`/tasks/${taskId}`);
    return response.data;
  },

  deleteModule: async (projectId, moduleKey) => {
    const response = await apiClient.delete(
      `/projects/${projectId}/modules/${encodeURIComponent(moduleKey)}`
    );
    return response.data;
  },

  // Developers
  getDevelopers: async () => {
    const response = await apiClient.get('/developers');
    return response.data;
  },

  getDeveloper: async (id) => {
    const response = await apiClient.get(`/developers/${id}`);
    return response.data;
  },

  createDeveloper: async (data) => {
    const response = await apiClient.post('/developers', data);
    return response.data;
  },

  updateDeveloper: async (id, data) => {
    const response = await apiClient.put(`/developers/${id}`, data);
    return response.data;
  },

  deleteDeveloper: async (id) => {
    const response = await apiClient.delete(`/developers/${id}`);
    return response.data;
  },

  // Dashboard
  getProjectDashboard: async (projectId) => {
    const response = await apiClient.get(`/dashboard/${projectId}`);
    return response.data;
  },

  getGlobalDashboard: async () => {
    const response = await apiClient.get('/dashboard/global');
    return response.data;
  },

  // Client share links
  getClientProject: async (token, password) => {
    const config = {};
    if (password) {
      config.headers = { 'x-share-password': password };
    }
    const response = await apiClient.get(`/client/${token}`, config);
    return response.data;
  },

  getClientTasks: async (token, password) => {
    const config = {};
    if (password) {
      config.headers = { 'x-share-password': password };
    }
    const response = await apiClient.get(`/client/${token}/tasks`, config);
    return response.data;
  },

  getClientTaskCollab: async (token, taskId, password) => {
    const config = {};
    if (password) {
      config.headers = { 'x-share-password': password };
    }
    const response = await apiClient.get(`/client/${token}/tasks/${taskId}/collab`, config);
    return response.data;
  },

  createClientTaskComment: async (token, taskId, data, password) => {
    const config = {};
    if (password) {
      config.headers = { 'x-share-password': password };
    }
    const response = await apiClient.post(`/client/${token}/tasks/${taskId}/comments`, data, config);
    return response.data;
  },

  listClientAccess: async (params = {}) => {
    const response = await apiClient.get('/client-access', { params });
    return response.data;
  },

  createClientAccess: async (data) => {
    const response = await apiClient.post('/client-access', data);
    return response.data;
  },

  updateClientAccess: async (id, data) => {
    const response = await apiClient.put(`/client-access/${id}`, data);
    return response.data;
  },

  regenerateClientAccess: async (id) => {
    const response = await apiClient.post(`/client-access/${id}/regenerate`);
    return response.data;
  },

  deleteClientAccess: async (id) => {
    const response = await apiClient.delete(`/client-access/${id}`);
    return response.data;
  },

  /** Download project task export (csv | xlsx | pdf) from API */
  downloadProjectTasksExport: async (projectId, format = 'csv') => {
    const response = await apiClient.get(`/projects/${projectId}/export/tasks`, {
      params: { format },
      responseType: 'blob',
    });
    return response;
  },

  /** Download admin dashboard export (csv | xlsx | pdf) from API */
  downloadGlobalDashboardExport: async (format = 'csv') => {
    const response = await apiClient.get('/dashboard/global/export', {
      params: { format },
      responseType: 'blob',
    });
    return response;
  },

  // —— WBS / Lumo-inspired project plan ——
  getProjectWbs: async (projectId, params = {}) => {
    const response = await apiClient.get(`/projects/${projectId}/wbs`, { params });
    return response.data;
  },

  syncProjectWbs: async (projectId) => {
    const response = await apiClient.post(`/projects/${projectId}/wbs/sync`);
    return response.data;
  },

  unlockProjectEditing: async (projectId, password) => {
    const response = await apiClient.post(`/projects/${projectId}/edit-unlock`, { password });
    return response.data;
  },

  createProjectNode: async (projectId, data) => {
    const response = await apiClient.post(`/projects/${projectId}/nodes`, data);
    return response.data;
  },

  updateProjectNode: async (projectId, nodeId, data) => {
    const response = await apiClient.put(`/projects/${projectId}/nodes/${nodeId}`, data);
    return response.data;
  },

  deleteProjectNode: async (projectId, nodeId) => {
    const response = await apiClient.delete(`/projects/${projectId}/nodes/${nodeId}`);
    return response.data;
  },

  addNodeDependency: async (projectId, nodeId, dependsOnId) => {
    const response = await apiClient.post(`/projects/${projectId}/nodes/${nodeId}/dependencies`, {
      dependsOnId,
    });
    return response.data;
  },

  removeNodeDependency: async (projectId, nodeId, dependsOnId) => {
    const response = await apiClient.delete(
      `/projects/${projectId}/nodes/${nodeId}/dependencies/${dependsOnId}`
    );
    return response.data;
  },

  getProjectComments: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/comments`);
    return response.data;
  },

  createProjectComment: async (projectId, data) => {
    const response = await apiClient.post(`/projects/${projectId}/comments`, data);
    return response.data;
  },

  updateProjectComment: async (projectId, commentId, data) => {
    const response = await apiClient.put(`/projects/${projectId}/comments/${commentId}`, data);
    return response.data;
  },

  deleteProjectComment: async (projectId, commentId) => {
    const response = await apiClient.delete(`/projects/${projectId}/comments/${commentId}`);
    return response.data;
  },

  getTaskCollab: async (projectId, taskId) => {
    const response = await apiClient.get(`/projects/${projectId}/tasks/${taskId}/collab`);
    return response.data;
  },

  getNodeCollab: async (projectId, nodeId) => {
    const response = await apiClient.get(`/projects/${projectId}/nodes/${nodeId}/collab`);
    return response.data;
  },

  createTaskComment: async (projectId, taskId, data) => {
    const response = await apiClient.post(`/projects/${projectId}/tasks/${taskId}/comments`, data);
    return response.data;
  },

  createReviewLink: async (projectId, nodeId, data) => {
    const response = await apiClient.post(`/projects/${projectId}/nodes/${nodeId}/review-links`, data);
    return response.data;
  },

  createTaskReviewLink: async (projectId, taskId, data) => {
    const response = await apiClient.post(`/projects/${projectId}/tasks/${taskId}/review-links`, data);
    return response.data;
  },

  deleteReviewLink: async (projectId, linkId) => {
    const response = await apiClient.delete(`/projects/${projectId}/review-links/${linkId}`);
    return response.data;
  },
};

export default api;
