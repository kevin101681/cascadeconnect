import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { responseTemplates } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export const handler = async (event: any): Promise<HandlerResponse> => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

    // Get userId from headers (passed from client with Clerk ID)
    const userId = event.headers['x-user-id'] || event.headers['X-User-Id'];
    
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: User ID required' }),
      };
    }

    // Parse path to extract template ID if present
    const path = event.path || '';
    const pathParts = path.split('/').filter((p) => p);
    let templateId: string | null = null;
    
    const templatesIndex = pathParts.indexOf('templates');
    if (templatesIndex >= 0 && pathParts.length > templatesIndex + 1) {
      templateId = pathParts[templatesIndex + 1];
    }

    // Handle different HTTP methods
    switch (event.httpMethod) {
      case 'GET':
        // Get all templates for the user
        const templates = await db
          .select()
          .from(responseTemplates)
          .where(eq(responseTemplates.userId, userId))
          .orderBy(desc(responseTemplates.createdAt));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(templates),
        };

      case 'POST':
        // Create a new template
        const createData = JSON.parse(event.body || '{}');
        
        if (!createData.title || !createData.content) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Title and content are required' }),
          };
        }

        const [newTemplate] = await db
          .insert(responseTemplates)
          .values({
            userId: userId,
            title: createData.title,
            content: createData.content,
            category: createData.category || 'General',
          })
          .returning();

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(newTemplate),
        };

      case 'PUT':
        // Update an existing template
        if (!templateId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Template ID required' }),
          };
        }

        const updateData = JSON.parse(event.body || '{}');
        
        // Build update object with only defined fields
        const updateFields: any = {};
        if (updateData.title !== undefined) updateFields.title = updateData.title;
        if (updateData.content !== undefined) updateFields.content = updateData.content;
        if (updateData.category !== undefined) updateFields.category = updateData.category;
        updateFields.updatedAt = new Date();
        
        const [updatedTemplate] = await db
          .update(responseTemplates)
          .set(updateFields)
          .where(
            and(
              eq(responseTemplates.id, templateId),
              eq(responseTemplates.userId, userId)
            )
          )
          .returning();

        if (!updatedTemplate) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Template not found or access denied' }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedTemplate),
        };

      case 'DELETE':
        // Delete a template
        if (!templateId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Template ID required' }),
          };
        }

        const result = await db
          .delete(responseTemplates)
          .where(
            and(
              eq(responseTemplates.id, templateId),
              eq(responseTemplates.userId, userId)
            )
          )
          .returning();

        if (result.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Template not found or access denied' }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('❌ Templates function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

