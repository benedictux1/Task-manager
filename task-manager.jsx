import React, { useState, useMemo, useRef } from 'react';
import { Plus, Settings, X, ChevronDown, ChevronRight, Bold, Italic, List, ListOrdered, Highlighter, Indent, Outdent } from 'lucide-react';

// Main App Component
export default function TaskManagerApp() {
  const [currentView, setCurrentView] = useState('project'); // 'project' or 'task'
  const [selectedProjectId, setSelectedProjectId] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  // Task Types
  const [types, setTypes] = useState([
    'Admin', 'Urgent', 'Regular', 'Night', 'Weekend', 'Backlog', 'Others'
  ]);

  // Task Statuses with colors
  const [statuses, setStatuses] = useState([
    { name: 'Must do', color: '#FF6B6B' },
    { name: 'Waiting others', color: '#1D1D1F' },
    { name: 'My action', color: '#FFD93D' },
    { name: 'Done', color: '#6BCF7F' }
  ]);

  // Projects
  const [projects, setProjects] = useState([
    {
      id: 1,
      name: 'Website Redesign',
      notes: '<p>Modernize company website with new branding.</p><h3>Key objectives:</h3><ul><li>Improve mobile responsiveness</li><li>Update color scheme to match new brand guidelines</li><li>Optimize page load speed</li></ul><p><strong>Stakeholders:</strong> Marketing team, Design team, Dev team</p><p><mark>Deadline: End of Q1</mark></p>'
    },
    {
      id: 2,
      name: 'Q1 Planning',
      notes: '<p>Strategic planning for Q1 2026.</p><h3>Focus areas:</h3><ol><li>Revenue targets</li><li>Team expansion</li><li>Product roadmap priorities</li></ol><p><strong>Meeting notes from 1/15:</strong> Board approved budget increase for hiring.</p>'
    },
    {
      id: 3,
      name: 'Client Onboarding System',
      notes: '<p>Build automated onboarding flow for new clients.</p><h3>Requirements:</h3><ul><li>Welcome email sequence</li><li>Documentation portal</li><li>Kickoff meeting scheduler</li><li>Contract signing workflow</li></ul>'
    }
  ]);

  // Tasks
  const [tasks, setTasks] = useState([
    { id: 1, name: 'Review design mockups', projectId: 1, type: 'Urgent', status: 'Must do', dueDate: '1/25', notes: '' },
    { id: 2, name: 'Update homepage copy', projectId: 1, type: 'Regular', status: 'My action', dueDate: '1/28', notes: '' },
    { id: 3, name: 'Get feedback from CEO', projectId: 1, type: 'Regular', status: 'Waiting others', dueDate: '', notes: '' },
    { id: 4, name: 'Finalize Q1 OKRs', projectId: 2, type: 'Urgent', status: 'Must do', dueDate: '1/24', notes: '' },
    { id: 5, name: 'Schedule team kickoff', projectId: 2, type: 'Admin', status: 'My action', dueDate: '1/27', notes: '' },
    { id: 6, name: 'Review budget proposals', projectId: 2, type: 'Regular', status: 'Done', dueDate: '1/20', notes: '' },
    { id: 7, name: 'Draft welcome email template', projectId: 3, type: 'Regular', status: 'My action', dueDate: '', notes: '' },
    { id: 8, name: 'Build documentation site', projectId: 3, type: 'Backlog', status: 'Waiting others', dueDate: '', notes: '' },
  ]);

  const [newTaskInput, setNewTaskInput] = useState('');

  // Get status color
  const getStatusColor = (statusName) => {
    const status = statuses.find(s => s.name === statusName);
    return status ? status.color : '#1D1D1F';
  };

  // Add new project
  const addProject = () => {
    const newId = Math.max(...projects.map(p => p.id), 0) + 1;
    const newProject = {
      id: newId,
      name: 'New Project',
      notes: ''
    };
    setProjects([...projects, newProject]);
    setSelectedProjectId(newId);
  };

  // Update project
  const updateProject = (id, field, value) => {
    setProjects(projects.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  // Delete project
  const deleteProject = (id) => {
    if (projects.length === 1) return; // Keep at least one project
    setProjects(projects.filter(p => p.id !== id));
    setTasks(tasks.filter(t => t.projectId !== id));
    if (selectedProjectId === id) {
      setSelectedProjectId(projects.find(p => p.id !== id).id);
    }
  };

  // Add new task
  const addTask = (projectId) => {
    if (!newTaskInput.trim()) return;
    const newId = Math.max(...tasks.map(t => t.id), 0) + 1;
    const newTask = {
      id: newId,
      name: newTaskInput,
      projectId: projectId,
      type: 'Regular',
      status: 'My action',
      dueDate: '',
      notes: ''
    };
    setTasks([...tasks, newTask]);
    setNewTaskInput('');
  };

  // Update task
  const updateTask = (id, field, value) => {
    setTasks(tasks.map(t =>
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  // Toggle task completion
  const toggleTaskDone = (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const doneStatus = statuses.find(s => s.name === 'Done');
    const defaultStatus = statuses.find(s => s.name !== 'Done');

    if (task.status === 'Done') {
      updateTask(id, 'status', defaultStatus?.name || 'My action');
    } else {
      updateTask(id, 'status', doneStatus?.name || 'Done');
    }
  };

  // Delete task
  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="h-screen bg-[#F5F5F7] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#1D1D1F]">Task Manager</h1>
        <div className="flex items-center gap-4">
          <div className="flex bg-[#F5F5F7] rounded-lg p-1">
            <button
              onClick={() => setCurrentView('project')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'project'
                  ? 'bg-white text-[#0066CC] shadow-sm'
                  : 'text-gray-600 hover:text-[#1D1D1F]'
              }`}
            >
              Project View
            </button>
            <button
              onClick={() => setCurrentView('task')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'task'
                  ? 'bg-white text-[#0066CC] shadow-sm'
                  : 'text-gray-600 hover:text-[#1D1D1F]'
              }`}
            >
              Task View
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

      {/* Main Content */}
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
          getStatusColor={getStatusColor}
          addTask={addTask}
          updateTask={updateTask}
          toggleTaskDone={toggleTaskDone}
          deleteTask={deleteTask}
          newTaskInput={newTaskInput}
          setNewTaskInput={setNewTaskInput}
        />
      ) : (
        <TaskView
          projects={projects}
          tasks={tasks}
          types={types}
          statuses={statuses}
          getStatusColor={getStatusColor}
          updateTask={updateTask}
          toggleTaskDone={toggleTaskDone}
          deleteTask={deleteTask}
          setCurrentView={setCurrentView}
          setSelectedProjectId={setSelectedProjectId}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          types={types}
          setTypes={setTypes}
          statuses={statuses}
          setStatuses={setStatuses}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// Project View Component
function ProjectView({
  projects, selectedProjectId, setSelectedProjectId, addProject, updateProject, deleteProject,
  tasks, types, statuses, getStatusColor, addTask, updateTask, toggleTaskDone, deleteTask,
  newTaskInput, setNewTaskInput
}) {
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectTasks = tasks.filter(t => t.projectId === selectedProjectId);

  // Sort tasks: Done at bottom
  const sortedTasks = useMemo(() => {
    return [...projectTasks].sort((a, b) => {
      if (a.status === 'Done' && b.status !== 'Done') return 1;
      if (a.status !== 'Done' && b.status === 'Done') return -1;
      return 0;
    });
  }, [projectTasks]);

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Sidebar Trigger Area */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 z-30"
        onMouseEnter={() => setSidebarVisible(true)}
      />

      {/* Sidebar - Slides in on hover */}
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* Project Title */}
          <input
            type="text"
            value={selectedProject?.name || ''}
            onChange={(e) => updateProject(selectedProjectId, 'name', e.target.value)}
            className="text-4xl font-bold text-[#1D1D1F] bg-transparent border-none outline-none w-full mb-8 focus:ring-0"
            placeholder="Project Name"
          />

          {/* Tasks Section - MOVED ABOVE NOTES */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-[#1D1D1F] mb-4">Tasks</h3>
            <div className="space-y-2 mb-4">
              {sortedTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  types={types}
                  statuses={statuses}
                  getStatusColor={getStatusColor}
                  updateTask={updateTask}
                  toggleTaskDone={toggleTaskDone}
                  deleteTask={deleteTask}
                  showProject={false}
                />
              ))}
            </div>

            {/* Add Task Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTask(selectedProjectId)}
                placeholder="Add a new task..."
                className="flex-1 px-4 py-3 bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#0066CC] text-[#1D1D1F]"
              />
              <button
                onClick={() => addTask(selectedProjectId)}
                className="px-6 py-3 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3] transition-colors font-medium"
              >
                Add Task
              </button>
            </div>
          </div>

          {/* Project Notes - NOW BELOW TASKS */}
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

// Rich Text Notes Section Component
function RichTextNotesSection({ selectedProject, selectedProjectId, updateProject, notesExpanded, setNotesExpanded }) {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
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

  return (
    <div>
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
          {/* Rich Text Toolbar - Shows when focused */}
          {isFocused && (
            <div className="mb-4 pb-3 border-b border-gray-200 flex items-center gap-1 flex-wrap">
              <ToolbarButton
                icon={<Bold className="w-4 h-4" />}
                onClick={() => applyFormat('bold')}
                tooltip="Bold"
              />
              <ToolbarButton
                icon={<Italic className="w-4 h-4" />}
                onClick={() => applyFormat('italic')}
                tooltip="Italic"
              />
              <ToolbarButton
                icon={<span className="text-sm font-semibold">U</span>}
                onClick={() => applyFormat('underline')}
                tooltip="Underline"
              />

              <div className="w-px h-6 bg-gray-300 mx-1" />

              <ToolbarButton
                icon={<Highlighter className="w-4 h-4" />}
                onClick={() => applyFormat('hiliteColor', '#FFD93D')}
                tooltip="Highlight"
              />

              <div className="w-px h-6 bg-gray-300 mx-1" />

              <ToolbarButton
                icon={<List className="w-4 h-4" />}
                onClick={() => insertList(false)}
                tooltip="Bullet List"
              />
              <ToolbarButton
                icon={<ListOrdered className="w-4 h-4" />}
                onClick={() => insertList(true)}
                tooltip="Numbered List"
              />

              <div className="w-px h-6 bg-gray-300 mx-1" />

              <ToolbarButton
                icon={<Indent className="w-4 h-4" />}
                onClick={() => applyFormat('indent')}
                tooltip="Indent"
              />
              <ToolbarButton
                icon={<Outdent className="w-4 h-4" />}
                onClick={() => applyFormat('outdent')}
                tooltip="Outdent"
              />

              <div className="w-px h-6 bg-gray-300 mx-1" />

              <select
                onChange={(e) => {
                  applyFormat('formatBlock', e.target.value);
                  e.target.value = '';
                }}
                className="px-2 py-1 bg-white rounded border border-gray-300 text-sm text-[#1D1D1F] cursor-pointer hover:bg-gray-50"
                defaultValue=""
              >
                <option value="" disabled>Style</option>
                <option value="p">Normal</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
              </select>
            </div>
          )}

          {/* Rich Text Editor */}
          <style>{`
            [contenteditable] h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
            [contenteditable] h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; }
            [contenteditable] h3 { font-size: 1.17em; font-weight: bold; margin: 0.83em 0; }
            [contenteditable] ul { list-style-type: disc; margin-left: 1.5em; margin-top: 0.5em; margin-bottom: 0.5em; }
            [contenteditable] ol { list-style-type: decimal; margin-left: 1.5em; margin-top: 0.5em; margin-bottom: 0.5em; }
            [contenteditable] li { margin: 0.25em 0; }
            [contenteditable] p { margin: 0.5em 0; }
            [contenteditable] strong { font-weight: 600; }
            [contenteditable] em { font-style: italic; }
            [contenteditable] u { text-decoration: underline; }
            [contenteditable] mark { background-color: #FFD93D; padding: 2px 4px; border-radius: 3px; }
            [contenteditable]:empty:before {
              content: attr(data-placeholder);
              color: #9CA3AF;
              pointer-events: none;
            }
          `}</style>
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            dangerouslySetInnerHTML={{ __html: selectedProject?.notes || '' }}
            className="w-full min-h-[250px] py-4 border-none outline-none text-[#1D1D1F] overflow-y-auto"
            data-placeholder="Add project notes, context, meeting notes..."
          />
        </div>
      )}
    </div>
  );
}

// Toolbar Button Component
function ToolbarButton({ icon, onClick, tooltip }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-2 hover:bg-[#F5F5F7] rounded transition-colors text-[#1D1D1F] hover:text-[#0066CC]"
      title={tooltip}
    >
      {icon}
    </button>
  );
}

// Task View Component
function TaskView({
  projects, tasks, types, statuses, getStatusColor, updateTask, toggleTaskDone, deleteTask,
  setCurrentView, setSelectedProjectId
}) {
  const [filterType, setFilterType] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterProject, setFilterProject] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('priority'); // priority, name, project, type, status, dueDate
  const [sortOrder, setSortOrder] = useState('asc');

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      if (filterType.length > 0 && !filterType.includes(task.type)) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(task.status)) return false;
      if (filterProject.length > 0 && !filterProject.includes(task.projectId)) return false;
      if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      // Always put Done tasks at bottom
      if (a.status === 'Done' && b.status !== 'Done') return 1;
      if (a.status !== 'Done' && b.status === 'Done') return -1;

      if (sortBy === 'priority') {
        // Type priority
        const typeOrder = { 'Urgent': 1, 'Admin': 2, 'Regular': 3, 'Night': 4, 'Weekend': 5, 'Backlog': 6, 'Others': 7 };
        const typeCompare = (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
        if (typeCompare !== 0) return typeCompare;

        // Status priority
        const statusOrder = { 'Must do': 1, 'My action': 2, 'Waiting others': 3, 'Done': 4 };
        const statusCompare = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        if (statusCompare !== 0) return statusCompare;

        // Due date
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        return 0;
      }

      if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }

      if (sortBy === 'project') {
        const projectA = projects.find(p => p.id === a.projectId)?.name || '';
        const projectB = projects.find(p => p.id === b.projectId)?.name || '';
        return sortOrder === 'asc'
          ? projectA.localeCompare(projectB)
          : projectB.localeCompare(projectA);
      }

      return 0;
    });

    return filtered;
  }, [tasks, filterType, filterStatus, filterProject, searchQuery, sortBy, sortOrder, projects]);

  const handleProjectClick = (projectId) => {
    setSelectedProjectId(projectId);
    setCurrentView('project');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filters */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="flex-1 min-w-[200px] px-4 py-2 bg-[#F5F5F7] rounded-lg border-none outline-none focus:ring-2 focus:ring-[#0066CC] text-[#1D1D1F]"
          />
          <MultiSelect
            label="Type"
            options={types}
            selected={filterType}
            onChange={setFilterType}
          />
          <MultiSelect
            label="Status"
            options={statuses.map(s => s.name)}
            selected={filterStatus}
            onChange={setFilterStatus}
          />
          <MultiSelect
            label="Project"
            options={projects.map(p => ({ id: p.id, name: p.name }))}
            selected={filterProject}
            onChange={setFilterProject}
            useIds={true}
          />
        </div>
      </div>

      {/* Task Table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F5F5F7] border-b border-gray-200">
                <tr>
                  <th className="w-12 px-4 py-3"></th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">Task</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">Project</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">Type</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-[#1D1D1F]">Due Date</th>
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
                    getStatusColor={getStatusColor}
                    updateTask={updateTask}
                    toggleTaskDone={toggleTaskDone}
                    deleteTask={deleteTask}
                    onProjectClick={handleProjectClick}
                  />
                ))}
              </tbody>
            </table>
            {filteredAndSortedTasks.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No tasks found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Task Row Component (for Project View)
function TaskRow({ task, types, statuses, getStatusColor, updateTask, toggleTaskDone, deleteTask, showProject = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.name);
  const statusColor = getStatusColor(task.status);
  const isDone = task.status === 'Done';

  const handleSave = () => {
    if (editValue.trim()) {
      updateTask(task.id, 'name', editValue);
    }
    setIsEditing(false);
  };

  return (
    <div className="group bg-white rounded-lg border border-gray-200 p-4 hover:border-[#0066CC] transition-colors flex items-center gap-3">
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

      <Dropdown
        value={task.type}
        options={types}
        onChange={(value) => updateTask(task.id, 'type', value)}
        className="min-w-[100px]"
      />

      <StatusDropdown
        value={task.status}
        options={statuses}
        onChange={(value) => updateTask(task.id, 'status', value)}
        getStatusColor={getStatusColor}
        className="min-w-[120px]"
      />

      {task.dueDate && (
        <span className="px-3 py-1 bg-[#F5F5F7] rounded-full text-sm text-[#1D1D1F]">
          {task.dueDate}
        </span>
      )}

      <button
        onClick={() => deleteTask(task.id)}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
      >
        <X className="w-4 h-4 text-red-500" />
      </button>
    </div>
  );
}

// Task Table Row Component (for Task View)
function TaskTableRow({ task, project, types, statuses, getStatusColor, updateTask, toggleTaskDone, deleteTask, onProjectClick }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.name);
  const statusColor = getStatusColor(task.status);
  const isDone = task.status === 'Done';

  const handleSave = () => {
    if (editValue.trim()) {
      updateTask(task.id, 'name', editValue);
    }
    setIsEditing(false);
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
        <button
          onClick={() => onProjectClick(task.projectId)}
          className="px-3 py-1 bg-[#0066CC]/10 text-[#0066CC] rounded-full text-sm hover:bg-[#0066CC]/20 transition-colors"
        >
          {project?.name || 'Unknown'}
        </button>
      </td>
      <td className="px-4 py-3">
        <Dropdown
          value={task.type}
          options={types}
          onChange={(value) => updateTask(task.id, 'type', value)}
          compact={true}
        />
      </td>
      <td className="px-4 py-3">
        <StatusDropdown
          value={task.status}
          options={statuses}
          onChange={(value) => updateTask(task.id, 'status', value)}
          getStatusColor={getStatusColor}
          compact={true}
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={task.dueDate}
          onChange={(e) => updateTask(task.id, 'dueDate', e.target.value)}
          placeholder="Add date"
          className="w-24 px-2 py-1 bg-transparent rounded outline-none focus:bg-white focus:ring-2 focus:ring-[#0066CC] text-sm text-[#1D1D1F]"
        />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => deleteTask(task.id)}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
        >
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

// Settings Modal Component
function SettingsModal({ types, setTypes, statuses, setStatuses, onClose }) {
  const [newType, setNewType] = useState('');
  const [newStatus, setNewStatus] = useState({ name: '', color: '#0066CC' });

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-semibold text-[#1D1D1F]">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Task Types */}
          <div>
            <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4">Task Types</h3>
            <div className="space-y-2 mb-4">
              {types.map(type => (
                <div key={type} className="flex items-center justify-between p-3 bg-[#F5F5F7] rounded-lg">
                  <span className="text-[#1D1D1F]">{type}</span>
                  <button
                    onClick={() => removeType(type)}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-red-500" />
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
                className="flex-1 px-4 py-2 bg-[#F5F5F7] rounded-lg border-none outline-none focus:ring-2 focus:ring-[#0066CC] text-[#1D1D1F]"
              />
              <button
                onClick={addType}
                className="px-6 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3] transition-colors font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {/* Task Statuses */}
          <div>
            <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4">Task Statuses</h3>
            <div className="space-y-2 mb-4">
              {statuses.map(status => (
                <div key={status.name} className="flex items-center justify-between p-3 bg-[#F5F5F7] rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={status.color}
                      onChange={(e) => updateStatusColor(status.name, e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-2 border-gray-300"
                    />
                    <div
                      className="px-4 py-1.5 rounded-lg text-sm font-medium"
                      style={{
                        backgroundColor: status.color,
                        color: status.color === '#FFD93D' ? '#1D1D1F' : 'white'
                      }}
                    >
                      {status.name}
                    </div>
                  </div>
                  <button
                    onClick={() => removeStatus(status.name)}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-red-500" />
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
                className="flex-1 px-4 py-2 bg-[#F5F5F7] rounded-lg border-none outline-none focus:ring-2 focus:ring-[#0066CC] text-[#1D1D1F]"
              />
              <input
                type="color"
                value={newStatus.color}
                onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer border-2 border-gray-300"
              />
              <button
                onClick={addStatus}
                className="px-6 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3] transition-colors font-medium"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3] transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}