import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { 
  homeowners, 
  claims, 
  appointments, 
  internalMessages, 
  internalChannels, 
  users, 
  messageThreads 
} from '../../db/schema';
import { or, ilike, and, gte, sql, desc } from 'drizzle-orm';

/**
 * Admin Search API
 * 
 * GET /.netlify/functions/admin-search?query=XXX&types=homeowner,claim,event,message
 * 
 * Performs server-side search across multiple entity types
 * Returns unified search results with relevance scoring
 */

interface SearchResult {
  type: 'homeowner' | 'claim' | 'event' | 'message';
  id: string;
  title: string;
  subtitle: string;
  url: string;
  icon: string;
  score: number;
}

interface SearchResponse {
  success: boolean;
  results?: SearchResult[];
  total?: number;
  query?: string;
  error?: string;
  message?: string;
}

const getJsonHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
});

const createJsonResponse = (statusCode: number, data: any) => {
  return {
    statusCode,
    headers: getJsonHeaders(),
    body: JSON.stringify(data),
  };
};

/**
 * Search homeowners with tokenized AND strategy
 */
async function searchHomeowners(db: any, query: string): Promise<SearchResult[]> {
  const terms = query.trim().split(/\s+/);
  
  const whereConditions = and(
    ...terms.map(term => {
      const searchTerm = `%${term}%`;
      return or(
        ilike(homeowners.firstName, searchTerm),
        ilike(homeowners.lastName, searchTerm),
        ilike(homeowners.name, searchTerm),
        ilike(homeowners.email, searchTerm),
        ilike(homeowners.phone, searchTerm),
        ilike(homeowners.address, searchTerm),
        ilike(homeowners.jobName, searchTerm)
      );
    })
  );
  
  const results = await db
    .select({
      id: homeowners.id,
      firstName: homeowners.firstName,
      lastName: homeowners.lastName,
      name: homeowners.name,
      email: homeowners.email,
      phone: homeowners.phone,
      address: homeowners.address,
      jobName: homeowners.jobName,
    })
    .from(homeowners)
    .where(whereConditions)
    .limit(10);

  return results.map((homeowner: any) => {
    const fullName = homeowner.name || `${homeowner.firstName || ''} ${homeowner.lastName || ''}`.trim();
    const displayName = fullName || homeowner.email || 'Unknown';
    
    let score = 50;
    terms.forEach(term => {
      const termLower = term.toLowerCase();
      if (fullName.toLowerCase().includes(termLower)) score += 15;
      if (homeowner.jobName?.toLowerCase().includes(termLower)) score += 12;
      if (homeowner.email?.toLowerCase().includes(termLower)) score += 10;
      if (homeowner.address?.toLowerCase().includes(termLower)) score += 8;
    });
    
    score = Math.min(score, 100);

    return {
      type: 'homeowner' as const,
      id: homeowner.id,
      title: displayName,
      subtitle: `${homeowner.jobName ? `${homeowner.jobName} • ` : ''}${homeowner.address || homeowner.email || ''}`,
      url: `#homeowners?homeownerId=${homeowner.id}`,
      icon: 'User',
      score,
    };
  });
}

/**
 * Search claims with tokenized AND strategy
 */
async function searchClaims(db: any, query: string): Promise<SearchResult[]> {
  const terms = query.trim().split(/\s+/);
  
  const whereConditions = and(
    ...terms.map(term => {
      const searchTerm = `%${term}%`;
      return or(
        ilike(claims.title, searchTerm),
        ilike(claims.description, searchTerm),
        ilike(claims.claimNumber, searchTerm),
        ilike(homeowners.firstName, searchTerm),
        ilike(homeowners.lastName, searchTerm),
        ilike(homeowners.jobName, searchTerm),
        ilike(homeowners.address, searchTerm)
      );
    })
  );
  
  const results = await db
    .select({
      id: claims.id,
      title: claims.title,
      description: claims.description,
      claimNumber: claims.claimNumber,
      status: claims.status,
      homeownerJobName: homeowners.jobName,
      homeownerFirstName: homeowners.firstName,
      homeownerLastName: homeowners.lastName,
      homeownerAddress: homeowners.address,
    })
    .from(claims)
    .leftJoin(homeowners, sql`${claims.homeownerId} = ${homeowners.id}`)
    .where(whereConditions)
    .orderBy(desc(claims.dateSubmitted))
    .limit(10);

  return results.map((claim: any) => {
    const snippet = claim.description 
      ? (claim.description.length > 100 ? claim.description.substring(0, 100) + '...' : claim.description)
      : 'No description';

    let score = 50;
    terms.forEach(term => {
      const termLower = term.toLowerCase();
      if (claim.title?.toLowerCase().includes(termLower)) score += 15;
      if (claim.description?.toLowerCase().includes(termLower)) score += 12;
      if (claim.claimNumber?.toLowerCase().includes(termLower)) score += 13;
      if (claim.homeownerJobName?.toLowerCase().includes(termLower)) score += 12;
    });
    
    score = Math.min(score, 100);

    return {
      type: 'claim' as const,
      id: claim.id,
      title: claim.title || 'Untitled Claim',
      subtitle: `${claim.homeownerJobName ? `${claim.homeownerJobName} • ` : ''}${claim.claimNumber ? `#${claim.claimNumber} • ` : ''}${claim.status || 'Unknown'} • ${snippet}`,
      url: `#claims?claimId=${claim.id}`,
      icon: 'ClipboardList',
      score,
    };
  });
}

