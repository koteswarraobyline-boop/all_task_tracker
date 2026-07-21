import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Projects
  getProjects: async () => {
    const response = await apiClient.get('/projects');
    return response.data;
  },
  
  uploadProject: async (formData) => {
    const response = await apiClient.post('/projects/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  deleteProject: async (id) => {
    const response = await apiClient.delete(`/projects/${id}`);
    return response.data;
  },

  // Tasks
  getProjectTasks: async (projectId, params = {}) => {
    const response = await apiClient.get(`/projects/${projectId}/tasks`, { params });
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
};

export default api;
