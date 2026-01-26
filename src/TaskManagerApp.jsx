import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Plus, Settings, X, ChevronDown, ChevronRight, Bold, Italic, List, ListOrdered, Highlighter, Indent, Outdent, Calendar, Type, Palette, Menu, Loader2, User, Users, ChevronsUp, ChevronsDown } from 'lucide-react';
import { getWorkingDaysUntilDue, formatDateToDDMMM, parseDueDate, addWorkingDays } from './utils/dateUtils';
import { projectsAPI, tasksAPI, settingsAPI, personsAPI } from './api';

// Main App Component
export default function TaskManagerApp() {
  const [currentView, setCurrentView] = useState('task');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default type colors (used if API doesn't provide colors)
  const defaultTypeColors = {
    'Admin': '#6C757D',
    'Urgent': '#DC3545',
    'Regular': '#0066CC',
    'Night': '#343A40',
    'Weekend': '#28A745',
    'Backlog': '#FFC107',
    'Others': '#6F42C1'
  };

  const [types, setTypes] = useState([]);
  const [typeColors, setTypeColors] = useState(defaultTypeColors);

  const [statuses, setStatuses] = useState([]);
  
  // Persons (POC - Point of Contact)
  const [persons, setPersons] = useState([]);

  const getTypeColor = (typeName) => {
    return typeColors[typeName] || '#0066CC';
  };
  
  const getPersonColor = (personId) => {
    const person = persons.find(p => p.id === personId);
    return person?.color || null; // null means no color (colorless default)
  };
  
  const getPersonName = (personId) => {
    const person = persons.find(p => p.id === personId);
    return person?.name || '';
  };

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [newTaskInput, setNewTaskInput] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // ==================== DATA FETCHING ====================
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel
      const [projectsData, tasksData, settingsData] = await Promise.all([
        projectsAPI.getAll(),
        tasksAPI.getAll(),
        settingsAPI.getAll()
      ]);
      
      setProjects(projectsData);
      setTasks(tasksData);
      
      // Set types and create color map
      if (settingsData.types && settingsData.types.length > 0) {
        setTypes(settingsData.types.map(t => t.name));
        const colorMap = {};
        settingsData.types.forEach(t => {
          colorMap[t.name] = t.color;
        });
        setTypeColors(colorMap);
      } else {
        // Fallback to defaults
        setTypes(['Admin', 'Urgent', 'Regular', 'Night', 'Weekend', 'Backlog', 'Others']);
      }
      
      // Set statuses
      if (settingsData.statuses && settingsData.statuses.length > 0) {
        setStatuses(settingsData.statuses);
      } else {
        // Fallback to defaults
        setStatuses([
          { name: 'Must do', color: '#FF6B6B' },
          { name: 'Waiting others', color: '#1D1D1F' },
          { name: 'My action', color: '#FFD93D' },
          { name: 'Done', color: '#6BCF7F' }
        ]);
      }
      
      // Set persons (POC)
      if (settingsData.persons && settingsData.persons.length > 0) {
        setPersons(settingsData.persons);
      } else {
        // Fallback to empty (will be populated from Settings)
        setPersons([]);
      }
      
      // Set selected project to first one if not set
      if (projectsData.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectsData[0].id);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      
      // Fallback to default data if API fails
      setTypes(['Admin', 'Urgent', 'Regular', 'Night', 'Weekend', 'Backlog', 'Others']);
      setStatuses([
        { name: 'Must do', color: '#FF6B6B' },
        { name: 'Waiting others', color: '#1D1D1F' },
        { name: 'My action', color: '#FFD93D' },
        { name: 'Done', color: '#6BCF7F' }
      ]);
      setPersons([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId]);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const getStatusColor = (statusName) => {
    const status = statuses.find(s => s.name === statusName);
    return status ? status.color : '#1D1D1F';
  };

  // ==================== PROJECT OPERATIONS ====================

  const addProject = async () => {
    try {
      const newProject = await projectsAPI.create({ name: 'New Project', notes: '' });
      setProjects([newProject, ...projects]);
      setSelectedProjectId(newProject.id);
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err.message);
    }
  };

  const updateProject = async (id, field, value) => {
    // Optimistic update
    setProjects(projects.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
    
    try {
      await projectsAPI.update(id, { [field]: value });
    } catch (err) {
      console.error('Error updating project:', err);
      // Revert on error
      fetchData();
    }
  };

  const deleteProject = async (id) => {
    if (projects.length === 1) return;
    
    // Optimistic update
    const originalProjects = [...projects];
    const originalTasks = [...tasks];
    
    setProjects(projects.filter(p => p.id !== id));
    setTasks(tasks.filter(t => t.projectId !== id));
    
    if (selectedProjectId === id) {
      const remainingProjects = projects.filter(p => p.id !== id);
      if (remainingProjects.length > 0) {
        setSelectedProjectId(remainingProjects[0].id);
      }
    }
    
    try {
      await projectsAPI.delete(id);
    } catch (err) {
      console.error('Error deleting project:', err);
      // Revert on error
      setProjects(originalProjects);
      setTasks(originalTasks);
    }
  };

  // ==================== TASK OPERATIONS ====================

  // Simple add task for project view (with due date)
  const addTask = async (projectId) => {
    if (!newTaskInput.trim()) return;
    
    try {
      const newTask = await tasksAPI.create({
        name: newTaskInput,
        projectId: projectId,
        type: 'Regular',
        status: 'My action',
        dueDate: newTaskDueDate,
        notes: ''
      });
      setTasks([newTask, ...tasks]);
      setNewTaskInput('');
      setNewTaskDueDate('');
    } catch (err) {
      console.error('Error creating task:', err);
      setError(err.message);
    }
  };

  // Advanced add task (from task view modal)
  const addTaskAdvanced = async (taskData) => {
    console.log('addTaskAdvanced called with:', taskData); // Debug log
    try {
      const newTask = await tasksAPI.create({
        ...taskData,
        notes: taskData.notes || ''
      });
      console.log('Task created successfully:', newTask); // Debug log
      setTasks([newTask, ...tasks]);
    } catch (err) {
      console.error('Error creating task:', err);
      alert('Failed to create task: ' + err.message);
      setError(err.message);
    }
  };

  const updateTask = async (id, field, value) => {
    // Optimistic update
    setTasks(tasks.map(t =>
      t.id === id ? { ...t, [field]: value } : t
    ));
    
    try {
      await tasksAPI.update(id, { [field]: value });
    } catch (err) {
      console.error('Error updating task:', err);
      // Revert on error
      fetchData();
    }
  };

  const toggleTaskDone = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const doneStatus = statuses.find(s => s.name === 'Done');
    const defaultStatus = statuses.find(s => s.name !== 'Done');

    const newStatus = task.status === 'Done' 
      ? (defaultStatus?.name || 'My action')
      : (doneStatus?.name || 'Done');
    
    await updateTask(id, 'status', newStatus);
  };

  const deleteTask = async (id) => {
    // Optimistic update
    const originalTasks = [...tasks];
    setTasks(tasks.filter(t => t.id !== id));
    
    try {
      await tasksAPI.delete(id);
    } catch (err) {
      console.error('Error deleting task:', err);
      // Revert on error
      setTasks(originalTasks);
    }
  };

  // ==================== LOADING STATE ====================
  
  if (isLoading) {
    return (
      <div className="h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#0066CC] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading Task Manager...</p>
        </div>
      </div>
    );
  }

  const goToProject = (projectId) => {
    if (projectId) {
      setSelectedProjectId(projectId);
      setCurrentView('project');
    }
  };

  return (
    <div className="h-screen bg-[#F5F5F7] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-[#1D1D1F]">Task Manager</h1>
        <div className="flex items-center gap-4">
          <div className="flex bg-[#F5F5F7] rounded-lg p-1">
            <button
              onClick={() => setCurrentView('project')}
              className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                currentView === 'project'
                  ? 'bg-white text-[#0066CC] shadow-sm'
                  : 'text-gray-600 hover:text-[#1D1D1F]'
              }`}
            >
              <span className="hidden sm:inline">Project View</span>
              <span className="sm:hidden">Project</span>
            </button>
            <button
              onClick={() => setCurrentView('task')}
              className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                currentView === 'task'
                  ? 'bg-white text-[#0066CC] shadow-sm'
                  : 'text-gray-600 hover:text-[#1D1D1F]'
              }`}
            >
              <span className="hidden sm:inline">Task View</span>
              <span className="sm:hidden">Tasks</span>
            </button>
            <button
              onClick={() => setCurrentView('calendar')}
              className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                currentView === 'calendar'
                  ? 'bg-white text-[#0066CC] shadow-sm'
                  : 'text-gray-600 hover:text-[#1D1D1F]'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setCurrentView('person')}
              className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                currentView === 'person'
                  ? 'bg-white text-[#0066CC] shadow-sm'
                  : 'text-gray-600 hover:text-[#1D1D1F]'
              }`}
            >
              <span className="hidden sm:inline">Person View</span>
              <span className="sm:hidden">Person</span>
            </button>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {currentView === 'project' ? (
        <ProjectView
          projects={projects}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          addProject={addProject}
          updateProject={updateProject}
          deleteProject={deleteProject}
          tasks={tasks}
          types={types}
          statuses={statuses}
          persons={persons}
          getStatusColor={getStatusColor}
          getTypeColor={getTypeColor}
          getPersonColor={getPersonColor}
          getPersonName={getPersonName}
          addTask={addTask}
          addTaskAdvanced={addTaskAdvanced}
          updateTask={updateTask}
          toggleTaskDone={toggleTaskDone}
          deleteTask={deleteTask}
          newTaskInput={newTaskInput}
          setNewTaskInput={setNewTaskInput}
          newTaskDueDate={newTaskDueDate}
          setNewTaskDueDate={setNewTaskDueDate}
        />
      ) : currentView === 'task' ? (
        <TaskView
          projects={projects}
          tasks={tasks}
          types={types}
          statuses={statuses}
          persons={persons}
          getStatusColor={getStatusColor}
          getTypeColor={getTypeColor}
          getPersonColor={getPersonColor}
          getPersonName={getPersonName}
          updateTask={updateTask}
          toggleTaskDone={toggleTaskDone}
          deleteTask={deleteTask}
          goToProject={goToProject}
          addTaskAdvanced={addTaskAdvanced}
        />
      ) : currentView === 'calendar' ? (
        <CalendarView
          projects={projects}
          tasks={tasks}
          types={types}
          statuses={statuses}
          persons={persons}
          getStatusColor={getStatusColor}
          getTypeColor={getTypeColor}
          getPersonName={getPersonName}
          updateTask={updateTask}
          toggleTaskDone={toggleTaskDone}
          deleteTask={deleteTask}
          goToProject={goToProject}
        />
      ) : (
        <PersonView
          projects={projects}
          tasks={tasks}
          persons={persons}
          types={types}
          statuses={statuses}
          getStatusColor={getStatusColor}
          getTypeColor={getTypeColor}
          getPersonColor={getPersonColor}
          updateTask={updateTask}
          toggleTaskDone={toggleTaskDone}
          deleteTask={deleteTask}
          goToProject={goToProject}
          addTaskAdvanced={addTaskAdvanced}
        />
      )}

      {showSettings && (
        <SettingsModal
          types={types}
          setTypes={setTypes}
          statuses={statuses}
          setStatuses={setStatuses}
          persons={persons}
          setPersons={setPersons}
          onClose={() => setShowSettings(false)}
        />
      )}

    </div>
  );
}

// Project View Component
function ProjectView({
  projects, selectedProjectId, setSelectedProjectId, addProject, updateProject, deleteProject,
  tasks, types, statuses, persons, getStatusColor, getTypeColor, getPersonColor, getPersonName, addTask, addTaskAdvanced, updateTask, toggleTaskDone, deleteTask,
  newTaskInput, setNewTaskInput, newTaskDueDate, setNewTaskDueDate
}) {
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectTasks = tasks.filter(t => t.projectId === selectedProjectId);

  const sortedTasks = useMemo(() => {
    // Type priority: Urgent > Regular > Admin > Weekend > Backlog
    const typeOrder = { 'Urgent': 1, 'Regular': 2, 'Admin': 3, 'Weekend': 4, 'Backlog': 5 };
    // Status priority: Must do > My action > Waiting others > Done (at bottom)
    const statusOrder = { 'Must do': 1, 'My action': 2, 'Waiting others': 3, 'Done': 99 };
    
    return [...projectTasks].sort((a, b) => {
      // Done tasks always at bottom
      if (a.status === 'Done' && b.status !== 'Done') return 1;
      if (a.status !== 'Done' && b.status === 'Done') return -1;
      
      // Sort by type first
      const typeCompare = (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
      if (typeCompare !== 0) return typeCompare;
      
      // Then sort by status within same type
      const statusCompare = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      return statusCompare;
    });
  }, [projectTasks]);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Sidebar Toggle Button - Always Visible */}
      <button
        onClick={toggleSidebar}
        className="absolute left-4 top-4 z-50 p-2 bg-white hover:bg-[#F5F5F7] rounded-lg shadow-sm border border-gray-200 transition-colors"
        title="Toggle Projects Sidebar"
      >
        <Menu className="w-4 h-4 text-[#1D1D1F]" />
      </button>

      {/* Mouse hover area - still works */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 z-30"
        onMouseEnter={() => setSidebarVisible(true)}
      />

      <aside
        className={`absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col z-40 transition-transform duration-200 ${
          sidebarVisible ? 'translate-x-0' : '-translate-x-full'
        }`}
        onMouseLeave={() => setSidebarVisible(false)}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-[#1D1D1F]">Projects</h2>
          <button
            onClick={addProject}
            className="p-1 hover:bg-[#F5F5F7] rounded transition-colors"
          >
            <Plus className="w-5 h-5 text-[#0066CC]" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {projects.map(project => (
            <div key={project.id} className="group relative">
              <button
                onClick={() => setSelectedProjectId(project.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedProjectId === project.id
                    ? 'bg-[#0066CC] text-white'
                    : 'hover:bg-[#F5F5F7] text-[#1D1D1F]'
                }`}
              >
                {project.name}
              </button>
              {projects.length > 1 && (
                <button
                  onClick={() => deleteProject(project.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                >
                  <X className="w-3 h-3 text-red-500" />
                </button>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-4">
          <input
            type="text"
            value={selectedProject?.name || ''}
            onChange={(e) => updateProject(selectedProjectId, 'name', e.target.value)}
            className="text-4xl font-bold text-[#1D1D1F] bg-transparent border-none outline-none w-full mb-8 focus:ring-0"
            placeholder="Project Name"
          />

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-[#1D1D1F] mb-4">Tasks</h3>
            
            {/* Project Task Creator */}
            <ProjectInlineTaskCreator
              types={types}
              statuses={statuses}
              persons={persons}
              getStatusColor={getStatusColor}
              getTypeColor={getTypeColor}
              onAdd={addTaskAdvanced}
              selectedProjectId={selectedProjectId}
            />
            
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto mb-4">
              <table className="w-full min-w-[700px]">
                <thead className="bg-[#F5F5F7] border-b border-gray-200">
                  <tr>
                    <th className="w-12 px-4 py-3"></th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">Task</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">Type</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">Due In</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">POC</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F] w-48">Notes</th>
                    <th className="w-12 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTasks.map(task => (
                    <ProjectTaskTableRow
                      key={task.id}
                      task={task}
                      types={types}
                      statuses={statuses}
                      persons={persons}
                      getStatusColor={getStatusColor}
                      getTypeColor={getTypeColor}
                      updateTask={updateTask}
                      toggleTaskDone={toggleTaskDone}
                      deleteTask={deleteTask}
                    />
                  ))}
                </tbody>
              </table>
              {sortedTasks.length === 0 && (
                <div className="text-center py-12 text-gray-500">No tasks in this project</div>
              )}
            </div>

          </div>

          <RichTextNotesSection
            selectedProject={selectedProject}
            selectedProjectId={selectedProjectId}
            updateProject={updateProject}
            notesExpanded={notesExpanded}
            setNotesExpanded={setNotesExpanded}
          />
        </div>
      </main>
    </div>
  );
}

