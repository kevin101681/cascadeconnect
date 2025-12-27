import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckSquare, Square, Trash2, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useTaskStore } from '../stores/useTaskStore';
import { fetchTasks, createTask, updateTask, deleteTask, SimpleTask } from '../services/taskService';

interface TasksSheetProps {
  onNavigateToClaim?: (claimId: string) => void;
  claims?: Array<{ id: string; claimNumber?: string | null }>; // For displaying claim numbers
}

const TasksSheet: React.FC<TasksSheetProps> = ({ onNavigateToClaim, claims = [] }) => {
  const { isOpen, activeClaimId, isFilterEnabled, closeTasks, toggleFilter } = useTaskStore();
  const [tasks, setTasks] = useState<SimpleTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch tasks when drawer opens or filter changes
  useEffect(() => {
    if (isOpen) {
      loadTasks();
      // Auto-focus input when opened
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, activeClaimId, isFilterEnabled]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const claimIdToFilter = isFilterEnabled && activeClaimId ? activeClaimId : null;
      const fetchedTasks = await fetchTasks(claimIdToFilter);
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newContent = inputValue.trim();
    setInputValue('');

    // Optimistic update
    const optimisticTask: SimpleTask = {
      id: `temp-${Date.now()}`,
      content: newContent,
      isCompleted: false,
      claimId: activeClaimId || null,
      createdAt: new Date(),
    };

    setTasks((prev) => [optimisticTask, ...prev]);

    try {
      const createdTask = await createTask(newContent, activeClaimId || null);
      // Replace optimistic task with real one
      setTasks((prev) => prev.map((t) => (t.id === optimisticTask.id ? createdTask : t)));
    } catch (error) {
      console.error('Failed to create task:', error);
      // Remove optimistic task on error
      setTasks((prev) => prev.filter((t) => t.id !== optimisticTask.id));
    }
  };

  const handleToggleTask = async (task: SimpleTask) => {
    // Optimistic update
    const updatedTask = { ...task, isCompleted: !task.isCompleted };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)));

    try {
      const result = await updateTask(task.id, { isCompleted: updatedTask.isCompleted });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? result : t)));
    } catch (error) {
      console.error('Failed to update task:', error);
      // Revert on error
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    // Optimistic update
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
      // Reload tasks on error
      loadTasks();
    }
  };

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeTasks();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeTasks]);

  // Sort tasks: active first (newest first), then completed (oldest first)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    if (a.isCompleted) {
      // Completed tasks: oldest first
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else {
      // Active tasks: newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const activeTasks = sortedTasks.filter((t) => !t.isCompleted);
  const completedTasks = sortedTasks.filter((t) => t.isCompleted);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
            onClick={closeTasks}
          />

          {/* Slide-over drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface dark:bg-gray-800 shadow-elevation-5 z-[201] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 p-6 border-b border-surface-outline-variant dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-surface-on dark:text-gray-100">Tasks</h2>
                <button
                  onClick={closeTasks}
                  className="p-2 rounded-full hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {activeClaimId && (
                <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-3">
                  Linked to Claim #{activeClaimId.substring(0, 8)}
                </p>
              )}

              {/* Filter toggle */}
              {activeClaimId && (
                <button
                  onClick={toggleFilter}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  {isFilterEnabled ? 'Show Only This Claim' : 'Show All Tasks'}
                </button>
              )}
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 p-4 border-b border-surface-outline-variant dark:border-gray-700">
              <form onSubmit={handleAddTask} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Add a task..."
                  className="flex-1 px-4 py-2 rounded-lg border border-surface-outline-variant dark:border-gray-600 bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-100 placeholder:text-surface-on-variant dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-on rounded-lg transition-colors font-medium"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  {/* Active Tasks */}
                  {activeTasks.length > 0 && (
                    <div className="space-y-2 mb-6">
                      {activeTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onToggle={handleToggleTask}
                          onDelete={handleDeleteTask}
                          onNavigateToClaim={onNavigateToClaim}
                          showClaimBadge={!isFilterEnabled || !activeClaimId}
                          claims={claims}
                        />
                      ))}
                    </div>
                  )}

                  {/* Completed Tasks */}
                  {completedTasks.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-surface-on-variant dark:text-gray-400 uppercase tracking-wider mb-2">
                        Completed
                      </h3>
                      {completedTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onToggle={handleToggleTask}
                          onDelete={handleDeleteTask}
                          onNavigateToClaim={onNavigateToClaim}
                          showClaimBadge={!isFilterEnabled || !activeClaimId}
                          claims={claims}
                        />
                      ))}
                    </div>
                  )}

                  {sortedTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-surface-on-variant dark:text-gray-400 mb-2">No tasks yet</p>
                      <p className="text-sm text-surface-on-variant/70 dark:text-gray-500">
                        Add a task above to get started
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

interface TaskItemProps {
  task: SimpleTask;
  onToggle: (task: SimpleTask) => void;
  onDelete: (taskId: string) => void;
  onNavigateToClaim?: (claimId: string) => void;
  showClaimBadge: boolean;
  claims?: Array<{ id: string; claimNumber?: string | null }>;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggle,
  onDelete,
  onNavigateToClaim,
  showClaimBadge,
  claims = [],
}) => {
  const claim = task.claimId ? claims.find((c) => c.id === task.claimId) : null;
  const claimDisplay = claim?.claimNumber || task.claimId?.substring(0, 8);
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 transition-colors group ${
        task.isCompleted ? 'opacity-50' : ''
      }`}
    >
      <button
        onClick={() => onToggle(task)}
        className="flex-shrink-0 mt-0.5 text-surface-on-variant dark:text-gray-400 hover:text-primary transition-colors"
        aria-label={task.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {task.isCompleted ? (
          <CheckSquare className="h-5 w-5" />
        ) : (
          <Square className="h-5 w-5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm text-surface-on dark:text-gray-100 ${
              task.isCompleted ? 'line-through' : ''
            }`}
          >
            {task.content}
          </p>
          <button
            onClick={() => onDelete(task.id)}
            className="flex-shrink-0 p-1 rounded hover:bg-surface-container-hover dark:hover:bg-gray-600 text-surface-on-variant dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-surface-on-variant dark:text-gray-400">
            {format(new Date(task.createdAt), 'MMM d, yyyy')}
          </span>
          {showClaimBadge && task.claimId && claimDisplay && (
            <button
              onClick={() => onNavigateToClaim?.(task.claimId!)}
              className="px-2 py-0.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
            >
              Claim #{claimDisplay}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksSheet;

