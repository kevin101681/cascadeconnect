import React, { useState, useEffect } from 'react';
import { Task, InternalEmployee, Claim, Homeowner, ClaimStatus } from '../types';
import Button from './Button';
import { Check, Plus, User, Calendar, Trash2, Home, CheckCircle, Square, CheckSquare, HardHat, FileText, Edit2, X } from 'lucide-react';
import StatusBadge from './StatusBadge';
import TaskTemplateManager, { TaskTemplate } from './TaskTemplateManager';

type TaskFilter = 'all' | 'open' | 'closed';

interface TaskListProps {
  tasks: Task[];
  employees: InternalEmployee[];
  currentUser: InternalEmployee; // Simulating logged in admin
  claims: Claim[];
  homeowners: Homeowner[];
  onAddTask: (task: Partial<Task>) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  preSelectedHomeowner?: Homeowner | null;
  onClose?: () => void;
  onSelectClaim?: (claim: Claim) => void; // Handler to open claim in editor modal
  onSelectTask?: (task: Task) => void; // Handler to open task in detail modal
}

const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  employees, 
  currentUser,
  claims,
  homeowners, 
  onAddTask, 
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  preSelectedHomeowner,
  onClose,
  onSelectClaim,
  onSelectTask
}) => {
  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('open');
  
  // Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(currentUser.id);
  const [newTaskNotes, setNewTaskNotes] = useState('');
  
  // New State for Linking Claims
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);

  // Filter to only show tasks assigned to the current user, then apply status filter
  const userTasks = tasks.filter(t => t.assignedToId === currentUser.id);
  const filteredTasks = userTasks.filter(task => {
    if (taskFilter === 'open') return !task.isCompleted;
    if (taskFilter === 'closed') return task.isCompleted;
    return true; // 'all'
  });

  // Get open claims for selected homeowner (only if context exists)
  const openClaims = preSelectedHomeowner 
    ? claims.filter(c => {
        const claimEmail = c.homeownerEmail?.toLowerCase().trim() || '';
        const homeownerEmail = preSelectedHomeowner.email?.toLowerCase().trim() || '';
        return claimEmail === homeownerEmail && c.status !== ClaimStatus.COMPLETED;
      })
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTask({
      title: newTaskTitle,
      assignedToId: newTaskAssignee,
      description: newTaskNotes,
      assignedById: currentUser.id,
      isCompleted: false,
      relatedClaimIds: selectedClaimIds
    });
    
    // Reset Form
    setNewTaskTitle('');
    setNewTaskNotes('');
    setNewTaskAssignee(currentUser.id);
    setSelectedClaimIds([]);
    setShowForm(false);
  };

  const toggleClaimSelection = (claimId: string) => {
    setSelectedClaimIds(prev => 
      prev.includes(claimId) 
        ? prev.filter(id => id !== claimId) 
        : [...prev, claimId]
    );
  };

  // Process template with placeholders
  const processTemplate = (template: TaskTemplate): { title: string; description: string } => {
    let title = template.title;
    let description = template.description || '';

    // Replace placeholders with actual values
    if (preSelectedHomeowner) {
      title = title.replace(/{homeownerName}/g, preSelectedHomeowner.name || 'Homeowner');
      title = title.replace(/{homeownerEmail}/g, preSelectedHomeowner.email || '');
    }

    // Replace claim placeholders if claims are selected
    if (selectedClaimIds.length > 0) {
      const selectedClaims = claims.filter(c => selectedClaimIds.includes(c.id));
      if (selectedClaims.length > 0) {
        const claimTitles = selectedClaims.map(c => c.title).join(', ');
        title = title.replace(/{claimTitle}/g, claimTitles);
        title = title.replace(/{claimTitles}/g, claimTitles);
      }
    }

    // Replace date placeholder
    const today = new Date().toLocaleDateString();
    title = title.replace(/{date}/g, today);
    title = title.replace(/{today}/g, today);

    // Process description similarly
    if (preSelectedHomeowner) {
      description = description.replace(/{homeownerName}/g, preSelectedHomeowner.name || 'Homeowner');
      description = description.replace(/{homeownerEmail}/g, preSelectedHomeowner.email || '');
    }

    return { title, description };
  };

  const handleSelectTemplate = (template: TaskTemplate) => {
    const processed = processTemplate(template);
    setNewTaskTitle(processed.title);
    if (processed.description) {
      setNewTaskNotes(processed.description);
    }
    setShowTemplates(false);
  };

  const handleToggleTask = (taskId: string) => {
    onToggleTask(taskId);
  };


  return (
    <div className="w-full flex flex-col">
      {/* Header - matches warranty claims modal structure */}
      <div className="px-6 py-6 border-b border-surface-outline-variant dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-surface-container/30 dark:bg-gray-700/30 flex-shrink-0">
        {/* Title row - with New Task button on mobile */}
        <div className="flex items-center justify-between md:justify-start w-full md:w-auto">
          <h2 className="text-xl font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
            {filteredTasks.length > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-on text-xs font-medium">
                {filteredTasks.length}
              </span>
            )}
            My Tasks
          </h2>
          {/* New Task button - top right on mobile, hidden on desktop (shown below) */}
          <Button
            onClick={() => setShowForm(!showForm)}
            variant="filled"
            icon={<Plus className="h-4 w-4" />}
            className="!h-9 !px-4 md:hidden"
          >
            New Task
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTaskFilter('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                taskFilter === 'all'
                  ? 'bg-primary text-primary-on'
                  : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTaskFilter('open')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                taskFilter === 'open'
                  ? 'bg-primary text-primary-on'
                  : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setTaskFilter('closed')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                taskFilter === 'closed'
                  ? 'bg-primary text-primary-on'
                  : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
              }`}
            >
              Closed
            </button>
          </div>
          <Button
            onClick={() => setShowTemplates(!showTemplates)}
            variant="text"
            icon={<FileText className="h-4 w-4" />}
            className="!h-9 !px-3"
            title="Task Templates"
          >
            Templates
          </Button>
          {/* New Task button - hidden on mobile (shown above), visible on desktop */}
          <Button
            onClick={() => setShowForm(!showForm)}
            variant="filled"
            icon={<Plus className="h-4 w-4" />}
            className="!h-9 !px-4 hidden md:flex"
          >
            New Task
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto px-6 py-6 space-y-6">
        {/* Task Templates */}
        {showTemplates && (
          <div className="bg-surface dark:bg-gray-800 rounded-2xl border border-surface-outline-variant dark:border-gray-700 p-5 animate-in slide-in-from-top-2">
            <TaskTemplateManager
              onSelectTemplate={handleSelectTemplate}
              onClose={() => setShowTemplates(false)}
            />
          </div>
        )}

        {showForm && (
          <div className="bg-surface dark:bg-gray-800 rounded-2xl border border-surface-outline-variant dark:border-gray-700 p-5 animate-in slide-in-from-top-2">
            <h3 className="font-medium text-surface-on dark:text-gray-100 mb-4">New Task</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-surface-on-variant dark:text-gray-400">Task Title</label>
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                    title="Use Template"
                  >
                    <FileText className="h-3 w-3" />
                    Templates
                  </button>
                </div>
                <input
                    type="text"
                    className="w-full bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 focus:border-primary focus:outline-none"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder="Enter task title or use a template"
                    required
                />
              </div>
              
              <div>
                <label className="text-xs text-surface-on-variant dark:text-gray-400 mb-1 block">Assigned To</label>
                <select 
                        className="w-full bg-surface-container dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border border-surface-outline-variant dark:border-gray-600"
                        value={newTaskAssignee}
                        onChange={e => setNewTaskAssignee(e.target.value)}
                    >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-surface-on-variant dark:text-gray-400 mb-1 block">Date Assigned</label>
                <div className="w-full bg-surface-container/50 dark:bg-gray-700/50 rounded-lg px-3 py-2 text-sm border border-surface-outline-variant dark:border-gray-600 text-surface-on-variant dark:text-gray-400 cursor-not-allowed">
                  {new Date().toLocaleDateString()} (Today)
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-xs text-surface-on-variant dark:text-gray-400 mb-1 block">Notes / Description</label>
                <textarea
                        rows={3}
                        className="w-full bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 focus:border-primary focus:outline-none resize-none"
                        value={newTaskNotes}
                  onChange={e => setNewTaskNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Claims Checklist - Only shown if preSelectedHomeowner is present */}
            {preSelectedHomeowner && (
              <div className="bg-surface-container/30 dark:bg-gray-700/30 p-4 rounded-xl border border-surface-outline-variant/50 dark:border-gray-600/50">
                <label className="text-xs text-surface-on-variant dark:text-gray-400 font-medium flex items-center gap-1 mb-2">
                  <Home className="h-3 w-3" />
                  Link to Open Warranty Claims for {preSelectedHomeowner.name}
                </label>

                <div className="space-y-2 mt-2">
                  {openClaims.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {openClaims.map(claim => {
                        const isSelected = selectedClaimIds.includes(claim.id);
                        return (
                          <div 
                            key={claim.id} 
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-surface dark:bg-gray-800 border-primary ring-1 ring-primary' 
                                : 'bg-surface dark:bg-gray-800 border-surface-outline-variant dark:border-gray-600 hover:border-surface-outline dark:hover:border-gray-500'
                            }`} 
                            onClick={() => toggleClaimSelection(claim.id)}
                          >
                             <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-surface-outline dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
                                  {isSelected && <Check className="h-3.5 w-3.5" />}
                             </div>
                             <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                      <span className={`font-medium text-sm ${isSelected ? 'text-primary' : 'text-surface-on dark:text-gray-100'}`}>{claim.title}</span>
                                      <StatusBadge status={claim.status} />
                                  </div>
                                  <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-1 line-clamp-1">{claim.description}</p>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-surface-on-variant dark:text-gray-400 italic bg-surface dark:bg-gray-800 p-2 rounded text-center">
                      No open claims found for this homeowner.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="text" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit">Save Task</Button>
            </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredTasks.length === 0 ? (
          <div className="col-span-2 text-center py-10 text-surface-on-variant dark:text-gray-400 bg-surface-container/30 dark:bg-gray-700/30 rounded-2xl border border-dashed border-surface-outline-variant dark:border-gray-600">
            <p>No tasks assigned to you.</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const assignee = employees.find(e => e.id === task.assignedToId);
            
            // Resolve related claims for checklist display
            const taskClaims = task.relatedClaimIds 
                ? claims.filter(c => task.relatedClaimIds?.includes(c.id))
                : [];

            return (
              <div 
                key={task.id}
                className={`group flex flex-col rounded-2xl border transition-all overflow-hidden cursor-pointer ${
                  task.isCompleted 
                    ? 'bg-surface-container/30 dark:bg-gray-800/50 border-surface-container-high dark:border-gray-600 opacity-75' 
                    : 'bg-surface-container dark:bg-gray-800 border-surface-outline-variant dark:border-gray-600 shadow-sm hover:shadow-elevation-1'
                }`}
                onClick={() => onSelectTask?.(task)}
              >
                {/* Card Header */}
                <div 
                  className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-4 transition-colors rounded-2xl hover:bg-surface-container-high dark:hover:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTask(task.id);
                      }}
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        task.isCompleted 
                          ? 'bg-primary border-primary text-white' 
                          : 'border-surface-outline dark:border-gray-600 hover:border-primary'
                      }`}
                    >
                      {task.isCompleted && <Check className="h-3.5 w-3.5" />}
                    </button>

                    {/* Title Pill */}
                    <span className={`inline-block px-3 py-1 rounded-full font-bold text-sm ${
                      task.isCompleted 
                        ? 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 line-through' 
                        : 'bg-primary text-primary-on'
                    }`}>
                      {task.title}
                    </span>

                    {/* Subs to Schedule Count */}
                    {taskClaims.length > 0 && (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-on text-xs font-medium">
                        {taskClaims.length}
                      </span>
                    )}
                  </div>

                  {/* Assigned To and Date - Desktop only */}
                  <div className="hidden md:flex items-center gap-x-4 gap-y-0 text-xs text-surface-on-variant dark:text-gray-400 flex-shrink-0">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <User className="h-3 w-3" />
                      {assignee?.name || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <Calendar className="h-3 w-3" />
                      {task.dateAssigned ? new Date(task.dateAssigned).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskList;