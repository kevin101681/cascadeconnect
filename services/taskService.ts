export interface SimpleTask {
  id: string;
  content: string;
  isCompleted: boolean;
  claimId?: string | null;
  contextLabel?: string | null; // Display label for context source
  createdAt: Date;
}

/**
 * Fetch all tasks, optionally filtered by claimId or notesOnly
 */
export async function fetchTasks(claimId?: string | null, notesOnly?: boolean): Promise<SimpleTask[]> {
  try {
    const url = new URL('/api/tasks', window.location.origin);
    if (claimId) {
      url.searchParams.set('claimId', claimId);
    }
    if (notesOnly) {
      url.searchParams.set('notesOnly', 'true');
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.map((task: any) => ({
      ...task,
      createdAt: new Date(task.createdAt),
    }));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
}

/**
 * Create a new task
 */
export async function createTask(content: string, claimId?: string | null, contextLabel?: string | null): Promise<SimpleTask> {
  try {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        claimId: claimId || null,
        contextLabel: contextLabel || null,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.statusText}`);
    }
    
    const task = await response.json();
    return {
      ...task,
      createdAt: new Date(task.createdAt),
    };
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

/**
 * Update a task (primarily for toggling completion)
 */
export async function updateTask(taskId: string, updates: Partial<SimpleTask>): Promise<SimpleTask> {
  try {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update task: ${response.statusText}`);
    }
    
    const task = await response.json();
    return {
      ...task,
      createdAt: new Date(task.createdAt),
    };
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  try {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete task: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}
