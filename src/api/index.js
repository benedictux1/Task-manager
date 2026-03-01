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
  // Get all projects (optional context: 'office' | 'personal')
  getAll: (context) => fetchAPI(context === 'office' || context === 'personal' ? `/projects?context=${context}` : '/projects'),
  
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
  // Get all tasks (optional context: 'office' | 'personal')
  getAll: (context) => fetchAPI(context === 'office' || context === 'personal' ? `/tasks?context=${context}` : '/tasks'),
  
  // Get tasks by project
  getByProject: (projectId) => fetchAPI(`/projects/${projectId}/tasks`),
  
  // Get tasks grouped by person (for Person View)
  getByPerson: () => fetchAPI('/tasks/by-person'),
  
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

// ==================== PERSONS (POC) ====================

export const personsAPI = {
  // Get all persons
  getAll: () => fetchAPI('/persons'),
  
  // Create new person
  create: (data) => fetchAPI('/persons', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Update person
  update: (id, data) => fetchAPI(`/persons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // Delete person
  delete: (id) => fetchAPI(`/persons/${id}`, {
    method: 'DELETE',
  }),
};

// ==================== SETTINGS ====================

export const settingsAPI = {
  // Get all settings (types, statuses, and persons)
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
  
  // Update persons
  updatePersons: (persons) => fetchAPI('/settings/persons', {
    method: 'PUT',
    body: JSON.stringify({ persons }),
  }),
};
