import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { claims } from '../../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

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

interface BatchClaimInput {
  title: string;
  description: string;
  category: string;
  attachments?: any[];
  classification?: string;
  status?: string;
  proposedDates?: any[];
}

const getDbClient = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Database configuration is missing.');
  }
  const sqlClient = neon(databaseUrl);
  return drizzle(sqlClient, { schema: { claims } });
};

export const handler = async (event: any): Promise<HandlerResponse> => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { claims: claimsInput, homeownerId, homeownerData } = body;

    if (!Array.isArray(claimsInput) || claimsInput.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid input: claims must be a non-empty array' }),
      };
    }

    if (!homeownerId || !homeownerData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing homeownerId or homeownerData' }),
      };
    }

    const db = getDbClient();

    // Get the highest claim number for this homeowner to start numbering
    const existingClaims = await db.select().from(claims).where(eq(claims.homeownerId, homeownerId)).execute();
    let maxNumber = 0;
    existingClaims.forEach(c => {
      if (c.claimNumber) {
        const num = parseInt(c.claimNumber, 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    // Start transaction-like behavior (Neon serverless doesn't support true transactions, but we'll use a batch insert)
    const claimsToInsert = claimsInput.map((claimInput: BatchClaimInput, index: number) => {
      const claimNumber = (maxNumber + index + 1).toString();
      const claimId = uuidv4();

      return {
        id: claimId,
        homeownerId: homeownerId,
        title: claimInput.title || '',
        description: claimInput.description || '',
        category: claimInput.category || 'General',
        claimNumber: claimNumber,
        address: homeownerData.address || '',
        homeownerName: homeownerData.name || '',
        homeownerEmail: homeownerData.email || '',
        builderName: homeownerData.builder || null,
        jobName: homeownerData.jobName || null,
        status: (claimInput.status as any) || 'SUBMITTED',
        classification: claimInput.classification || 'Unclassified',
        dateSubmitted: new Date(),
        attachments: claimInput.attachments || [],
        proposedDates: claimInput.proposedDates || [],
        dateEvaluated: null,
        nonWarrantyExplanation: null,
        internalNotes: null,
        contractorId: null,
        contractorName: null,
        contractorEmail: null,
        summary: null,
      };
    });

    // Insert all claims one by one (Neon serverless doesn't support true batch inserts with transactions)
    const insertedClaims = [];
    for (const claimData of claimsToInsert) {
      try {
        await db.insert(claims).values(claimData as any).execute();
        insertedClaims.push({
          id: claimData.id,
          claimNumber: claimData.claimNumber,
          title: claimData.title,
          category: claimData.category,
        });
      } catch (error: any) {
        console.error('Error inserting claim:', error);
        // Continue with other claims even if one fails
      }
    }

    if (insertedClaims.length === 0) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to insert any claims' }),
      };
    }

    console.log(`✅ Batch insert: ${insertedClaims.length} claims created for homeowner ${homeownerId}`);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        claims: insertedClaims,
        count: insertedClaims.length,
      }),
    };
  } catch (error: any) {
    console.error('❌ Batch claims API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};

