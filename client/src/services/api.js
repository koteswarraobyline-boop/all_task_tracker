import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5004/api';

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

  deleteProject: async (id) => {
    const response = await apiClient.delete(`/projects/${id}`);
    return response.data;
  },

  updateProjectDeliveryDate: async (id, data) => {
    const response = await apiClient.put(`/projects/${id}/delivery-date`, data);
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

  // Developers
  getDevelopers: async () => {
    const response = await apiClient.get('/developers');
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
};

export default api;
