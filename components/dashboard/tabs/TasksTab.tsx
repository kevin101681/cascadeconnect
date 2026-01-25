/**
 * Tasks Tab - Task Management Interface
 * 
 * Two-column layout for managing tasks:
 * - Left column: Task list with filters (Open/Closed/All)
 * - Right column: Task detail view with editing
 * - Task creation card for quick task generation
 * 
 * Extracted from Dashboard.tsx (Phase 3B)
 */

import React, { Suspense } from 'react';
import { CheckSquare, Loader2 } from 'lucide-react';
import type { Task, InternalEmployee, Claim, Homeowner, TaskMessage } from '../../../types';
import { TaskCreationCard } from '../../TaskCreationCard';
import TaskDetail from '../../TaskDetail';

// TasksListColumn component (inline component from Dashboard)
const TasksListColumn = React.memo<{
  tasks: Task[];
  employees: InternalEmployee[];
  claims: Claim[];
  selectedTaskId: string | null;
  onTaskSelect: (task: Task) => void;
}>(({ tasks, employees, claims, selectedTaskId, onTaskSelect }) => {
  return (
    <div 
      className="flex-1 overflow-y-auto p-6 min-h-0"
      style={{ 
        WebkitOverflowScrolling: 'touch',
        maskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)'
      }}
    >
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-surface-on-variant dark:text-gray-400 gap-2">
          <CheckSquare className="h-8 w-8 opacity-20 dark:opacity-40 text-surface-on dark:text-gray-400" />
          <span className="text-sm">No tasks found.</span>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const assignee = employees.find(e => e.id === task.assignedTo);
            const claim = claims.find(c => c.id === task.claimId);
            const isSelected = task.id === selectedTaskId;
            
            return (
              <div
                key={task.id}
                onClick={() => onTaskSelect(task)}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-primary/10 border-2 border-primary'
                    : 'bg-surface-container dark:bg-gray-700 hover:bg-surface-container-high dark:hover:bg-gray-600 border-2 border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-surface-on dark:text-gray-100 truncate">
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-surface-on-variant dark:text-gray-400">
                      {assignee && <span>{assignee.name}</span>}
                      {claim && <span>• {claim.title}</span>}
                    </div>
                  </div>
                  <div className={`shrink-0 w-3 h-3 rounded-full ${
                    task.isCompleted 
                      ? 'bg-green-500' 
                      : task.dueDate && new Date(task.dueDate) < new Date()
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                  }`} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

interface TasksTabProps {
  // Data
  tasks: Task[];
  filteredTasks: Task[];
  selectedTask: Task | null;
  employees: InternalEmployee[];
  claims: Claim[];
  homeowners: Homeowner[];
  currentUser: { id: string; name: string; role: string; email?: string } | null;
  taskMessages: TaskMessage[];
  
  // Filter state
  tasksFilter: 'open' | 'closed' | 'all';
  tasksTabStartInEditMode: boolean;
  
  // Callbacks
  onTaskSelect: (task: Task | null) => void;
  onSetTasksFilter: (filter: 'open' | 'closed' | 'all') => void;
  onFilterChange?: (filter: 'open' | 'closed' | 'all') => void; // Alias for onSetTasksFilter
  onSetTasksTabStartInEditMode: (value: boolean) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onSelectClaim?: (claim: Claim) => void;
  onSetCurrentTab?: (tab: string) => void;
  onScheduleTask?: (task: Task) => void; // Callback for scheduling tasks
  onCreateScheduleTask?: (assigneeId: string) => Promise<void>;
  onCreateEvalTask?: (type: '60 Day' | '11 Month' | 'Other', assigneeId: string) => Promise<void>;
  
  // User context
  isAdmin: boolean;
}

export const TasksTab: React.FC<TasksTabProps> = ({
  tasks,
  filteredTasks,
  selectedTask,
  employees,
  claims,
  homeowners,
  currentUser,
  taskMessages,
  tasksFilter,
  tasksTabStartInEditMode,
  onTaskSelect,
  onSetTasksFilter,
  onSetTasksTabStartInEditMode,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onSelectClaim,
  onSetCurrentTab,
  onCreateScheduleTask,
  onCreateEvalTask,
  isAdmin,
}) => {
  // Calculate counts for filter pills
  const openCount = tasks.filter(task => !task.isCompleted).length;
  const closedCount = tasks.filter(task => task.isCompleted).length;
  const totalCount = tasks.length;

  return (
    <>
    <div className="bg-surface dark:bg-gray-800 md:rounded-modal md:border border-surface-outline-variant dark:border-gray-700 flex flex-col md:flex-row overflow-hidden h-full min-h-0 md:max-h-[calc(100vh-8rem)]">
      {/* Left Column: Tasks List */}
      <div className={`w-full md:w-[350px] md:min-w-[350px] md:max-w-[350px] border-b md:border-b-0 md:border-r border-surface-outline-variant dark:border-gray-700 flex flex-col min-h-0 bg-surface dark:bg-gray-800 md:rounded-tl-3xl md:rounded-tr-none md:rounded-bl-3xl ${selectedTask ? 'hidden md:flex' : 'flex'}`}>
        {/* Sticky Header */}
        <div className="sticky top-0 z-sticky bg-surface dark:bg-gray-800 md:rounded-tl-3xl">
          {/* Title Bar */}
          <div className="px-4 py-3 md:p-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface md:bg-surface-container dark:bg-gray-700 flex flex-row justify-between items-center gap-2 md:gap-4 shrink-0">
            <h3 className="text-lg md:text-xl font-normal text-surface-on dark:text-gray-100">
              <span className="hidden sm:inline">My Tasks</span>
              <span className="sm:hidden">Tasks</span>
            </h3>
          </div>
          
          {/* Filter Pills */}
          <div className="px-4 py-2 border-b border-surface-outline-variant/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSetTasksFilter('open')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all min-w-fit ${
                  tasksFilter === 'open'
                    ? 'border border-primary text-primary bg-primary/10'
                    : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Open</span>
                  {tasksFilter === 'open' && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none transition-colors bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {openCount}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => onSetTasksFilter('closed')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all min-w-fit ${
                  tasksFilter === 'closed'
                    ? 'border border-primary text-primary bg-primary/10'
                    : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Closed</span>
                  {tasksFilter === 'closed' && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none transition-colors bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {closedCount}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => onSetTasksFilter('all')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all min-w-fit ${
                  tasksFilter === 'all'
                    ? 'border border-primary text-primary bg-primary/10'
                    : 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>All</span>
                  {tasksFilter === 'all' && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none transition-colors bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {totalCount}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Task Creation Card */}
          {onCreateScheduleTask && onCreateEvalTask && (
            <TaskCreationCard
              employees={employees}
              onCreateScheduleTask={onCreateScheduleTask}
              onCreateEvalTask={onCreateEvalTask}
            />
          )}
        </div>

        <TasksListColumn
          tasks={filteredTasks}
          employees={employees}
          claims={claims}
          selectedTaskId={selectedTask?.id || null}
          onTaskSelect={(task) => {
            onTaskSelect(task);
            onSetTasksTabStartInEditMode(true);
          }}
        />
      </div>

      {/* Right Column: Task Detail View - Desktop Only */}
      <div className={`flex-1 flex flex-col bg-surface dark:bg-gray-800 ${!selectedTask ? 'hidden md:flex' : 'hidden md:flex'} rounded-tr-3xl rounded-br-3xl md:rounded-r-3xl md:rounded-l-none overflow-hidden`}>
        {selectedTask ? (
          <div className="flex flex-col h-full">
            {/* Scrollable Task Detail Content */}
            <div 
              className="flex-1 overflow-y-auto px-6 pt-4 pb-6 overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } as React.CSSProperties}
            >
              <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }>
                  <TaskDetail
                  task={selectedTask}
                  employees={employees}
                  currentUser={currentUser}
                  claims={claims}
                  homeowners={homeowners}
                  onToggleTask={onToggleTask}
                  onDeleteTask={onDeleteTask}
                  onUpdateTask={onUpdateTask}
                    startInEditMode={tasksTabStartInEditMode}
                  onSelectClaim={(claim) => {
                    onTaskSelect(null);
                      onSetTasksTabStartInEditMode(false);
                    if (onSelectClaim) onSelectClaim(claim);
                    if (onSetCurrentTab) onSetCurrentTab('CLAIMS');
                  }}
                  taskMessages={taskMessages.filter(m => m.taskId === selectedTask.id)}
                    onBack={() => {
                      onTaskSelect(null);
                      onSetTasksTabStartInEditMode(false);
                    }}
                />
              </Suspense>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-surface-on-variant dark:text-gray-400 gap-4 bg-surface-container/10 dark:bg-gray-700/10">
            <div className="w-20 h-20 bg-surface-container dark:bg-gray-700 rounded-full flex items-center justify-center">
              <CheckSquare className="h-9 w-10 text-surface-outline/50 dark:text-gray-500/50" />
            </div>
            <p className="text-sm font-medium">Select a task to view details</p>
          </div>
        )}
      </div>
    </div>
    
    {/* Mobile Full-Screen Overlay for Task Detail */}
    {selectedTask && (
      <div className="md:hidden fixed inset-0 z-50 bg-surface dark:bg-gray-900 flex flex-col overflow-hidden">
        {/* Scrollable Task Detail Content */}
        <div 
          className="flex-1 overflow-y-auto px-6 pt-4 pb-6 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } as React.CSSProperties}
        >
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }>
            <TaskDetail
              task={selectedTask}
              employees={employees}
              currentUser={currentUser}
              claims={claims}
              homeowners={homeowners}
              onToggleTask={onToggleTask}
              onDeleteTask={onDeleteTask}
              startInEditMode={tasksTabStartInEditMode}
              onBack={() => {
                onTaskSelect(null);
                onSetTasksTabStartInEditMode(false);
              }}
            />
          </Suspense>
        </div>
      </div>
    )}
    </>
  );
};

export default TasksTab;
