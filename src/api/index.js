// API service for Task Manager
// Handles all communication with the backend

const API_BASE = '/api';

// Helper function for API calls
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

// ==================== PROJECTS ====================

export const projectsAPI = {
  // Get all projects
  getAll: () => fetchAPI('/projects'),
  
  // Get single project
  getById: (id) => fetchAPI(`/projects/${id}`),
  
  // Create new project
  create: (data) => fetchAPI('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Update project
  update: (id, data) => fetchAPI(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // Delete project
  delete: (id) => fetchAPI(`/projects/${id}`, {
    method: 'DELETE',
  }),
};

// ==================== TASKS ====================

export const tasksAPI = {
  // Get all tasks
  getAll: () => fetchAPI('/tasks'),
  
  // Get tasks by project
  getByProject: (projectId) => fetchAPI(`/projects/${projectId}/tasks`),
  
  // Create new task
  create: (data) => fetchAPI('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Update task
  update: (id, data) => fetchAPI(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // Delete task
  delete: (id) => fetchAPI(`/tasks/${id}`, {
    method: 'DELETE',
  }),
};

// ==================== SETTINGS ====================

export const settingsAPI = {
  // Get all settings (types and statuses)
  getAll: () => fetchAPI('/settings'),
  
  // Update types
  updateTypes: (types) => fetchAPI('/settings/types', {
    method: 'PUT',
    body: JSON.stringify({ types }),
  }),
  
  // Update statuses
  updateStatuses: (statuses) => fetchAPI('/settings/statuses', {
    method: 'PUT',
    body: JSON.stringify({ statuses }),
  }),
};
