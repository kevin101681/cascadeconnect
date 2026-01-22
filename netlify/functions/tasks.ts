import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { tasks } from '../../db/schema';
import { eq, and, desc, isNull, isNotNull } from 'drizzle-orm';

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export const handler = async (event: any): Promise<HandlerResponse> => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Connect to database
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL is not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' }),
      };
    }

    const sql = neon(databaseUrl);
    const db = drizzle(sql);

    // Parse path to extract task ID if present
    const path = event.path || '';
    const pathParts = path.split('/').filter((p) => p);
    let taskId: string | null = null;
    
    const tasksIndex = pathParts.indexOf('tasks');
    if (tasksIndex >= 0 && pathParts.length > tasksIndex + 1) {
      taskId = pathParts[tasksIndex + 1];
    } else if (pathParts.length > 0 && pathParts[pathParts.length - 1] !== 'tasks') {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.length > 10) {
        // UUIDs are longer than 10 chars
        taskId = lastPart;
      }
    }

    const isList = !taskId;

    // GET: Fetch tasks (list or single)
    if (event.httpMethod === 'GET') {
      if (isList) {
        // Fetch all tasks, optionally filtered by claimId
        const queryParams = event.queryStringParameters || {};
        const claimId = queryParams.claimId || null;
        const notesOnly = queryParams.notesOnly === 'true'; // New filter for simple notes

        let allTasks;
        
        // Apply filters
        if (notesOnly) {
          // For Notes modal: only show simple notes (no assigned tasks)
          // Simple notes have content but no assignedToId
          if (claimId) {
            allTasks = await db.select().from(tasks).where(
              and(
                eq(tasks.claimId, claimId),
                isNull(tasks.assignedToId)
              )
            );
          } else {
            allTasks = await db.select().from(tasks).where(isNull(tasks.assignedToId));
          }
        } else if (claimId) {
          // Fetch all tasks for specific claim
          allTasks = await db.select().from(tasks).where(eq(tasks.claimId, claimId));
        } else {
          // Fetch all tasks
          allTasks = await db.select().from(tasks);
        }

        // Transform to SimpleTask format (use content or fallback to title)
        const transformedTasks = allTasks.map((task: any) => ({
          id: task.id,
          content: task.content || task.title || '',
          isCompleted: task.isCompleted || false,
          claimId: task.claimId || null,
          contextLabel: task.contextLabel || null,
          createdAt: task.createdAt || task.dateAssigned || new Date(),
        }));

        // Sort: active first (newest first), then completed (oldest first)
        transformedTasks.sort((a, b) => {
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

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(transformedTasks),
        };
      } else {
        // Fetch single task
        const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
        
        if (task.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Task not found' }),
          };
        }

        const taskData = task[0] as any;
        const transformedTask = {
          id: taskData.id,
          content: taskData.content || taskData.title || '',
          isCompleted: taskData.isCompleted || false,
          claimId: taskData.claimId || null,
          contextLabel: taskData.contextLabel || null,
          createdAt: taskData.createdAt || taskData.dateAssigned || new Date(),
        };

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(transformedTask),
        };
      }
    }

    // POST: Create new task
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
      const { content, claimId, contextLabel } = data;

      if (!content || !content.trim()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'content is required' }),
        };
      }

      // Insert task - use content as the primary field, and also set title for backward compatibility
      const newTask = await db
        .insert(tasks)
        .values({
          content: content.trim(),
          title: content.trim(), // For backward compatibility with existing tasks system
          claimId: claimId || null,
          contextLabel: contextLabel || null,
          isCompleted: false,
          createdAt: new Date(),
        } as any)
        .returning();

      const taskData = newTask[0] as any;
      const transformedTask = {
        id: taskData.id,
        content: taskData.content || taskData.title || '',
        isCompleted: taskData.isCompleted || false,
        claimId: taskData.claimId || null,
        contextLabel: taskData.contextLabel || null,
        createdAt: taskData.createdAt || taskData.dateAssigned || new Date(),
      };

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(transformedTask),
      };
    }

    // PATCH: Update task (primarily for toggling completion)
    if (event.httpMethod === 'PATCH' && taskId) {
      const data = JSON.parse(event.body || '{}');
      const updates: any = {};

      if (typeof data.isCompleted === 'boolean') {
        updates.isCompleted = data.isCompleted;
      }
      if (data.content !== undefined) {
        updates.content = data.content;
        updates.title = data.content; // Keep title in sync for backward compatibility
      }
      if (data.claimId !== undefined) {
        updates.claimId = data.claimId;
      }

      if (Object.keys(updates).length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No valid fields to update' }),
        };
      }

      const updatedTask = await db
        .update(tasks)
        .set(updates as any)
        .where(eq(tasks.id, taskId))
        .returning();

      if (updatedTask.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Task not found' }),
        };
      }

      const taskData = updatedTask[0] as any;
      const transformedTask = {
        id: taskData.id,
        content: taskData.content || taskData.title || '',
        isCompleted: taskData.isCompleted || false,
        claimId: taskData.claimId || null,
        contextLabel: taskData.contextLabel || null,
        createdAt: taskData.createdAt || taskData.dateAssigned || new Date(),
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(transformedTask),
      };
    }

    // DELETE: Delete task
    if (event.httpMethod === 'DELETE' && taskId) {
      const deletedTask = await db
        .delete(tasks)
        .where(eq(tasks.id, taskId))
        .returning();

      if (deletedTask.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Task not found' }),
        };
      }

      return {
        statusCode: 204,
        headers,
        body: '',
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error: any) {
    console.error('❌ Tasks API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};

