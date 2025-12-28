/**
 * GMAIL ADD-ON API ENDPOINT
 * 
 * Provides secure data access for the Cascade Connect Gmail Add-on.
 * 
 * Security: Requires x-cascade-addon-secret header matching GMAIL_ADDON_SECRET env var.
 * 
 * Input: { address?: string, phoneNumber?: string, type: 'claim' | 'unknown' }
 * Output: { summary, homeownerName, status, linkToDashboard, claimId, claimNumber, phoneMatches }
 */

import { Handler, HandlerEvent } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc, or, like, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';

// Initialize database connection
const getDatabaseConnection = () => {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  const sqlClient = neon(connectionString);
  return drizzle(sqlClient, { schema });
};

// Security check
const isAuthorized = (event: HandlerEvent): boolean => {
  const secret = event.headers['x-cascade-addon-secret'];
  const expectedSecret = process.env.GMAIL_ADDON_SECRET;
  
  if (!expectedSecret) {
    console.error('⚠️ GMAIL_ADDON_SECRET environment variable is not set');
    return false;
  }
  
  return secret === expectedSecret;
};

// Format phone number for comparison (remove all non-digits)
const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

export const handler: Handler = async (event) => {
  // CORS Headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-cascade-addon-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Security check
  if (!isAuthorized(event)) {
    console.error('❌ Unauthorized Gmail Add-on request');
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Invalid or missing x-cascade-addon-secret header'
      }),
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { address, phoneNumber, type } = body;

    if (!type || (type !== 'claim' && type !== 'unknown')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Bad Request',
          message: 'Type must be either "claim" or "unknown"'
        }),
      };
    }

    console.log('📧 Gmail Add-on request:', { type, address, phoneNumber: phoneNumber ? '***' : undefined });

    const db = getDatabaseConnection();
    let result: any = {
      summary: 'No data found',
      homeownerName: null,
      status: null,
      linkToDashboard: process.env.VITE_APP_URL || 'https://cascadeconnect.netlify.app',
      claimId: null,
      claimNumber: null,
      phoneMatches: [],
    };

    // ============================================
    // CLAIM TYPE: Lookup by Address
    // ============================================
    if (type === 'claim' && address) {
      // Query the latest claim for this address
      const claims = await db
        .select()
        .from(schema.claims)
        .where(eq(schema.claims.address, address))
        .orderBy(desc(schema.claims.dateSubmitted))
        .limit(1);

      if (claims.length > 0) {
        const claim = claims[0];
        
        result.summary = claim.summary || claim.description || 'Claim details available';
        result.homeownerName = claim.homeownerName;
        result.status = claim.status;
        result.claimId = claim.id;
        result.claimNumber = claim.claimNumber;
        result.linkToDashboard = `${result.linkToDashboard}/dashboard`;

        console.log(`✅ Found claim: ${claim.id} (${claim.status})`);
      } else {
        result.summary = `No claims found for address: ${address}`;
        console.log(`⚠️ No claims found for address: ${address}`);
      }
    }

    // ============================================
    // UNKNOWN TYPE: Lookup by Phone Number
    // ============================================
    if (type === 'unknown' && phoneNumber) {
      const normalizedPhone = normalizePhone(phoneNumber);
      
      // Search for homeowners with matching phone
      // We'll search both primary phone and buyer2Phone
      const homeownerMatches = await db
        .select()
        .from(schema.homeowners)
        .where(
          or(
            sql`REGEXP_REPLACE(${schema.homeowners.phone}, '[^0-9]', '', 'g') = ${normalizedPhone}`,
            sql`REGEXP_REPLACE(${schema.homeowners.buyer2Phone}, '[^0-9]', '', 'g') = ${normalizedPhone}`
          )
        )
        .limit(5);

      if (homeownerMatches.length > 0) {
        result.phoneMatches = homeownerMatches.map((h: any) => ({
          id: h.id,
          name: h.name,
          email: h.email,
          phone: h.phone,
          address: h.address,
          builder: h.builder,
        }));

        const firstMatch = homeownerMatches[0];
        result.homeownerName = firstMatch.name;
        result.summary = `Found ${homeownerMatches.length} homeowner(s) with this phone number`;
        result.linkToDashboard = `${result.linkToDashboard}/dashboard`;

        console.log(`✅ Found ${homeownerMatches.length} homeowner(s) matching phone: ***${normalizedPhone.slice(-4)}`);

        // Also check for recent claims from this homeowner
        if (firstMatch.id) {
          const recentClaims = await db
            .select()
            .from(schema.claims)
            .where(eq(schema.claims.homeownerId, firstMatch.id))
            .orderBy(desc(schema.claims.dateSubmitted))
            .limit(3);

          if (recentClaims.length > 0) {
            result.recentClaims = recentClaims.map((c: any) => ({
              id: c.id,
              title: c.title,
              status: c.status,
              dateSubmitted: c.dateSubmitted,
              claimNumber: c.claimNumber,
            }));
            
            result.summary += `. ${recentClaims.length} recent claim(s) found.`;
          }
        }
      } else {
        result.summary = `No homeowners found with phone: ${phoneNumber}`;
        console.log(`⚠️ No homeowners found for phone: ***${normalizedPhone.slice(-4)}`);
      }
    }

    // Return result
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('❌ Gmail Add-on error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
    };
  }
};

