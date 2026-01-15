import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckSquare, Square, Trash2, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useTaskStore } from '../stores/useTaskStore';
import { fetchTasks, createTask, updateTask, deleteTask, SimpleTask } from '../services/taskService';
import { NoteCard } from './ui/NoteCard';

interface TasksSheetProps {
  onNavigateToClaim?: (claimId: string) => void;
  claims?: Array<{ id: string; claimNumber?: string | null }>; // For displaying claim numbers
  isInline?: boolean; // If true, renders inline without modal/drawer
}

const TasksSheet: React.FC<TasksSheetProps> = ({ onNavigateToClaim, claims = [], isInline = false }) => {
  const { isOpen, activeClaimId, isFilterEnabled, contextLabel, contextType, prefilledNoteBody, closeTasks, toggleFilter } = useTaskStore();
  const [tasks, setTasks] = useState<SimpleTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch tasks when drawer opens or filter changes, or immediately if inline
  // Always fetch ALL tasks (no filtering by claim)
  useEffect(() => {
    if (isOpen || isInline) {
      loadTasks();
      // Pre-fill input with note body if provided
      if (prefilledNoteBody) {
        setInputValue(prefilledNoteBody);
      }
      // Auto-focus input when opened (only for modal, not inline)
      if (!isInline) {
        setTimeout(() => {
          inputRef.current?.focus();
          // Move cursor to end of pre-filled text
          if (prefilledNoteBody && inputRef.current) {
            inputRef.current.setSelectionRange(prefilledNoteBody.length, prefilledNoteBody.length);
          }
        }, 100);
      }
    }
  }, [isOpen, isInline, prefilledNoteBody]); // Added prefilledNoteBody to dependencies

  const loadTasks = async () => {
    setLoading(true);
    try {
      // Fetch only simple notes (exclude assigned tasks like Schedule/Eval)
      const fetchedTasks = await fetchTasks(null, true); // notesOnly = true
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
      
      // Clear the context after successfully adding the note
      useTaskStore.setState({ activeClaimId: null, contextLabel: '', contextType: undefined });
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

  // Render the content (shared between inline and modal modes)
  const renderContent = () => (
    <>
      {/* Header - Match Warranty Claims Style EXACTLY */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface md:bg-surface-container dark:bg-gray-700 flex-shrink-0">
        <h2 className="text-xl font-normal text-surface-on dark:text-gray-100">
          Notes
        </h2>
        {!isInline && (
          <button
            onClick={closeTasks}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Input Area - Compact */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-surface-outline-variant dark:border-gray-700 bg-white dark:bg-gray-800">
        <form onSubmit={handleAddTask} className="flex gap-2 items-start">
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Add a note..."
              className="w-full px-4 py-2 rounded-lg border border-surface-outline-variant dark:border-gray-600 bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-100 placeholder:text-surface-on-variant dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {contextLabel && (
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                  {contextLabel}
                </span>
              </div>
            )}
          </div>
          <button
            type="submit"
            className="flex-shrink-0 px-4 py-2 h-10 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-full transition-colors font-medium"
          >
            Add
          </button>
        </form>
      </div>

      {/* 2-COLUMN GRID LAYOUT - Match Warranty Claims */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-white dark:bg-gray-800">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Active Tasks - 2 Column Grid */}
            {activeTasks.length > 0 && (
              <div className="mb-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {activeTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={handleToggleTask}
                      onDelete={handleDeleteTask}
                      onNavigateToClaim={onNavigateToClaim}
                      showClaimBadge={true}
                      claims={claims}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Tasks - 2 Column Grid */}
            {completedTasks.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-surface-on-variant dark:text-gray-400 uppercase tracking-wider mb-3">
                  Completed
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {completedTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={handleToggleTask}
                      onDelete={handleDeleteTask}
                      onNavigateToClaim={onNavigateToClaim}
                      showClaimBadge={true}
                      claims={claims}
                    />
                  ))}
                </div>
              </div>
            )}

            {sortedTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-surface-on-variant dark:text-gray-400 mb-2">No notes yet</p>
                <p className="text-sm text-surface-on-variant/70 dark:text-gray-500">
                  Add a note above to get started
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  // Inline mode - render with Warranty Claims styling (MATCH EXACTLY)
  if (isInline) {
    return (
      <div className="bg-white dark:bg-gray-800 md:rounded-modal border border-surface-outline-variant dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
        {renderContent()}
      </div>
    );
  }

  // Modal/Drawer mode - render with backdrop and animations
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

          {/* Drawer with fade animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface dark:bg-gray-800 shadow-elevation-5 z-[201] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {renderContent()}
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
    <NoteCard
      content={task.content}
      dateCreated={format(new Date(task.createdAt), 'MMM d, yyyy')}
      isCompleted={task.isCompleted}
      onToggle={(checked) => onToggle(task)}
    />
  );
};

export default TasksSheet;