/**
 * Search appointments/events
 */
async function searchAppointments(db: any, query: string): Promise<SearchResult[]> {
  const searchTerm = `%${query}%`;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const results = await db
    .select({
      id: appointments.id,
      title: appointments.title,
      description: appointments.description,
      startTime: appointments.startTime,
    })
    .from(appointments)
    .where(
      and(
        or(
          ilike(appointments.title, searchTerm),
          ilike(appointments.description, searchTerm)
        ),
        gte(appointments.startTime, thirtyDaysAgo)
      )
    )
    .orderBy(desc(appointments.startTime))
    .limit(10);

  return results.map((appointment: any) => {
    const startDate = appointment.startTime ? new Date(appointment.startTime) : null;
    const dateStr = startDate ? startDate.toLocaleDateString() : 'Date TBD';
    const timeStr = startDate ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    const queryLower = query.toLowerCase();
    let score = 50;
    if (appointment.title.toLowerCase().includes(queryLower)) score = 90;
    else if (appointment.description?.toLowerCase().includes(queryLower)) score = 70;
    else score = 60;

    if (startDate && startDate > new Date()) score += 10;

    return {
      type: 'event' as const,
      id: appointment.id,
      title: appointment.title,
      subtitle: `${dateStr}${timeStr ? ` at ${timeStr}` : ''}`,
      url: `#schedule?appointmentId=${appointment.id}`,
      icon: 'Calendar',
      score,
    };
  });
}

/**
 * Search internal chat messages
 */
async function searchMessages(db: any, query: string): Promise<SearchResult[]> {
  const terms = query.trim().split(/\s+/);
  
  const whereConditions = and(
    ...terms.map(term => {
      const searchTerm = `%${term}%`;
      return or(
        ilike(internalMessages.content, searchTerm),
        ilike(internalChannels.name, searchTerm),
        ilike(users.name, searchTerm)
      );
    })
  );
  
  const results = await db
    .select({
      id: internalMessages.id,
      content: internalMessages.content,
      channelId: internalMessages.channelId,
      createdAt: internalMessages.createdAt,
      mentions: internalMessages.mentions,
      channelName: internalChannels.name,
      channelType: internalChannels.type,
      senderName: users.name,
    })
    .from(internalMessages)
    .leftJoin(internalChannels, sql`${internalMessages.channelId} = ${internalChannels.id}`)
    .leftJoin(users, sql`${internalMessages.senderId} = ${users.clerkId}`)
    .where(whereConditions)
    .orderBy(desc(internalMessages.createdAt))
    .limit(10);

  return results.map((message: any) => {
    const snippet = message.content.length > 80 
      ? message.content.substring(0, 80) + '...' 
      : message.content;

    const contextLabel = message.channelType === 'dm' 
      ? `DM with ${message.senderName || 'User'}`
      : message.channelName || 'Channel';

    let score = 50;
    terms.forEach(term => {
      const termLower = term.toLowerCase();
      if (message.content.toLowerCase().includes(termLower)) {
        score += message.content.toLowerCase().startsWith(termLower) ? 15 : 12;
      }
      if (message.channelName?.toLowerCase().includes(termLower)) score += 10;
      if (message.senderName?.toLowerCase().includes(termLower)) score += 8;
    });
    
    score = Math.min(score, 100);

    return {
      type: 'message' as const,
      id: message.id,
      title: snippet,
      subtitle: `${contextLabel} • ${message.senderName || 'Unknown'}`,
      url: `#chat?channelId=${message.channelId}&messageId=${message.id}`,
      icon: 'MessageCircle',
      score,
    };
  });
}