// Rich Text Notes Section
function RichTextNotesSection({ selectedProject, selectedProjectId, updateProject, notesExpanded, setNotesExpanded }) {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const toolbarRef = useRef(null);

  const highlightColors = [
    { color: '#FFD93D', name: 'Yellow' },
    { color: '#FF6B6B', name: 'Red' },
    { color: '#4ECDC4', name: 'Teal' },
    { color: '#45B7D1', name: 'Blue' },
    { color: '#96CEB4', name: 'Green' },
    { color: '#FFEAA7', name: 'Light Yellow' },
    { color: '#DDA0DD', name: 'Plum' },
    { color: '#FFB347', name: 'Orange' }
  ];

  const textColors = [
    { color: '#1D1D1F', name: 'Black' },
    { color: '#0066CC', name: 'Blue' },
    { color: '#FF6B6B', name: 'Red' },
    { color: '#28A745', name: 'Green' },
    { color: '#6F42C1', name: 'Purple' },
    { color: '#FD7E14', name: 'Orange' },
    { color: '#6C757D', name: 'Gray' },
    { color: '#DC3545', name: 'Dark Red' }
  ];

  const applyFormat = (command, value = null) => {
    // Prevent losing focus when formatting
    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    
    // Apply formatting
    document.execCommand(command, false, value);
    
    // Restore focus and selection
    if (editorRef.current && range) {
      editorRef.current.focus();
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editorRef.current?.focus();
    }
  };

  const toggleHighlight = (color) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;
    
    // Check if selection or its parents have highlighting
    let hasHighlight = false;
    
    // Method 1: Check parent elements for background color
    let node = range.startContainer;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE && node.style && node.style.backgroundColor) {
        const bg = node.style.backgroundColor;
        if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)' && bg !== '') {
          hasHighlight = true;
          break;
        }
      }
      node = node.parentNode;
    }
    
    // Method 2: Check the HTML of selected content
    if (!hasHighlight) {
      const clonedContent = range.cloneContents();
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(clonedContent);
      const selectedHtml = tempDiv.innerHTML;
      if (selectedHtml.includes('background-color') || selectedHtml.includes('background:')) {
        hasHighlight = true;
      }
    }
    
    console.log('Has highlight:', hasHighlight);
    
    if (hasHighlight) {
      // REMOVE HIGHLIGHTING using string replacement on the full editor content
      // This is safer than DOM manipulation which can delete text
      
      // Save the selected text first
      const selectedText = selection.toString();
      
      if (editorRef.current) {
        let html = editorRef.current.innerHTML;
        
        // Create a regex to find spans with background-color containing our selected text
        // We'll remove the background-color style from any span containing the selection
        
        // Simpler approach: Use execCommand to set transparent, then clean up
        document.execCommand('hiliteColor', false, 'transparent');
        
        // Now clean up the transparent backgrounds from the HTML
        setTimeout(() => {
          if (editorRef.current) {
            let content = editorRef.current.innerHTML;
            
            // Remove transparent background styles
            content = content.replace(/background-color:\s*transparent;?\s*/gi, '');
            content = content.replace(/background-color:\s*rgba\(0,\s*0,\s*0,\s*0\);?\s*/gi, '');
            
            // Clean up empty style attributes
            content = content.replace(/\s*style="\s*"/gi, '');
            
            // Remove spans that now have no attributes or purpose
            content = content.replace(/<span>([^<]*)<\/span>/gi, '$1');
            
            editorRef.current.innerHTML = content;
            updateProject(selectedProjectId, 'notes', content);
          }
        }, 0);
      }
    } else {
      // APPLY NEW HIGHLIGHT
      document.execCommand('hiliteColor', false, color);
      
      if (editorRef.current) {
        updateProject(selectedProjectId, 'notes', editorRef.current.innerHTML);
      }
    }
    
    editorRef.current?.focus();
  };

  const handleInput = (e) => {
    updateProject(selectedProjectId, 'notes', e.currentTarget.innerHTML);
  };

  const insertList = (ordered = false) => {
    if (ordered) {
      applyFormat('insertOrderedList');
    } else {
      applyFormat('insertUnorderedList');
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowToolbar(true);
  };

  const handleBlur = (e) => {
    // Only hide toolbar if the blur is not to a toolbar button
    if (!toolbarRef.current?.contains(e.relatedTarget)) {
      setIsFocused(false);
      // Delay hiding toolbar to allow toolbar clicks
      setTimeout(() => setShowToolbar(false), 150);
    }
  };

  // Initialize content without dangerouslySetInnerHTML to avoid text direction issues
  React.useEffect(() => {
    if (editorRef.current && selectedProject?.notes !== undefined) {
      if (editorRef.current.innerHTML !== selectedProject.notes) {
        editorRef.current.innerHTML = selectedProject.notes || '';
      }
    }
  }, [selectedProject?.notes, selectedProjectId]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <button
        onClick={() => setNotesExpanded(!notesExpanded)}
        className="w-full py-4 flex items-center gap-2 hover:opacity-70 transition-opacity"
      >
        <span className="text-xl font-semibold text-[#1D1D1F]">Notes</span>
        {notesExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {notesExpanded && (
        <div>
          {showToolbar && (
            <div 
              ref={toolbarRef}
              className="mb-4 pb-3 border-b border-gray-200 bg-white"
              onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
            >
              {/* First Row - Basic Formatting */}
              <div className="flex items-center gap-1 flex-wrap mb-2">
                <ToolbarButton icon={<Bold className="w-4 h-4" />} onClick={() => applyFormat('bold')} tooltip="Bold" />
                <ToolbarButton icon={<Italic className="w-4 h-4" />} onClick={() => applyFormat('italic')} tooltip="Italic" />
                <ToolbarButton icon={<span className="text-sm font-semibold">U</span>} onClick={() => applyFormat('underline')} tooltip="Underline" />
                
                <div className="w-px h-6 bg-gray-300 mx-1" />
                
                {/* Font Size Dropdown */}
                <SizeDropdownSelect 
                  options={[
                    { value: '2', label: 'Small' },
                    { value: '3', label: 'Normal' },
                    { value: '5', label: 'Medium' },
                    { value: '6', label: 'Large' }
                  ]}
                  onSelect={(value) => applyFormat('fontSize', value)}
                  editorRef={editorRef}
                />

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Text Color Dropdown */}
                <DropdownButton 
                  icon={<Type className="w-4 h-4" />} 
                  tooltip="Text Color"
                  options={textColors}
                  onSelect={(color) => applyFormat('foreColor', color)}
                  type="color"
                />
              </div>

              {/* Second Row - Highlight, Lists, Indentation */}
              <div className="flex items-center gap-1 flex-wrap">
                {/* Highlight Colors */}
                <DropdownButton 
                  icon={<Highlighter className="w-4 h-4" />} 
                  tooltip="Highlight Color (click again to remove)"
                  options={highlightColors}
                  onSelect={(color) => toggleHighlight(color)}
                  type="highlight"
                />

                <div className="w-px h-6 bg-gray-300 mx-1" />

                <ToolbarButton icon={<List className="w-4 h-4" />} onClick={() => insertList(false)} tooltip="Bullet List" />
                <ToolbarButton icon={<ListOrdered className="w-4 h-4" />} onClick={() => insertList(true)} tooltip="Numbered List" />

                <div className="w-px h-6 bg-gray-300 mx-1" />

                <ToolbarButton icon={<Indent className="w-4 h-4" />} onClick={() => applyFormat('indent')} tooltip="Indent" />
                <ToolbarButton icon={<Outdent className="w-4 h-4" />} onClick={() => applyFormat('outdent')} tooltip="Outdent" />
              </div>
            </div>
          )}

          <style>{`
            .notes-editor h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
            .notes-editor h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; }
            .notes-editor h3 { font-size: 1.17em; font-weight: bold; margin: 0.83em 0; }
            .notes-editor h4 { font-size: 1em; font-weight: bold; margin: 1em 0; }
            .notes-editor ul { list-style-type: disc; margin-left: 1.5em; margin-top: 0.5em; margin-bottom: 0.5em; }
            .notes-editor ol { 
              list-style-type: decimal; 
              margin-left: 1.5em; 
              margin-top: 0.5em; 
              margin-bottom: 0.5em; 
            }
            .notes-editor ol ol {
              list-style-type: lower-alpha;
            }
            .notes-editor ol ol ol {
              list-style-type: lower-roman;
            }
            .notes-editor li { margin: 0.25em 0; }
            .notes-editor p { margin: 0.5em 0; }
            .notes-editor div { margin: 0.5em 0; }
            .notes-editor strong { font-weight: 600; }
            .notes-editor em { font-style: italic; }
            .notes-editor u { text-decoration: underline; }
            .notes-editor mark { background-color: #FFD93D; padding: 2px 4px; border-radius: 3px; }
            .notes-editor:empty:before {
              content: attr(data-placeholder);
              color: #9CA3AF;
              pointer-events: none;
            }
            .notes-editor {
              direction: ltr;
              text-align: left;
            }
            .notes-editor font[size="2"] { font-size: 12px; }
            .notes-editor font[size="3"] { font-size: 14px; }
            .notes-editor font[size="5"] { font-size: 18px; }
            .notes-editor font[size="6"] { font-size: 20px; }
          `}</style>
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="notes-editor w-full min-h-[250px] p-4 border border-gray-200 rounded-lg outline-none text-[#1D1D1F] overflow-y-auto bg-white focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
            data-placeholder="Add project notes, context, meeting notes..."
            suppressContentEditableWarning={true}
          />
        </div>
      )}
    </div>
  );
}

