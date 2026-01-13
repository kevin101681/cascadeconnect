import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, ilike, or } from 'drizzle-orm';
import { z } from 'zod';

import { homeowners } from '../../db/schema';

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const inputSchema = z.object({
  lastName: z.string().trim().min(1).max(80),
  houseNumber: z.string().trim().regex(/^\d{1,8}$/),
  zipCode: z.string().trim().regex(/^\d{5}$/),
});

function maskEmail(email: string): string | null {
  const atIdx = email.indexOf('@');
  if (atIdx <= 0 || atIdx === email.length - 1) return null;

  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);
  const first = local[0] || '*';

  // Fixed-length mask to avoid leaking local-part length.
  return `${first}****@${domain}`;
}

function getDb() {
  const databaseUrl =
    process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  if (!databaseUrl) throw new Error('❌ Database configuration is missing.');
  return drizzle(neon(databaseUrl), { schema: { homeowners } });
}

/**
 * POST /api/homeowners/lookup-email
 * Body: { lastName, houseNumber, zipCode }
 *
 * SECURITY:
 * - Never returns full email
 * - Returns a masked hint only (e.g. t****@gmail.com)
 * - Generic error on no-match
 */
export const handler = async (event: any): Promise<HandlerResponse> => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const parsed = inputSchema.safeParse(JSON.parse(event.body || '{}'));
    if (!parsed.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid input' }),
      };
    }

    const { lastName, houseNumber, zipCode } = parsed.data;
    const housePrefix = `${houseNumber}%`;

    const db = getDb();
    const match = await db
      .select({ email: homeowners.email })
      .from(homeowners)
      .where(
        and(
          ilike(homeowners.lastName, lastName),
          ilike(homeowners.zip, zipCode),
          or(ilike(homeowners.street, housePrefix), ilike(homeowners.address, housePrefix))
        )
      )
      .limit(1)
      .execute();

    const email = match?.[0]?.email || null;
    const maskedEmail = email ? maskEmail(email) : null;

    if (!maskedEmail) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No account found' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ maskedEmail }),
    };
  } catch (error: any) {
    // Do not leak PII or detailed DB errors to the client.
    console.error('❌ lookupHomeownerEmail error:', error?.message || error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'No account found' }),
    };
  }
};