/**
 * Search message threads
 */
async function searchThreads(db: any, query: string): Promise<SearchResult[]> {
  const terms = query.trim().split(/\s+/);
  
  const whereConditions = and(
    ...terms.map(term => {
      const searchTerm = `%${term}%`;
      return or(
        ilike(messageThreads.subject, searchTerm),
        ilike(homeowners.firstName, searchTerm),
        ilike(homeowners.lastName, searchTerm),
        ilike(homeowners.jobName, searchTerm),
        ilike(homeowners.address, searchTerm)
      );
    })
  );
  
  const results = await db
    .select({
      id: messageThreads.id,
      subject: messageThreads.subject,
      lastMessageAt: messageThreads.lastMessageAt,
      messages: messageThreads.messages,
      homeownerFirstName: homeowners.firstName,
      homeownerLastName: homeowners.lastName,
      homeownerName: homeowners.name,
      homeownerJobName: homeowners.jobName,
      homeownerAddress: homeowners.address,
    })
    .from(messageThreads)
    .leftJoin(homeowners, sql`${messageThreads.homeownerId} = ${homeowners.id}`)
    .where(whereConditions)
    .orderBy(desc(messageThreads.lastMessageAt))
    .limit(10);

  return results.map((thread: any) => {
    const homeownerName = thread.homeownerName || 
      `${thread.homeownerFirstName || ''} ${thread.homeownerLastName || ''}`.trim() || 
      'Unknown Homeowner';

    let score = 50;
    terms.forEach(term => {
      const termLower = term.toLowerCase();
      if (thread.subject?.toLowerCase().includes(termLower)) score += 15;
      if (thread.homeownerJobName?.toLowerCase().includes(termLower)) score += 12;
      if (homeownerName.toLowerCase().includes(termLower)) score += 10;
      if (thread.homeownerAddress?.toLowerCase().includes(termLower)) score += 8;
    });
    
    score = Math.min(score, 100);

    return {
      type: 'message' as const,
      id: thread.id,
      title: thread.subject,
      subtitle: `${thread.homeownerJobName ? `${thread.homeownerJobName} • ` : ''}${homeownerName}`,
      url: `#messages?threadId=${thread.id}`,
      icon: 'MessageCircle',
      score,
    };
  });
}

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  console.log('🔵 admin-search function invoked', {
    method: event.httpMethod,
    query: event.queryStringParameters
  });

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createJsonResponse(200, {});
    }

    // Method validation
    if (event.httpMethod !== 'GET') {
      return createJsonResponse(405, {
        success: false,
        error: 'Method not allowed'
      });
    }

    // Extract query
    const query = event.queryStringParameters?.query;
    const typesParam = event.queryStringParameters?.types;

    if (!query || query.trim().length < 2) {
      return createJsonResponse(200, {
        success: true,
        results: [],
        total: 0,
        query: query || ''
      });
    }

    // Get database URL
    const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not configured');
      return createJsonResponse(500, {
        success: false,
        error: 'Database not configured'
      });
    }

    // Initialize database
    const sqlClient = neon(databaseUrl);
    const db = drizzle(sqlClient, { 
      schema: { 
        homeowners, 
        claims, 
        appointments, 
        internalMessages, 
        internalChannels, 
        users, 
        messageThreads 
      } 
    });

    // Parse types to search
    const types = typesParam ? typesParam.split(',') : ['homeowner', 'claim', 'event', 'message'];

    console.log('🔍 Starting search:', { query, types });

    // Run searches in parallel
    const searches = [];
    if (types.includes('homeowner')) searches.push(searchHomeowners(db, query));
    if (types.includes('claim')) searches.push(searchClaims(db, query));
    if (types.includes('event')) searches.push(searchAppointments(db, query));
    if (types.includes('message')) {
      searches.push(searchMessages(db, query));
      searches.push(searchThreads(db, query));
    }

    const results = await Promise.all(searches);
    const allResults = results.flat();

    // Sort by score
    allResults.sort((a, b) => b.score - a.score);

    console.log('✅ Search complete:', allResults.length, 'results');

    return createJsonResponse(200, {
      success: true,
      results: allResults,
      total: allResults.length,
      query
    });

  } catch (error: any) {
    console.error('❌ Error in admin-search function:', error);
    return createJsonResponse(500, {
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Unknown error'
    });
  }
};