// Toolbar Button
function ToolbarButton({ icon, onClick, tooltip }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
      className="p-2 hover:bg-[#F5F5F7] rounded transition-colors text-[#1D1D1F] hover:text-[#0066CC]"
      title={tooltip}
    >
      {icon}
    </button>
  );
}

// Dropdown Button for Colors
function DropdownButton({ icon, tooltip, options, onSelect, type }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option) => {
    onSelect(option.color);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseDown={(e) => e.preventDefault()}
        className="p-2 hover:bg-[#F5F5F7] rounded transition-colors text-[#1D1D1F] hover:text-[#0066CC] flex items-center gap-1"
        title={tooltip}
      >
        {icon}
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-20 grid grid-cols-4 gap-1 min-w-[120px]">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelect(option)}
                onMouseDown={(e) => e.preventDefault()}
                className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ 
                  backgroundColor: option.color,
                  border: type === 'highlight' ? '2px solid #333' : '1px solid #ccc'
                }}
                title={option.name}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Size Dropdown with Current Size Detection
function SizeDropdownSelect({ options, onSelect, editorRef }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSize, setCurrentSize] = useState('Size');

  // Detect current font size at cursor position
  const getCurrentFontSize = () => {
    if (!editorRef.current) return 'Size';
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return 'Size';
    
    // Get the current element at cursor
    let element = selection.anchorNode;
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentElement;
    }
    
    // Check for font size in style attribute or font tags
    while (element && element !== editorRef.current) {
      if (element.style && element.style.fontSize) {
        // Convert pixel size to our size values
        const pixelSize = parseInt(element.style.fontSize);
        if (pixelSize <= 12) return options.find(o => o.value === '2')?.label || 'Small';
        if (pixelSize <= 14) return options.find(o => o.value === '3')?.label || 'Normal';
        if (pixelSize <= 18) return options.find(o => o.value === '5')?.label || 'Medium';
        if (pixelSize >= 20) return options.find(o => o.value === '6')?.label || 'Large';
      }
      
      // Check for font size attribute in font tags
      if (element.tagName === 'FONT' && element.size) {
        const sizeValue = element.size.toString();
        const option = options.find(o => o.value === sizeValue);
        return option ? option.label : 'Size';
      }
      
      element = element.parentElement;
    }
    
    return 'Size';
  };

  // Update current size when selection changes
  React.useEffect(() => {
    const updateCurrentSize = () => {
      setCurrentSize(getCurrentFontSize());
    };

    const handleSelectionChange = () => {
      // Small delay to ensure DOM is updated
      setTimeout(updateCurrentSize, 10);
    };

    if (editorRef.current) {
      editorRef.current.addEventListener('keyup', handleSelectionChange);
      editorRef.current.addEventListener('mouseup', handleSelectionChange);
      document.addEventListener('selectionchange', handleSelectionChange);
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('keyup', handleSelectionChange);
        editorRef.current.removeEventListener('mouseup', handleSelectionChange);
      }
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [editorRef.current]);

  const handleSelect = (option) => {
    onSelect(option.value);
    setIsOpen(false);
    // Update current size immediately
    setTimeout(() => setCurrentSize(option.label), 50);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseDown={(e) => e.preventDefault()}
        className="px-3 py-1 bg-white rounded border border-gray-300 text-sm text-[#1D1D1F] cursor-pointer hover:bg-gray-50 flex items-center gap-2 min-w-[80px] justify-between"
      >
        <span>{currentSize}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[120px]">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelect(option)}
                onMouseDown={(e) => e.preventDefault()}
                className="w-full text-left px-3 py-2 hover:bg-[#F5F5F7] text-sm text-[#1D1D1F] transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Inline Task Creator Component
function InlineTaskCreator({ projects, types, statuses, persons, getStatusColor, getTypeColor, onAdd }) {
  const [step, setStep] = useState('task'); // 'task', 'type', 'status', 'poc', 'project'
  const [taskName, setTaskName] = useState('');
  const [selectedType, setSelectedType] = useState('Regular');
  const [selectedStatus, setSelectedStatus] = useState('My action');
  const [selectedPOC, setSelectedPOC] = useState([]); // Array of person IDs
  const [selectedProject, setSelectedProject] = useState(null);
  const [typeIndex, setTypeIndex] = useState(types.indexOf('Regular'));
  const [statusIndex, setStatusIndex] = useState(statuses.findIndex(s => s.name === 'My action'));
  const [pocIndex, setPocIndex] = useState(-1); // -1 means "unassigned"
  const [projectIndex, setProjectIndex] = useState(-1);

  const taskInputRef = useRef(null);
  const typeSelectRef = useRef(null);
  const statusSelectRef = useRef(null);
  const pocSelectRef = useRef(null);
  const projectSelectRef = useRef(null);

  // Calculate default project ID
  const generalTasksProject = projects.find(p => p.name === 'General Tasks');
  const defaultProjectId = generalTasksProject?.id || (projects.length > 0 ? projects[0].id : null);

  // Update selectedProject when projects load (fixes initialization issue)
  useEffect(() => {
    if (defaultProjectId && !selectedProject) {
      setSelectedProject(defaultProjectId);
      setProjectIndex(projects.findIndex(p => p.id === defaultProjectId));
    }
  }, [defaultProjectId, projects]);

  const projectOptions = [...projects]; // No "No Project" option - always assign to a project
  const pocOptions = [{ id: null, name: '- (Unassigned)' }, ...(persons || [])];

  const handleTaskKeyDown = (e) => {
    if (e.key === 'Enter' && taskName.trim()) {
      setStep('type');
      setTimeout(() => typeSelectRef.current?.focus(), 50);
    }
  };

  const handleTypeKeyDown = (e) => {
    e.preventDefault();
    if (e.key === 'ArrowUp') {
      const newIndex = Math.max(0, typeIndex - 1);
      setTypeIndex(newIndex);
      setSelectedType(types[newIndex]);
    } else if (e.key === 'ArrowDown') {
      const newIndex = Math.min(types.length - 1, typeIndex + 1);
      setTypeIndex(newIndex);
      setSelectedType(types[newIndex]);
    } else if (e.key === 'Enter') {
      setStep('status');
      setTimeout(() => statusSelectRef.current?.focus(), 50);
    } else if (e.key === 'Escape') {
      resetForm();
    }
  };

  const handleStatusKeyDown = (e) => {
    e.preventDefault();
    if (e.key === 'ArrowUp') {
      const newIndex = Math.max(0, statusIndex - 1);
      setStatusIndex(newIndex);
      setSelectedStatus(statuses[newIndex].name);
    } else if (e.key === 'ArrowDown') {
      const newIndex = Math.min(statuses.length - 1, statusIndex + 1);
      setStatusIndex(newIndex);
      setSelectedStatus(statuses[newIndex].name);
    } else if (e.key === 'Enter') {
      setStep('poc');
      setTimeout(() => pocSelectRef.current?.focus(), 50);
    } else if (e.key === 'Escape') {
      resetForm();
    }
  };

  const handlePOCKeyDown = (e) => {
    e.preventDefault();
    if (e.key === 'ArrowUp') {
      const newIndex = Math.max(-1, pocIndex - 1);
      setPocIndex(newIndex);
      setSelectedPOC(newIndex === -1 ? [] : [pocOptions[newIndex + 1].id]);
    } else if (e.key === 'ArrowDown') {
      const newIndex = Math.min(pocOptions.length - 2, pocIndex + 1);
      setPocIndex(newIndex);
      setSelectedPOC(newIndex === -1 ? [] : [pocOptions[newIndex + 1].id]);
    } else if (e.key === 'Tab' || (e.key === 'Enter' && e.shiftKey)) {
      setStep('project');
      setTimeout(() => projectSelectRef.current?.focus(), 50);
    } else if (e.key === 'Enter') {
      createTask();
    } else if (e.key === 'Escape') {
      resetForm();
    }
  };

  const handleProjectKeyDown = (e) => {
    e.preventDefault();
    if (e.key === 'ArrowUp') {
      const newIndex = Math.max(0, projectIndex - 1);
      setProjectIndex(newIndex);
      setSelectedProject(projectOptions[newIndex].id);
    } else if (e.key === 'ArrowDown') {
      const newIndex = Math.min(projectOptions.length - 1, projectIndex + 1);
      setProjectIndex(newIndex);
      setSelectedProject(projectOptions[newIndex].id);
    } else if (e.key === 'Enter') {
      createTask();
    } else if (e.key === 'Escape') {
      resetForm();
    }
  };

  const createTask = () => {
    if (!taskName.trim()) return;

    // Use selectedProject, or fall back to defaultProjectId
    const projectId = selectedProject || defaultProjectId;
    
    // Don't create task without a valid project
    if (!projectId) {
      console.error('Cannot create task: no project available');
      alert('Please wait for projects to load, or select a project.');
      return;
    }

    // Set due date to 1 week from today
    const oneWeekLater = addWorkingDays(new Date(), 7);
    const dueDate = formatDateToDDMMM(oneWeekLater);

    const newTask = {
      name: taskName.trim(),
      projectId: projectId,
      type: selectedType,
      status: selectedStatus,
      dueDate: dueDate,
      personIds: selectedPOC.filter(id => id !== null)
    };

    console.log('Creating task:', newTask); // Debug log
    onAdd(newTask);
    resetForm();
  };

  const resetForm = () => {
    setStep('task');
    setTaskName('');
    setSelectedType('Regular');
    setSelectedStatus('My action');
    setSelectedPOC([]);
    // Reset to default project (General Tasks or first project)
    const resetProjectId = defaultProjectId || (projects.length > 0 ? projects[0].id : null);
    setSelectedProject(resetProjectId);
    setTypeIndex(types.indexOf('Regular'));
    setStatusIndex(statuses.findIndex(s => s.name === 'My action'));
    setPocIndex(-1);
    setProjectIndex(resetProjectId ? projects.findIndex(p => p.id === resetProjectId) : -1);
    setTimeout(() => taskInputRef.current?.focus(), 50);
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setTypeIndex(types.indexOf(type));
    setStep('status');
    setTimeout(() => statusSelectRef.current?.focus(), 50);
  };

  const handleStatusSelect = (statusName) => {
    setSelectedStatus(statusName);
    setStatusIndex(statuses.findIndex(s => s.name === statusName));
    setStep('poc');
    setTimeout(() => pocSelectRef.current?.focus(), 50);
  };

  const handlePOCSelect = (personId) => {
    if (personId === null || personId === '') {
      setSelectedPOC([]);
      setPocIndex(-1);
    } else {
      setSelectedPOC([parseInt(personId)]);
      setPocIndex(pocOptions.findIndex(p => p.id === parseInt(personId)) - 1);
    }
    setStep('project');
    setTimeout(() => projectSelectRef.current?.focus(), 50);
  };

  const handleProjectSelect = (projectId) => {
    setSelectedProject(projectId);
    setProjectIndex(projectOptions.findIndex(p => p.id === projectId));
    createTask();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Task Name Input - Takes more space */}
        <input
          ref={taskInputRef}
          type="text"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          onKeyDown={handleTaskKeyDown}
          placeholder="Add new task..."
          className={`flex-1 min-w-[300px] px-4 py-3 rounded-lg border-none outline-none text-sm transition-all ${
            step === 'task'
              ? 'bg-[#F5F5F7] focus:ring-2 focus:ring-[#0066CC] focus:bg-white'
              : 'bg-[#F9F9F9] text-gray-600'
          }`}
          autoFocus
        />

        {/* Type Selection */}
        {(step === 'type' || (step !== 'task' && selectedType)) && (
          <div className="relative">
            <select
              ref={typeSelectRef}
              value={selectedType}
              onChange={(e) => handleTypeSelect(e.target.value)}
              onKeyDown={handleTypeKeyDown}
              className={`px-4 py-3 rounded-lg border outline-none text-sm cursor-pointer min-w-[120px] transition-all ${
                step === 'type'
                  ? 'bg-white border-[#0066CC] focus:ring-2 focus:ring-[#0066CC] shadow-sm text-white font-medium'
                  : 'bg-[#F9F9F9] border-gray-200 text-white font-medium'
              }`}
              style={{
                backgroundColor: step === 'type' || selectedType ? getTypeColor(selectedType) : undefined,
                color: 'white'
              }}
            >
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status Selection */}
        {(step === 'status' || step === 'poc' || step === 'project') && selectedStatus && (
          <div className="relative">
            <select
              ref={statusSelectRef}
              value={selectedStatus}
              onChange={(e) => handleStatusSelect(e.target.value)}
              onKeyDown={handleStatusKeyDown}
              className={`px-4 py-3 rounded-lg border outline-none text-sm cursor-pointer min-w-[140px] transition-all ${
                step === 'status'
                  ? 'bg-white border-[#0066CC] focus:ring-2 focus:ring-[#0066CC] shadow-sm text-white font-medium'
                  : 'bg-[#F9F9F9] border-gray-200 text-white font-medium'
              }`}
              style={{
                backgroundColor: step === 'status' || selectedStatus ? getStatusColor(selectedStatus) : undefined,
                color: getStatusColor(selectedStatus) === '#FFD93D' ? '#1D1D1F' : 'white'
              }}
            >
              {statuses.map(status => (
                <option key={status.name} value={status.name}>{status.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* POC Selection */}
        {(step === 'poc' || step === 'project') && (
          <div className="relative">
            <select
              ref={pocSelectRef}
              value={selectedPOC[0] || ''}
              onChange={(e) => handlePOCSelect(e.target.value)}
              onKeyDown={handlePOCKeyDown}
              className={`px-4 py-3 rounded-lg border outline-none text-sm cursor-pointer min-w-[140px] transition-all ${
                step === 'poc'
                  ? 'bg-white border-[#0066CC] focus:ring-2 focus:ring-[#0066CC] shadow-sm'
                  : 'bg-[#F9F9F9] border-gray-200'
              }`}
            >
              <option value="">- (Unassigned)</option>
              {(persons || []).map(person => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Project Selection */}
        {step === 'project' && (
          <div className="relative">
            <select
              ref={projectSelectRef}
              value={selectedProject || ''}
              onChange={(e) => handleProjectSelect(e.target.value || null)}
              onKeyDown={handleProjectKeyDown}
              className="px-4 py-3 bg-white rounded-lg border border-[#0066CC] outline-none focus:ring-2 focus:ring-[#0066CC] text-sm cursor-pointer min-w-[140px] shadow-sm"
            >
              {projectOptions.map(project => (
                <option key={project.id || 'none'} value={project.id || ''}>{project.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-gray-500 flex-shrink-0">
          {step === 'task' && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-[#0066CC] rounded-full animate-pulse"></span>
              Type task name, press Enter
            </span>
          )}
          {step === 'type' && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-[#0066CC] rounded-full animate-pulse"></span>
              Use ↑↓ arrows, press Enter
            </span>
          )}
          {step === 'status' && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-[#0066CC] rounded-full animate-pulse"></span>
              Use ↑↓ arrows, press Enter
            </span>
          )}
          {step === 'poc' && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-[#0066CC] rounded-full animate-pulse"></span>
              Enter to create (General Tasks), Tab to change project
            </span>
          )}
          {step === 'project' && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-[#0066CC] rounded-full animate-pulse"></span>
              Use ↑↓ arrows, press Enter to create
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Project Inline Task Creator Component (without project selection)
function ProjectInlineTaskCreator({ types, statuses, persons, getStatusColor, getTypeColor, onAdd, selectedProjectId, defaultPersonId }) {
  const [step, setStep] = useState('task'); // 'task', 'type', 'status', 'poc'
  const [taskName, setTaskName] = useState('');
  const [selectedType, setSelectedType] = useState('Regular');
  const [selectedStatus, setSelectedStatus] = useState('My action');
  const [selectedPOC, setSelectedPOC] = useState(defaultPersonId ? [defaultPersonId] : []);
  const [typeIndex, setTypeIndex] = useState(types.indexOf('Regular'));
  const [statusIndex, setStatusIndex] = useState(statuses.findIndex(s => s.name === 'My action'));
  const [pocIndex, setPocIndex] = useState(defaultPersonId ? (persons || []).findIndex(p => p.id === defaultPersonId) : -1);

  const taskInputRef = useRef(null);
  const typeSelectRef = useRef(null);
  const statusSelectRef = useRef(null);
  const pocSelectRef = useRef(null);

  const handleTaskKeyDown = (e) => {
    if (e.key === 'Enter' && taskName.trim()) {
      setStep('type');
      setTimeout(() => typeSelectRef.current?.focus(), 50);
    }
  };

  const handleTypeKeyDown = (e) => {
    e.preventDefault();
    if (e.key === 'ArrowUp') {
      const newIndex = Math.max(0, typeIndex - 1);
      setTypeIndex(newIndex);
      setSelectedType(types[newIndex]);
    } else if (e.key === 'ArrowDown') {
      const newIndex = Math.min(types.length - 1, typeIndex + 1);
      setTypeIndex(newIndex);
      setSelectedType(types[newIndex]);
    } else if (e.key === 'Enter') {
      setStep('status');
      setTimeout(() => statusSelectRef.current?.focus(), 50);
    } else if (e.key === 'Escape') {
      resetForm();
    }
  };

  const handleStatusKeyDown = (e) => {
    e.preventDefault();
    if (e.key === 'ArrowUp') {
      const newIndex = Math.max(0, statusIndex - 1);
      setStatusIndex(newIndex);
      setSelectedStatus(statuses[newIndex].name);
    } else if (e.key === 'ArrowDown') {
      const newIndex = Math.min(statuses.length - 1, statusIndex + 1);
      setStatusIndex(newIndex);
      setSelectedStatus(statuses[newIndex].name);
    } else if (e.key === 'Enter') {
      setStep('poc');
      setTimeout(() => pocSelectRef.current?.focus(), 50);
    } else if (e.key === 'Escape') {
      resetForm();
    }
  };

  const handlePOCKeyDown = (e) => {
    e.preventDefault();
    if (e.key === 'ArrowUp') {
      const newIndex = Math.max(-1, pocIndex - 1);
      setPocIndex(newIndex);
      setSelectedPOC(newIndex === -1 ? [] : [(persons || [])[newIndex]?.id].filter(Boolean));
    } else if (e.key === 'ArrowDown') {
      const newIndex = Math.min((persons || []).length - 1, pocIndex + 1);
      setPocIndex(newIndex);
      setSelectedPOC(newIndex === -1 ? [] : [(persons || [])[newIndex]?.id].filter(Boolean));
    } else if (e.key === 'Enter') {
      createTask();
    } else if (e.key === 'Escape') {
      resetForm();
    }
  };

  const createTask = () => {
    if (!taskName.trim()) return;

    // Set due date to 1 week from today
    const oneWeekLater = addWorkingDays(new Date(), 7);
    const dueDate = formatDateToDDMMM(oneWeekLater);

    const newTask = {
      name: taskName.trim(),
      projectId: selectedProjectId, // Auto-assign to current project
      type: selectedType,
      status: selectedStatus,
      dueDate: dueDate,
      personIds: selectedPOC.filter(id => id !== null)
    };

    onAdd(newTask);
    resetForm();
  };

  const resetForm = () => {
    setStep('task');
    setTaskName('');
    setSelectedType('Regular');
    setSelectedStatus('My action');
    setSelectedPOC(defaultPersonId ? [defaultPersonId] : []);
    setTypeIndex(types.indexOf('Regular'));
    setStatusIndex(statuses.findIndex(s => s.name === 'My action'));
    setPocIndex(defaultPersonId ? (persons || []).findIndex(p => p.id === defaultPersonId) : -1);
    setTimeout(() => taskInputRef.current?.focus(), 50);
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setTypeIndex(types.indexOf(type));
    setStep('status');
    setTimeout(() => statusSelectRef.current?.focus(), 50);
  };

  const handleStatusSelect = (statusName) => {
    setSelectedStatus(statusName);
    setStatusIndex(statuses.findIndex(s => s.name === statusName));
    setStep('poc');
    setTimeout(() => pocSelectRef.current?.focus(), 50);
  };

  const handlePOCSelect = (personId) => {
    if (personId === null || personId === '') {
      setSelectedPOC([]);
      setPocIndex(-1);
    } else {
      setSelectedPOC([parseInt(personId)]);
      setPocIndex((persons || []).findIndex(p => p.id === parseInt(personId)));
    }
    createTask();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Task Name Input - Takes more space */}
        <input
          ref={taskInputRef}
          type="text"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          onKeyDown={handleTaskKeyDown}
          placeholder="Add new task..."
          className={`flex-1 min-w-[200px] px-4 py-3 rounded-lg border-none outline-none text-sm transition-all ${
            step === 'task'
              ? 'bg-[#F5F5F7] focus:ring-2 focus:ring-[#0066CC] focus:bg-white'
              : 'bg-[#F9F9F9] text-gray-600'
          }`}
          autoFocus
        />

        {/* Type Selection */}
        {(step === 'type' || step === 'status' || step === 'poc') && (
          <div className="relative">
            <select
              ref={typeSelectRef}
              value={selectedType}
              onChange={(e) => handleTypeSelect(e.target.value)}
              onKeyDown={handleTypeKeyDown}
              className={`px-4 py-3 rounded-lg border outline-none text-sm cursor-pointer min-w-[120px] transition-all ${
                step === 'type'
                  ? 'bg-white border-[#0066CC] focus:ring-2 focus:ring-[#0066CC] shadow-sm text-white font-medium'
                  : 'bg-[#F9F9F9] border-gray-200 text-white font-medium'
              }`}
              style={{
                backgroundColor: getTypeColor(selectedType),
                color: 'white'
              }}
            >
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status Selection */}
        {(step === 'status' || step === 'poc') && (
          <div className="relative">
            <select
              ref={statusSelectRef}
              value={selectedStatus}
              onChange={(e) => handleStatusSelect(e.target.value)}
              onKeyDown={handleStatusKeyDown}
              className={`px-4 py-3 rounded-lg border outline-none text-sm cursor-pointer min-w-[140px] transition-all ${
                step === 'status'
                  ? 'bg-white border-[#0066CC] focus:ring-2 focus:ring-[#0066CC] shadow-sm text-white font-medium'
                  : 'bg-[#F9F9F9] border-gray-200 text-white font-medium'
              }`}
              style={{
                backgroundColor: getStatusColor(selectedStatus),
                color: getStatusColor(selectedStatus) === '#FFD93D' ? '#1D1D1F' : 'white'
              }}
            >
              {statuses.map(status => (
                <option key={status.name} value={status.name}>{status.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* POC Selection */}
        {step === 'poc' && (
          <div className="relative">
            <select
              ref={pocSelectRef}
              value={selectedPOC[0] || ''}
              onChange={(e) => handlePOCSelect(e.target.value)}
              onKeyDown={handlePOCKeyDown}
              className="px-4 py-3 rounded-lg border border-[#0066CC] outline-none focus:ring-2 focus:ring-[#0066CC] text-sm cursor-pointer min-w-[140px] shadow-sm bg-white"
            >
              <option value="">- (Unassigned)</option>
              {(persons || []).map(person => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-gray-500 flex-shrink-0">
          {step === 'task' && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-[#0066CC] rounded-full animate-pulse"></span>
              Type task name, press Enter
            </span>
          )}
          {step === 'type' && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-[#0066CC] rounded-full animate-pulse"></span>
              Use ↑↓ arrows, press Enter
            </span>
          )}
          {step === 'status' && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-[#0066CC] rounded-full animate-pulse"></span>
              Use ↑↓ arrows, press Enter
            </span>
          )}
          {step === 'poc' && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-[#0066CC] rounded-full animate-pulse"></span>
              Select POC, press Enter to create
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Person Task Creator (for Person View - pre-assigns to a specific person)
function PersonTaskCreator({ projects, types, statuses, persons, getStatusColor, getTypeColor, onAdd, defaultPersonId, personName }) {
  const [step, setStep] = useState('task'); // 'task', 'type', 'status', 'project'
  const [taskName, setTaskName] = useState('');
  const [selectedType, setSelectedType] = useState('Regular');
  const [selectedStatus, setSelectedStatus] = useState('My action');
  const [selectedProject, setSelectedProject] = useState(null);
  const [typeIndex, setTypeIndex] = useState(types.indexOf('Regular'));
  const [statusIndex, setStatusIndex] = useState(statuses.findIndex(s => s.name === 'My action'));
  const [projectIndex, setProjectIndex] = useState(-1);

  const taskInputRef = useRef(null);
  const typeSelectRef = useRef(null);
  const statusSelectRef = useRef(null);
  const projectSelectRef = useRef(null);

  // Calculate default project ID (General Tasks or first project)
  const generalTasksProject = projects.find(p => p.name === 'General Tasks');
  const defaultProjectId = generalTasksProject?.id || (projects.length > 0 ? projects[0].id : null);

  // Update selectedProject when projects load
  useEffect(() => {
    if (defaultProjectId && !selectedProject) {
      setSelectedProject(defaultProjectId);
      setProjectIndex(projects.findIndex(p => p.id === defaultProjectId));
    }
  }, [defaultProjectId, projects]);

  const projectOptions = [...projects]; // Always require a project

  const handleTaskKeyDown = (e) => {
    if (e.key === 'Enter' && taskName.trim()) {
      setStep('type');
      setTimeout(() => typeSelectRef.current?.focus(), 50);
    }
  };

  const handleTypeKeyDown = (e) => {
    e.preventDefault();
    if (e.key === 'ArrowUp') {
      const newIndex = Math.max(0, typeIndex - 1);
      setTypeIndex(newIndex);
      setSelectedType(types[newIndex]);
    } else if (e.key === 'ArrowDown') {
      const newIndex = Math.min(types.length - 1, typeIndex + 1);
      setTypeIndex(newIndex);
      setSelectedType(types[newIndex]);
    } else if (e.key === 'Enter') {
      setStep('status');
      setTimeout(() => statusSelectRef.current?.focus(), 50);
    } else if (e.key === 'Escape') {
      resetForm();
    }
  };

  const handleStatusKeyDown = (e) => {
    e.preventDefault();
    if (e.key === 'ArrowUp') {
      const newIndex = Math.max(0, statusIndex - 1);
      setStatusIndex(newIndex);
      setSelectedStatus(statuses[newIndex].name);
    } else if (e.key === 'ArrowDown') {
      const newIndex = Math.min(statuses.length - 1, statusIndex + 1);
      setStatusIndex(newIndex);
      setSelectedStatus(statuses[newIndex].name);
    } else if (e.key === 'Enter') {
      setStep('project');
      setTimeout(() => projectSelectRef.current?.focus(), 50);
    } else if (e.key === 'Escape') {
      resetForm();
    }
  };

  const handleProjectKeyDown = (e) => {
    e.preventDefault();
    if (e.key === 'ArrowUp') {
      const newIndex = Math.max(0, projectIndex - 1);
      setProjectIndex(newIndex);
      setSelectedProject(projectOptions[newIndex].id);
    } else if (e.key === 'ArrowDown') {
      const newIndex = Math.min(projectOptions.length - 1, projectIndex + 1);
      setProjectIndex(newIndex);
      setSelectedProject(projectOptions[newIndex].id);
    } else if (e.key === 'Enter') {
      createTask();
    } else if (e.key === 'Escape') {
      resetForm();
    }
  };

  const createTask = () => {
    if (!taskName.trim()) return;

    // Use selectedProject, or fall back to defaultProjectId
    const projectId = selectedProject || defaultProjectId;
    
    // Don't create task without a valid project
    if (!projectId) {
      console.error('Cannot create task: no project available');
      alert('Please wait for projects to load, or select a project.');
      return;
    }

    const oneWeekLater = addWorkingDays(new Date(), 7);
    const dueDate = formatDateToDDMMM(oneWeekLater);

    const newTask = {
      name: taskName.trim(),
      projectId: projectId,
      type: selectedType,
      status: selectedStatus,
      dueDate: dueDate,
      personIds: defaultPersonId ? [defaultPersonId] : []
    };

    console.log('PersonTaskCreator creating task:', newTask); // Debug log
    onAdd(newTask);
    resetForm();
  };

  const resetForm = () => {
    setStep('task');
    setTaskName('');
    setSelectedType('Regular');
    setSelectedStatus('My action');
    // Reset to default project
    const resetProjectId = defaultProjectId || (projects.length > 0 ? projects[0].id : null);
    setSelectedProject(resetProjectId);
    setTypeIndex(types.indexOf('Regular'));
    setStatusIndex(statuses.findIndex(s => s.name === 'My action'));
    setProjectIndex(resetProjectId ? projects.findIndex(p => p.id === resetProjectId) : -1);
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setTypeIndex(types.indexOf(type));
    setStep('status');
    setTimeout(() => statusSelectRef.current?.focus(), 50);
  };

  const handleStatusSelect = (statusName) => {
    setSelectedStatus(statusName);
    setStatusIndex(statuses.findIndex(s => s.name === statusName));
    setStep('project');
    setTimeout(() => projectSelectRef.current?.focus(), 50);
  };

  const handleProjectSelect = (projectId) => {
    setSelectedProject(projectId);
    setProjectIndex(projectOptions.findIndex(p => p.id === projectId));
    createTask();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        ref={taskInputRef}
        type="text"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        onKeyDown={handleTaskKeyDown}
        placeholder={`Add task for ${personName}...`}
        className={`flex-1 min-w-[200px] px-3 py-2 rounded-lg border-none outline-none text-sm transition-all ${
          step === 'task'
            ? 'bg-[#F5F5F7] focus:ring-2 focus:ring-[#0066CC] focus:bg-white'
            : 'bg-[#F9F9F9] text-gray-600'
        }`}
      />

      {(step === 'type' || step === 'status' || step === 'project') && (
        <select
          ref={typeSelectRef}
          value={selectedType}
          onChange={(e) => handleTypeSelect(e.target.value)}
          onKeyDown={handleTypeKeyDown}
          className="px-3 py-2 rounded-lg border outline-none text-sm cursor-pointer min-w-[100px]"
          style={{ backgroundColor: getTypeColor(selectedType), color: 'white' }}
        >
          {types.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      )}

      {(step === 'status' || step === 'project') && (
        <select
          ref={statusSelectRef}
          value={selectedStatus}
          onChange={(e) => handleStatusSelect(e.target.value)}
          onKeyDown={handleStatusKeyDown}
          className="px-3 py-2 rounded-lg border outline-none text-sm cursor-pointer min-w-[120px]"
          style={{
            backgroundColor: getStatusColor(selectedStatus),
            color: getStatusColor(selectedStatus) === '#FFD93D' ? '#1D1D1F' : 'white'
          }}
        >
          {statuses.map(status => (
            <option key={status.name} value={status.name}>{status.name}</option>
          ))}
        </select>
      )}

      {step === 'project' && (
        <select
          ref={projectSelectRef}
          value={selectedProject || ''}
          onChange={(e) => handleProjectSelect(e.target.value || null)}
          onKeyDown={handleProjectKeyDown}
          className="px-3 py-2 bg-white rounded-lg border border-[#0066CC] outline-none text-sm cursor-pointer min-w-[120px]"
        >
          {projectOptions.map(project => (
            <option key={project.id || 'none'} value={project.id || ''}>{project.name}</option>
          ))}
        </select>
      )}

      <span className="text-xs text-gray-400">
        {step === 'task' && 'Enter to continue'}
        {step === 'type' && '↑↓ Enter'}
        {step === 'status' && '↑↓ Enter'}
        {step === 'project' && '↑↓ Enter to create'}
      </span>
    </div>
  );
}

// Task View Component
function TaskView({
  projects, tasks, types, statuses, persons, getStatusColor, getTypeColor, getPersonColor, getPersonName,
  updateTask, toggleTaskDone, deleteTask, goToProject, addTaskAdvanced
}) {
  const [filterType, setFilterType] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterPOC, setFilterPOC] = useState([]);
  const [filterProject, setFilterProject] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      if (filterType.length > 0 && !filterType.includes(task.type)) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(task.status)) return false;
      if (filterProject.length > 0 && !filterProject.includes(task.projectId)) return false;
      // POC filter - check if task has any of the filtered person IDs
      if (filterPOC.length > 0) {
        const taskPersonIds = task.personIds || [];
        const hasMatchingPOC = filterPOC.some(pocId => taskPersonIds.includes(pocId));
        if (!hasMatchingPOC) return false;
      }
      if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    // Type priority: Urgent > Regular > Admin > Weekend > Backlog
    const typeOrder = { 'Urgent': 1, 'Regular': 2, 'Admin': 3, 'Weekend': 4, 'Backlog': 5 };
    // Status priority: Must do > My action > Waiting others > Done (at bottom)
    const statusOrder = { 'Must do': 1, 'My action': 2, 'Waiting others': 3, 'Done': 99 };
    
    filtered.sort((a, b) => {
      // Done tasks always at bottom
      if (a.status === 'Done' && b.status !== 'Done') return 1;
      if (a.status !== 'Done' && b.status === 'Done') return -1;

      // Sort by type first
      const typeCompare = (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
      if (typeCompare !== 0) return typeCompare;

      // Then sort by status within same type
      const statusCompare = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      if (statusCompare !== 0) return statusCompare;

      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return 0;
    });

    return filtered;
  }, [tasks, filterType, filterStatus, filterProject, filterPOC, searchQuery, projects]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex gap-2 sm:gap-3 flex-wrap items-center mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="flex-1 min-w-[150px] sm:min-w-[200px] px-3 sm:px-4 py-2 bg-[#F5F5F7] rounded-lg border-none outline-none focus:ring-2 focus:ring-[#0066CC] text-[#1D1D1F] text-sm"
          />
          <MultiSelect label="Type" options={types} selected={filterType} onChange={setFilterType} />
          <MultiSelect label="Status" options={statuses.map(s => s.name)} selected={filterStatus} onChange={setFilterStatus} />
          <MultiSelect label="Project" options={[{id: null, name: 'No Project'}, ...projects.map(p => ({ id: p.id, name: p.name }))]} selected={filterProject} onChange={setFilterProject} useIds={true} />
          <MultiSelect label="POC" options={persons.map(p => ({ id: p.id, name: p.name }))} selected={filterPOC} onChange={setFilterPOC} useIds={true} />
        </div>
        
        {/* Full-width task creator */}
        <div className="w-full">
          <InlineTaskCreator
            projects={projects}
            types={types}
            statuses={statuses}
            persons={persons}
            getStatusColor={getStatusColor}
            getTypeColor={getTypeColor}
            onAdd={addTaskAdvanced}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-[#F5F5F7] border-b border-gray-200">
                <tr>
                  <th className="w-12 px-4 py-3"></th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">Task</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">Project</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">Type</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">Due In</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">POC</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F] w-48">Notes</th>
                  <th className="w-12 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTasks.map(task => (
                  <TaskTableRow
                    key={task.id}
                    task={task}
                    project={projects.find(p => p.id === task.projectId)}
                    types={types}
                    statuses={statuses}
                    persons={persons}
                    getStatusColor={getStatusColor}
                    getTypeColor={getTypeColor}
                    updateTask={updateTask}
                    toggleTaskDone={toggleTaskDone}
                    deleteTask={deleteTask}
                    onProjectClick={goToProject}
                  />
                ))}
              </tbody>
            </table>
            {filteredAndSortedTasks.length === 0 && (
              <div className="text-center py-12 text-gray-500">No tasks found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// Project Task Table Row Component (for Project View table)
function ProjectTaskTableRow({ task, types, statuses, persons, getStatusColor, getTypeColor, updateTask, toggleTaskDone, deleteTask }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.name);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const statusColor = getStatusColor(task.status);
  const isDone = task.status === 'Done';
  
  const workingDaysLeft = getWorkingDaysUntilDue(task.dueDate);

  const handleSave = () => {
    if (editValue.trim()) {
      updateTask(task.id, 'name', editValue);
    }
    setIsEditing(false);
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    if (newDate) {
      // Convert from YYYY-MM-DD format to DD/MMM format
      const dateObj = new Date(newDate);
      const formattedDate = formatDateToDDMMM(dateObj);
      updateTask(task.id, 'dueDate', formattedDate);
    } else {
      updateTask(task.id, 'dueDate', '');
    }
    setShowDatePicker(false);
  };

  const getDatePickerValue = () => {
    if (!task.dueDate) return '';
    const dateObj = parseDueDate(task.dueDate);
    if (!dateObj) return '';
    return dateObj.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-[#F5F5F7] transition-colors group">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isDone}
          onChange={() => toggleTaskDone(task.id)}
          className="w-5 h-5 rounded border-2 cursor-pointer"
          style={{
            borderColor: statusColor,
            backgroundColor: isDone ? statusColor : 'transparent',
            accentColor: statusColor
          }}
        />
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
            className="w-full px-2 py-1 bg-white rounded outline-none focus:ring-2 focus:ring-[#0066CC]"
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer ${isDone ? 'line-through text-gray-500' : 'text-[#1D1D1F]'}`}
          >
            {task.name}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <TypeDropdown value={task.type} options={types} onChange={(value) => updateTask(task.id, 'type', value)} getTypeColor={getTypeColor} compact={true} />
      </td>
      <td className="px-4 py-3">
        <StatusDropdown value={task.status} options={statuses} onChange={(value) => updateTask(task.id, 'status', value)} getStatusColor={getStatusColor} compact={true} />
      </td>
      <td className="px-4 py-3 relative">
        {showDatePicker ? (
          <input
            type="date"
            value={getDatePickerValue()}
            onChange={handleDateChange}
            onBlur={() => setShowDatePicker(false)}
            autoFocus
            className="w-32 px-2 py-1 bg-white border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#0066CC] text-sm text-[#1D1D1F]"
          />
        ) : (
          <button
            onClick={() => setShowDatePicker(true)}
            className="w-24 px-2 py-1 bg-transparent rounded outline-none hover:bg-[#F5F5F7] focus:bg-white focus:ring-2 focus:ring-[#0066CC] text-sm text-left transition-colors"
          >
            {workingDaysLeft !== null ? (
              <span className={`${
                workingDaysLeft < 0 ? 'text-red-600 font-semibold' : 
                workingDaysLeft === 0 ? 'text-orange-600 font-semibold' :
                workingDaysLeft <= 2 ? 'text-orange-500' :
                'text-[#1D1D1F]'
              }`}>
                {workingDaysLeft === 0 ? 'Due Today' : 
                 workingDaysLeft === 1 ? '1 day' :
                 workingDaysLeft < 0 ? `${Math.abs(workingDaysLeft)} overdue` :
                 `${workingDaysLeft} days`}
              </span>
            ) : (
              <span className="text-gray-400">Add date</span>
            )}
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <POCMultiSelect
          selectedIds={task.personIds || []}
          persons={persons || []}
          onChange={(newPersonIds) => updateTask(task.id, 'personIds', newPersonIds)}
          compact={true}
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={task.notes || ''}
          onChange={(e) => updateTask(task.id, 'notes', e.target.value)}
          placeholder="Add notes..."
          className="w-full px-2 py-1 bg-transparent rounded outline-none focus:bg-white focus:ring-1 focus:ring-[#0066CC] text-xs text-gray-600 hover:bg-[#F5F5F7] transition-colors"
        />
      </td>
      <td className="px-4 py-3">
        <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity">
          <X className="w-4 h-4 text-red-500" />
        </button>
      </td>
    </tr>
  );
}

// Task Row Component (for Project View - DEPRECATED, keeping for reference)
function TaskRow({ task, types, statuses, getStatusColor, getTypeColor, updateTask, toggleTaskDone, deleteTask }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.name);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const statusColor = getStatusColor(task.status);
  const isDone = task.status === 'Done';
  const workingDaysLeft = getWorkingDaysUntilDue(task.dueDate);

  const handleSave = () => {
    if (editValue.trim()) {
      updateTask(task.id, 'name', editValue);
    }
    setIsEditing(false);
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    if (newDate) {
      const dateObj = new Date(newDate);
      const formattedDate = formatDateToDDMMM(dateObj);
      updateTask(task.id, 'dueDate', formattedDate);
    } else {
      updateTask(task.id, 'dueDate', '');
    }
    setShowDatePicker(false);
  };

  const getDatePickerValue = () => {
    if (!task.dueDate) return '';
    const dateObj = parseDueDate(task.dueDate);
    if (!dateObj) return '';
    return dateObj.toISOString().split('T')[0];
  };

  return (
    <div className="group bg-white rounded-lg border border-gray-200 p-4 hover:border-[#0066CC] transition-colors">
      {/* Main task row */}
      <div className="flex items-center gap-3 mb-2">
        <input
          type="checkbox"
          checked={isDone}
          onChange={() => toggleTaskDone(task.id)}
          className="w-5 h-5 rounded border-2 cursor-pointer"
          style={{
            borderColor: statusColor,
            backgroundColor: isDone ? statusColor : 'transparent',
            accentColor: statusColor
          }}
        />

        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
            className="flex-1 px-2 py-1 bg-[#F5F5F7] rounded outline-none focus:ring-2 focus:ring-[#0066CC]"
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={`flex-1 cursor-pointer ${isDone ? 'line-through text-gray-500' : 'text-[#1D1D1F]'}`}
          >
            {task.name}
          </span>
        )}

        <TypeDropdown value={task.type} options={types} onChange={(value) => updateTask(task.id, 'type', value)} getTypeColor={getTypeColor} className="min-w-[100px]" />
        <StatusDropdown value={task.status} options={statuses} onChange={(value) => updateTask(task.id, 'status', value)} getStatusColor={getStatusColor} className="min-w-[120px]" />

        {showDatePicker ? (
          <input
            type="date"
            value={getDatePickerValue()}
            onChange={handleDateChange}
            onBlur={() => setShowDatePicker(false)}
            autoFocus
            className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-[#1D1D1F] outline-none focus:ring-2 focus:ring-[#0066CC]"
          />
        ) : (
          <button
            onClick={() => setShowDatePicker(true)}
            className="px-3 py-1 bg-[#F5F5F7] rounded-full text-sm hover:bg-gray-200 transition-colors"
          >
            {workingDaysLeft !== null ? (
              <span className={`${
                workingDaysLeft < 0 ? 'text-red-600 font-semibold' : 
                workingDaysLeft === 0 ? 'text-orange-600 font-semibold' :
                workingDaysLeft <= 2 ? 'text-orange-500' :
                'text-[#1D1D1F]'
              }`}>
                {workingDaysLeft === 0 ? 'Due Today' : 
                 workingDaysLeft === 1 ? '1 day left' :
                 workingDaysLeft < 0 ? `${Math.abs(workingDaysLeft)} overdue` :
                 `${workingDaysLeft} days left`}
              </span>
            ) : (
              <span className="text-gray-400">Add due date</span>
            )}
          </button>
        )}

        <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity">
          <X className="w-4 h-4 text-red-500" />
        </button>
      </div>

      {/* Notes field */}
      <div className="ml-8">
        <input
          type="text"
          value={task.notes || ''}
          onChange={(e) => updateTask(task.id, 'notes', e.target.value)}
          placeholder="Add notes..."
          className="w-full px-3 py-1 bg-transparent rounded outline-none focus:bg-white focus:ring-1 focus:ring-[#0066CC] text-xs text-gray-600 hover:bg-[#F5F5F7] transition-colors border-none"
        />
      </div>
    </div>
  );
}

// Task Table Row Component (for Task View)
function TaskTableRow({ task, project, types, statuses, persons, getStatusColor, getTypeColor, updateTask, toggleTaskDone, deleteTask, onProjectClick }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.name);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const statusColor = getStatusColor(task.status);
  const isDone = task.status === 'Done';
  
  const workingDaysLeft = getWorkingDaysUntilDue(task.dueDate);

  const handleSave = () => {
    if (editValue.trim()) {
      updateTask(task.id, 'name', editValue);
    }
    setIsEditing(false);
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    if (newDate) {
      // Convert from YYYY-MM-DD format to DD/MMM format
      const dateObj = new Date(newDate);
      const formattedDate = formatDateToDDMMM(dateObj);
      updateTask(task.id, 'dueDate', formattedDate);
    } else {
      updateTask(task.id, 'dueDate', '');
    }
    setShowDatePicker(false);
  };

  const getDatePickerValue = () => {
    if (!task.dueDate) return '';
    const dateObj = parseDueDate(task.dueDate);
    if (!dateObj) return '';
    return dateObj.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-[#F5F5F7] transition-colors group">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isDone}
          onChange={() => toggleTaskDone(task.id)}
          className="w-5 h-5 rounded border-2 cursor-pointer"
          style={{
            borderColor: statusColor,
            backgroundColor: isDone ? statusColor : 'transparent',
            accentColor: statusColor
          }}
        />
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
            className="w-full px-2 py-1 bg-white rounded outline-none focus:ring-2 focus:ring-[#0066CC]"
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer ${isDone ? 'line-through text-gray-500' : 'text-[#1D1D1F]'}`}
          >
            {task.name}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {project ? (
          <button
            onClick={() => onProjectClick(task.projectId)}
            className="px-3 py-1 bg-[#0066CC]/10 text-[#0066CC] rounded-full text-sm hover:bg-[#0066CC]/20 transition-colors"
          >
            {project.name}
          </button>
        ) : (
          <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">No Project</span>
        )}
      </td>
      <td className="px-4 py-3">
        <TypeDropdown value={task.type} options={types} onChange={(value) => updateTask(task.id, 'type', value)} getTypeColor={getTypeColor} compact={true} />
      </td>
      <td className="px-4 py-3">
        <StatusDropdown value={task.status} options={statuses} onChange={(value) => updateTask(task.id, 'status', value)} getStatusColor={getStatusColor} compact={true} />
      </td>
      <td className="px-4 py-3 relative">
        {showDatePicker ? (
          <input
            type="date"
            value={getDatePickerValue()}
            onChange={handleDateChange}
            onBlur={() => setShowDatePicker(false)}
            autoFocus
            className="w-32 px-2 py-1 bg-white border border-gray-300 rounded outline-none focus:ring-2 focus:ring-[#0066CC] text-sm text-[#1D1D1F]"
          />
        ) : (
          <button
            onClick={() => setShowDatePicker(true)}
            className="w-24 px-2 py-1 bg-transparent rounded outline-none hover:bg-[#F5F5F7] focus:bg-white focus:ring-2 focus:ring-[#0066CC] text-sm text-left transition-colors"
          >
            {workingDaysLeft !== null ? (
              <span className={`${
                workingDaysLeft < 0 ? 'text-red-600 font-semibold' : 
                workingDaysLeft === 0 ? 'text-orange-600 font-semibold' :
                workingDaysLeft <= 2 ? 'text-orange-500' :
                'text-[#1D1D1F]'
              }`}>
                {workingDaysLeft === 0 ? 'Due Today' : 
                 workingDaysLeft === 1 ? '1 day' :
                 workingDaysLeft < 0 ? `${Math.abs(workingDaysLeft)} overdue` :
                 `${workingDaysLeft} days`}
              </span>
            ) : (
              <span className="text-gray-400">Add date</span>
            )}
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <POCMultiSelect
          selectedIds={task.personIds || []}
          persons={persons || []}
          onChange={(newIds) => updateTask(task.id, 'personIds', newIds)}
          compact={true}
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={task.notes || ''}
          onChange={(e) => updateTask(task.id, 'notes', e.target.value)}
          placeholder="Add notes..."
          className="w-full px-2 py-1 bg-transparent rounded outline-none focus:bg-white focus:ring-1 focus:ring-[#0066CC] text-xs text-gray-600 hover:bg-[#F5F5F7] transition-colors"
        />
      </td>
      <td className="px-4 py-3">
        <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity">
          <X className="w-4 h-4 text-red-500" />
        </button>
      </td>
    </tr>
  );
}

// Dropdown Component
function Dropdown({ value, options, onChange, className = '', compact = false }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 bg-[#F5F5F7] rounded-lg hover:bg-gray-200 transition-colors ${
          compact ? 'text-sm' : ''
        }`}
      >
        <span className="text-[#1D1D1F]">{value}</span>
        <ChevronDown className="w-4 h-4 text-gray-600" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 max-h-60 overflow-y-auto">
            {options.map(option => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#F5F5F7] text-[#1D1D1F] text-sm"
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Type Dropdown Component
function TypeDropdown({ value, options, onChange, getTypeColor, className = '', compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const typeColor = getTypeColor(value);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity ${
          compact ? 'text-sm' : ''
        }`}
        style={{ backgroundColor: typeColor, color: 'white' }}
      >
        <span>{value}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            {options.map(option => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#F5F5F7] text-sm flex items-center gap-2"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getTypeColor(option) }}
                />
                <span className="text-[#1D1D1F]">{option}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Status Dropdown Component
function StatusDropdown({ value, options, onChange, getStatusColor, className = '', compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const statusColor = getStatusColor(value);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity ${
          compact ? 'text-sm' : ''
        }`}
        style={{ backgroundColor: statusColor, color: statusColor === '#FFD93D' ? '#1D1D1F' : 'white' }}
      >
        <span>{value}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            {options.map(option => (
              <button
                key={option.name}
                onClick={() => {
                  onChange(option.name);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#F5F5F7] text-sm flex items-center gap-2"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
                <span className="text-[#1D1D1F]">{option.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// POC Multi-Select Component (for selecting persons/POC on tasks)
function POCMultiSelect({ selectedIds = [], persons, onChange, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedPersons = persons.filter(p => selectedIds.includes(p.id));
  const displayText = selectedPersons.length === 0 
    ? '-' 
    : selectedPersons.length === 1 
      ? selectedPersons[0].name 
      : `${selectedPersons.length} people`;

  const togglePerson = (personId) => {
    if (selectedIds.includes(personId)) {
      onChange(selectedIds.filter(id => id !== personId));
    } else {
      onChange([...selectedIds, personId]);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-1 px-2 py-1 rounded-lg border border-gray-200 hover:border-[#0066CC] transition-colors bg-white ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      >
        <div className="flex items-center gap-1 overflow-hidden">
          {selectedPersons.length > 0 ? (
            <div className="flex items-center gap-1">
              {selectedPersons.slice(0, 2).map(person => (
                <span
                  key={person.id}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: person.color || '#E5E5E5',
                    color: person.color ? 'white' : '#1D1D1F'
                  }}
                >
                  <User className="w-2.5 h-2.5" />
                  {person.name}
                </span>
              ))}
              {selectedPersons.length > 2 && (
                <span className="text-gray-500 text-xs">+{selectedPersons.length - 2}</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
        <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 max-h-60 overflow-y-auto">
            {/* Unassigned option */}
            <button
              onClick={() => {
                onChange([]);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 hover:bg-[#F5F5F7] text-sm flex items-center gap-2 ${
                selectedIds.length === 0 ? 'bg-[#F5F5F7]' : ''
              }`}
            >
              <span className="text-gray-400">-</span>
              <span className="text-gray-500">Unassigned</span>
            </button>
            
            <div className="border-t border-gray-100 my-1" />
            
            {persons.map(person => (
              <button
                key={person.id}
                onClick={() => togglePerson(person.id)}
                className={`w-full text-left px-3 py-2 hover:bg-[#F5F5F7] text-sm flex items-center gap-2 ${
                  selectedIds.includes(person.id) ? 'bg-blue-50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(person.id)}
                  onChange={() => {}}
                  className="w-4 h-4 rounded border-gray-300 text-[#0066CC]"
                />
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: person.color || '#CCCCCC' }}
                />
                <span className="text-[#1D1D1F]">{person.name}</span>
              </button>
            ))}
            
            {persons.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400 italic">No people in Settings</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Multi-Select Component
function MultiSelect({ label, options, selected, onChange, useIds = false }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option) => {
    const value = useIds ? option.id : option;
    if (selected.includes(value)) {
      onChange(selected.filter(s => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const displayLabel = selected.length > 0 ? `${label} (${selected.length})` : label;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
          selected.length > 0
            ? 'bg-[#0066CC] text-white border-[#0066CC]'
            : 'bg-white text-[#1D1D1F] border-gray-200 hover:border-[#0066CC]'
        }`}
      >
        <span className="text-sm font-medium">{displayLabel}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[200px] max-h-60 overflow-y-auto">
            {options.map(option => {
              const value = useIds ? option.id : option;
              const displayName = useIds ? option.name : option;
              const isSelected = selected.includes(value);

              return (
                <button
                  key={value}
                  onClick={() => toggleOption(option)}
                  className="w-full text-left px-3 py-2 hover:bg-[#F5F5F7] text-sm flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded border-gray-300"
                    style={{ accentColor: '#0066CC' }}
                  />
                  <span className="text-[#1D1D1F]">{displayName}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Calendar View Component
function CalendarView({ projects, tasks, types, statuses, persons, getStatusColor, getTypeColor, getPersonName, updateTask, toggleTaskDone, deleteTask, goToProject }) {
  const [calendarView, setCalendarView] = useState('week'); // 'week' or 'month'
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filter tasks with due dates
  const tasksWithDates = tasks.filter(task => task.dueDate);

  // Get start of week (Monday)
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    return new Date(d.setDate(diff));
  };

  // Generate week days
  const getWeekDays = () => {
    const weekStart = getWeekStart(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Get tasks for a specific date
  const getTasksForDate = (date) => {
    const dateString = formatDateToDDMMM(date);
    return tasksWithDates.filter(task => task.dueDate === dateString);
  };

  const weekDays = getWeekDays();

  const goToNextWeek = () => {
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(currentDate.getDate() + 7);
    setCurrentDate(nextWeek);
  };

  const goToPrevWeek = () => {
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(currentDate.getDate() - 7);
    setCurrentDate(prevWeek);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg sm:text-xl font-semibold text-[#1D1D1F]">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevWeek}
                className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 rotate-180" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3] transition-colors"
              >
                Today
              </button>
              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCalendarView('week')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                calendarView === 'week'
                  ? 'bg-[#0066CC] text-white'
                  : 'text-gray-600 hover:bg-[#F5F5F7]'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setCalendarView('month')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                calendarView === 'month'
                  ? 'bg-[#0066CC] text-white'
                  : 'text-gray-600 hover:bg-[#F5F5F7]'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
            {/* Week Header */}
            <div className="grid grid-cols-7 border-b border-gray-200 min-w-[700px]">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <div key={day} className="p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold text-[#1D1D1F] bg-[#F5F5F7]">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.charAt(0)}</span>
                </div>
              ))}
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 min-h-[300px] sm:min-h-[400px] min-w-[700px]">
              {weekDays.map((day, index) => {
                const dayTasks = getTasksForDate(day);
                const isToday = day.toDateString() === new Date().toDateString();
                
                return (
                  <div key={index} className="border-r border-gray-200 last:border-r-0 p-1 sm:p-2">
                    <div className={`text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${
                      isToday ? 'bg-[#0066CC] text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs' : 'text-[#1D1D1F]'
                    }`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      {dayTasks.map(task => {
                        const project = projects.find(p => p.id === task.projectId);
                        const statusColor = getStatusColor(task.status);
                        
                        // Get person names for this task
                        const taskPersonNames = (task.personIds || [])
                          .map(id => getPersonName(id))
                          .filter(Boolean);
                        
                        return (
                          <div
                            key={task.id}
                            className="p-1 sm:p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ 
                              backgroundColor: `${statusColor}20`,
                              borderLeft: `3px solid ${statusColor}`
                            }}
                            onClick={() => goToProject(task.projectId)}
                          >
                            <div className="font-medium text-[#1D1D1F] truncate" title={task.name}>
                              {task.name}
                            </div>
                            {project && (
                              <div className="text-gray-600 truncate text-xs hidden sm:block" title={project.name}>
                                {project.name}
                              </div>
                            )}
                            {taskPersonNames.length > 0 && (
                              <div className="text-[#0066CC] truncate text-xs hidden sm:flex items-center gap-0.5 mt-0.5" title={taskPersonNames.join(', ')}>
                                <User className="w-3 h-3 flex-shrink-0" />
                                {taskPersonNames.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Person View Component - Accordion layout showing tasks grouped by person
function PersonView({ 
  projects, 
  tasks, 
  persons, 
  types, 
  statuses, 
  getStatusColor, 
  getTypeColor, 
  getPersonColor, 
  updateTask, 
  toggleTaskDone, 
  deleteTask, 
  goToProject,
  addTaskAdvanced
}) {
  // Track which persons are expanded (default: all expanded)
  const [expandedPersons, setExpandedPersons] = useState(
    persons.reduce((acc, person) => ({ ...acc, [person.id]: true }), {})
  );

  // Toggle individual person
  const togglePerson = (personId) => {
    setExpandedPersons(prev => ({
      ...prev,
      [personId]: !prev[personId]
    }));
  };

  // Expand all
  const expandAll = () => {
    setExpandedPersons(
      persons.reduce((acc, person) => ({ ...acc, [person.id]: true }), {})
    );
  };

  // Collapse all
  const collapseAll = () => {
    setExpandedPersons(
      persons.reduce((acc, person) => ({ ...acc, [person.id]: false }), {})
    );
  };

  // Get tasks for a person
  const getTasksForPerson = (personId) => {
    // Type priority: Urgent > Regular > Admin > Weekend > Backlog
    const typeOrder = { 'Urgent': 1, 'Regular': 2, 'Admin': 3, 'Weekend': 4, 'Backlog': 5 };
    // Status priority: Must do > My action > Waiting others > Done (at bottom)
    const statusOrder = { 'Must do': 1, 'My action': 2, 'Waiting others': 3, 'Done': 99 };
    
    return tasks
      .filter(task => task.personIds && task.personIds.includes(personId))
      .sort((a, b) => {
        // Done tasks always at bottom
        if (a.status === 'Done' && b.status !== 'Done') return 1;
        if (a.status !== 'Done' && b.status === 'Done') return -1;
        
        // Sort by type first
        const typeCompare = (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
        if (typeCompare !== 0) return typeCompare;
        
        // Then sort by status within same type
        const statusCompare = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        return statusCompare;
      });
  };

  // Get project name
  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F5F7]">
      <div className="mx-4 py-4">
        {/* Header with expand/collapse buttons */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
            <Users className="w-5 h-5" />
            Tasks by Person
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-[#F5F5F7] transition-colors"
              title="Expand all"
            >
              <ChevronsDown className="w-4 h-4" />
              <span className="hidden sm:inline">Expand All</span>
            </button>
            <button
              onClick={collapseAll}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-[#F5F5F7] transition-colors"
              title="Collapse all"
            >
              <ChevronsUp className="w-4 h-4" />
              <span className="hidden sm:inline">Collapse All</span>
            </button>
          </div>
        </div>

        {/* Person accordion cards */}
        <div className="space-y-3">
          {persons.map(person => {
            const personTasks = getTasksForPerson(person.id);
            const isExpanded = expandedPersons[person.id] !== false; // Default to expanded

            return (
              <div key={person.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Person header */}
                <button
                  onClick={() => togglePerson(person.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#F5F5F7] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: person.color || '#E5E5E5',
                        color: person.color ? 'white' : '#1D1D1F'
                      }}
                    >
                      <User className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-[#1D1D1F]">{person.name}</h3>
                      <p className="text-sm text-gray-500">{personTasks.length} task{personTasks.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                  />
                </button>

                {/* Tasks list */}
                {isExpanded && personTasks.length > 0 && (
                  <div className="border-t border-gray-100">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[#F5F5F7] text-xs text-gray-500 uppercase">
                          <th className="text-left px-4 py-2 font-medium">Task</th>
                          <th className="text-left px-4 py-2 font-medium">Project</th>
                          <th className="text-left px-4 py-2 font-medium">Type</th>
                          <th className="text-left px-4 py-2 font-medium">Status</th>
                          <th className="text-left px-4 py-2 font-medium">Due In</th>
                        </tr>
                      </thead>
                      <tbody>
                        {personTasks.map(task => (
                          <tr key={task.id} className="border-t border-gray-100 hover:bg-[#F5F5F7]">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={task.status === 'Done'}
                                  onChange={() => toggleTaskDone(task.id)}
                                  className="w-4 h-4 rounded border-gray-300 text-[#0066CC]"
                                />
                                <span className={`text-sm ${task.status === 'Done' ? 'line-through text-gray-400' : 'text-[#1D1D1F]'}`}>
                                  {task.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => goToProject(task.projectId)}
                                className="text-sm text-[#0066CC] hover:underline"
                              >
                                {getProjectName(task.projectId)}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="px-2 py-1 rounded text-xs font-medium"
                                style={{ backgroundColor: getTypeColor(task.type), color: 'white' }}
                              >
                                {task.type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="px-2 py-1 rounded text-xs font-medium"
                                style={{ 
                                  backgroundColor: getStatusColor(task.status), 
                                  color: getStatusColor(task.status) === '#FFD93D' ? '#1D1D1F' : 'white' 
                                }}
                              >
                                {task.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {task.dueDate ? getWorkingDaysUntilDue(task.dueDate) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Empty state */}
                {isExpanded && personTasks.length === 0 && (
                  <div className="border-t border-gray-100 p-4 text-center text-gray-400 text-sm">
                    No tasks assigned to {person.name}
                  </div>
                )}

                {/* Add task for this person */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-3">
                    <PersonTaskCreator
                      projects={projects}
                      types={types}
                      statuses={statuses}
                      persons={persons}
                      getStatusColor={getStatusColor}
                      getTypeColor={getTypeColor}
                      onAdd={addTaskAdvanced}
                      defaultPersonId={person.id}
                      personName={person.name}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty state when no persons */}
          {persons.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-[#1D1D1F] mb-2">No People Added</h3>
              <p className="text-gray-500 text-sm">
                Add people in Settings to track tasks by contact person.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Settings Modal Component (SMALLER - 20% reduction)
function SettingsModal({ types, setTypes, statuses, setStatuses, persons, setPersons, onClose }) {
  const [newType, setNewType] = useState('');
  const [newStatus, setNewStatus] = useState({ name: '', color: '#0066CC' });
  const [newPerson, setNewPerson] = useState({ name: '', color: '' });

  const addType = () => {
    if (newType.trim() && !types.includes(newType.trim())) {
      setTypes([...types, newType.trim()]);
      setNewType('');
    }
  };

  const removeType = (type) => {
    setTypes(types.filter(t => t !== type));
  };

  const addStatus = () => {
    if (newStatus.name.trim() && !statuses.find(s => s.name === newStatus.name.trim())) {
      setStatuses([...statuses, { name: newStatus.name.trim(), color: newStatus.color }]);
      setNewStatus({ name: '', color: '#0066CC' });
    }
  };

  const removeStatus = (statusName) => {
    setStatuses(statuses.filter(s => s.name !== statusName));
  };

  const updateStatusColor = (statusName, color) => {
    setStatuses(statuses.map(s =>
      s.name === statusName ? { ...s, color } : s
    ));
  };

  // Person functions
  const addPerson = () => {
    if (newPerson.name.trim() && !persons.find(p => p.name === newPerson.name.trim())) {
      setPersons([...persons, { 
        name: newPerson.name.trim(), 
        color: newPerson.color || null,
        order: persons.length 
      }]);
      setNewPerson({ name: '', color: '' });
    }
  };

  const removePerson = (personName) => {
    setPersons(persons.filter(p => p.name !== personName));
  };

  const updatePersonColor = (personName, color) => {
    setPersons(persons.map(p =>
      p.name === personName ? { ...p, color: color || null } : p
    ));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md my-8 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Task Types Section */}
          <div>
            <h3 className="text-sm font-semibold text-[#1D1D1F] mb-3">Task Types</h3>
            <div className="space-y-1.5 mb-3">
              {types.map(type => (
                <div key={type} className="flex items-center justify-between p-2 bg-[#F5F5F7] rounded-lg">
                  <span className="text-sm text-[#1D1D1F]">{type}</span>
                  <button onClick={() => removeType(type)} className="p-1 hover:bg-red-100 rounded transition-colors">
                    <X className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addType()}
                placeholder="New type name..."
                className="flex-1 px-3 py-2 text-sm bg-[#F5F5F7] rounded-lg border-none outline-none focus:ring-2 focus:ring-[#0066CC] text-[#1D1D1F]"
              />
              <button onClick={addType} className="px-4 py-2 text-sm bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3] transition-colors font-medium">
                Add
              </button>
            </div>
          </div>

          {/* Task Statuses Section */}
          <div>
            <h3 className="text-sm font-semibold text-[#1D1D1F] mb-3">Task Statuses</h3>
            <div className="space-y-1.5 mb-3">
              {statuses.map(status => (
                <div key={status.name} className="flex items-center justify-between p-2 bg-[#F5F5F7] rounded-lg">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={status.color}
                      onChange={(e) => updateStatusColor(status.name, e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border-2 border-gray-300"
                    />
                    <div
                      className="px-3 py-1 rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor: status.color,
                        color: status.color === '#FFD93D' ? '#1D1D1F' : 'white'
                      }}
                    >
                      {status.name}
                    </div>
                  </div>
                  <button onClick={() => removeStatus(status.name)} className="p-1 hover:bg-red-100 rounded transition-colors">
                    <X className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newStatus.name}
                onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && addStatus()}
                placeholder="New status name..."
                className="flex-1 px-3 py-2 text-sm bg-[#F5F5F7] rounded-lg border-none outline-none focus:ring-2 focus:ring-[#0066CC] text-[#1D1D1F]"
              />
              <input
                type="color"
                value={newStatus.color}
                onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border-2 border-gray-300"
              />
              <button onClick={addStatus} className="px-4 py-2 text-sm bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3] transition-colors font-medium">
                Add
              </button>
            </div>
          </div>

          {/* People (POC) Section */}
          <div>
            <h3 className="text-sm font-semibold text-[#1D1D1F] mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              People (Point of Contact)
            </h3>
            <div className="space-y-1.5 mb-3">
              {persons.map(person => (
                <div key={person.name} className="flex items-center justify-between p-2 bg-[#F5F5F7] rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={person.color || '#CCCCCC'}
                        onChange={(e) => updatePersonColor(person.name, e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border-2 border-gray-300"
                        title="Set color"
                      />
                      {person.color && (
                        <button
                          onClick={() => updatePersonColor(person.name, null)}
                          className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors"
                          title="Remove color"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div
                      className="px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                      style={{
                        backgroundColor: person.color || '#F5F5F7',
                        color: person.color ? 'white' : '#1D1D1F',
                        border: person.color ? 'none' : '1px solid #E5E5E5'
                      }}
                    >
                      <User className="w-3 h-3" />
                      {person.name}
                    </div>
                    {!person.color && (
                      <span className="text-xs text-gray-400">(no color)</span>
                    )}
                  </div>
                  <button onClick={() => removePerson(person.name)} className="p-1 hover:bg-red-100 rounded transition-colors">
                    <X className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ))}
              {persons.length === 0 && (
                <p className="text-sm text-gray-400 italic py-2">No people added yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPerson.name}
                onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && addPerson()}
                placeholder="Person name..."
                className="flex-1 px-3 py-2 text-sm bg-[#F5F5F7] rounded-lg border-none outline-none focus:ring-2 focus:ring-[#0066CC] text-[#1D1D1F]"
              />
              <input
                type="color"
                value={newPerson.color || '#CCCCCC'}
                onChange={(e) => setNewPerson({ ...newPerson, color: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border-2 border-gray-300"
                title="Color (optional)"
              />
              <button onClick={addPerson} className="px-4 py-2 text-sm bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3] transition-colors font-medium">
                Add
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Color is optional - people without color will show as gray.</p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3] transition-colors font-medium text-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
