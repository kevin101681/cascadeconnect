/**
 * Custom hook for managing tasks state and logic
 * Handles filtering, selection, and task management
 */

import { useState, useMemo, useCallback } from 'react';
import type { Task } from '../../types';

export interface UseTasksDataParams {
  tasks: Task[];
  currentUserId: string;
  initialFilter?: 'all' | 'open' | 'closed';
}

export interface UseTasksDataReturn {
  // Filter state
  filter: 'all' | 'open' | 'closed';
  setFilter: (filter: 'all' | 'open' | 'closed') => void;
  
  // Filtered data
  userTasks: Task[];  // Tasks assigned to current user
  filteredTasks: Task[];  // Filtered based on open/closed status
  
  // UI state for new task modal
  showNewTaskModal: boolean;
  setShowNewTaskModal: (show: boolean) => void;
  newTaskTitle: string;
  setNewTaskTitle: (title: string) => void;
  newTaskAssignee: string;
  setNewTaskAssignee: (assigneeId: string) => void;
  newTaskNotes: string;
  setNewTaskNotes: (notes: string) => void;
  
  // Helper to reset new task form
  resetNewTaskForm: () => void;
}

/**
 * Hook for managing tasks filtering, selection, and UI state
 */
export function useTasksData({ 
  tasks, 
  currentUserId,
  initialFilter = 'open' 
}: UseTasksDataParams): UseTasksDataReturn {
  // Filter state
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>(initialFilter);
  
  // UI state for new task creation
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(currentUserId);
  const [newTaskNotes, setNewTaskNotes] = useState('');
  
  // Memoized tasks filtered by current user
  const userTasks = useMemo(() => 
    tasks.filter(t => t.assignedToId === currentUserId),
    [tasks, currentUserId]
  );
  
  // Memoized filtered tasks based on open/closed filter
  const filteredTasks = useMemo(() => {
    if (filter === 'open') {
      return userTasks.filter(t => !t.isCompleted);
    } else if (filter === 'closed') {
      return userTasks.filter(t => t.isCompleted);
    }
    return userTasks;
  }, [userTasks, filter]);
  
  // Reset new task form
  const resetNewTaskForm = useCallback(() => {
    setNewTaskTitle('');
    setNewTaskAssignee(currentUserId);
    setNewTaskNotes('');
    setShowNewTaskModal(false);
  }, [currentUserId]);
  
  return {
    filter,
    setFilter,
    userTasks,
    filteredTasks,
    showNewTaskModal,
    setShowNewTaskModal,
    newTaskTitle,
    setNewTaskTitle,
    newTaskAssignee,
    setNewTaskAssignee,
    newTaskNotes,
    setNewTaskNotes,
    resetNewTaskForm
  };
}
