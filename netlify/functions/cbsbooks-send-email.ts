import { Handler } from '@netlify/functions';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize Clerk
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event) => {
  // Handle OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // 1. Authenticate user via Clerk session token (from cookies or Authorization header)
    let clerkUserId: string | null = null;

    // Try to get session token from __session cookie (Clerk's default)
    const cookieHeader = event.headers.cookie || event.headers.Cookie || '';
    const sessionToken = cookieHeader
      .split(';')
      .find((c) => c.trim().startsWith('__session='))
      ?.split('=')[1];

    // Alternatively, check Authorization header
    const authHeader = event.headers.authorization || event.headers.Authorization;

    if (sessionToken) {
      try {
        const { sub } = await verifyToken(sessionToken, {
          secretKey: process.env.CLERK_SECRET_KEY!,
        });
        clerkUserId = sub;
      } catch (error) {
        console.error('Cookie token verification failed:', error);
      }
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const { sub } = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY!,
        });
        clerkUserId = sub;
      } catch (error) {
        console.error('Bearer token verification failed:', error);
      }
    }

    if (!clerkUserId) {
      console.error('❌ No valid Clerk session found');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: Please sign in to send emails' }),
      };
    }

    // 2. Check if user is an ADMIN in the database
    const sql = neon(process.env.DATABASE_URL!);
    const db = drizzle(sql);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user || user.role !== 'ADMIN') {
      console.error('❌ User is not an admin:', clerkUserId);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: Admin access required to send emails' }),
      };
    }

    // 3. Parse request body
    const body = JSON.parse(event.body || '{}');
    const { to, subject, text, html, attachment } = body;

    if (!to || !attachment) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required fields: 'to' address or attachment data" }),
      };
    }

    // 4. Send email via SendGrid
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ SendGrid API key not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Email service not configured. Please contact support.' }),
      };
    }

    // Strip data URI prefix from attachment data if present
    const base64Content = attachment.data.replace(/^data:application\/pdf;base64,/, '');
    const fromEmail =
      process.env.SENDGRID_REPLY_EMAIL ||
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      'info@cascadebuilderservices.com';

    const msg = {
      to: to,
      from: {
        email: fromEmail,
        name: 'Cascade Builder Services',
      },
      subject: subject || 'Invoice from Cascade Builder Services',
      text: text || '',
      html: html || text || '',
      attachments: [
        {
          content: base64Content,
          filename: attachment.filename || 'invoice.pdf',
          type: 'application/pdf',
          disposition: 'attachment' as const,
        },
      ],
    };

    const [response] = await sgMail.send(msg);
    console.log('✅ Invoice email sent via SendGrid:', response.statusCode, 'to:', to);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        messageId: response.headers['x-message-id'],
      }),
    };
  } catch (error: any) {
    console.error('❌ Email sending error:', error);

    // Return a proper error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to send email',
      }),
    };
  }
};
