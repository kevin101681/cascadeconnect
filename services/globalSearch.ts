/**
 * Global Search Service
 * Provides unified search across homeowners, claims, appointments, and messages
 * Uses Postgres full-text search capabilities for smart ranking
 */

import { db, isDbConfigured } from '../db';
import { homeowners, claims, appointments, internalMessages, internalChannels, users, messageThreads } from '../db/schema';
import { or, ilike, and, gte, sql, desc } from 'drizzle-orm';
import type { SearchResult, SearchResponse } from '../types/search';

/**
 * Calculate relevance score for search results
 * Higher score = more relevant
 */
function calculateScore(matchType: 'exact' | 'partial' | 'fuzzy', fieldWeight: number = 1): number {
  const baseScores = {
    exact: 100,
    partial: 70,
    fuzzy: 40
  };
  return baseScores[matchType] * fieldWeight;
}

/**
 * Search homeowners with tokenized AND strategy
 * Every search term must match SOMEWHERE in the homeowner record
 */
async function searchHomeowners(query: string): Promise<SearchResult[]> {
  console.log('🔍 [SearchHomeowners] Called with query:', query);
  
  if (!isDbConfigured) {
    console.log('🔍 [SearchHomeowners] DB not configured, returning empty array');
    return [];
  }

  try {
    // Tokenize the search query into individual terms
    const terms = query.trim().split(/\s+/);
    console.log('🔍 [SearchHomeowners] Tokenized search terms:', terms);
    
    // Build WHERE clause: Each term must match at least one column
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
    
    console.log('🔍 [SearchHomeowners] Found', results.length, 'homeowners');

    return results.map((homeowner) => {
      const fullName = homeowner.name || `${homeowner.firstName || ''} ${homeowner.lastName || ''}`.trim();
      const displayName = fullName || homeowner.email || 'Unknown';
      
      // Calculate score based on how many terms match and where
      let score = 50; // Base score
      let matchCount = 0;
      
      terms.forEach(term => {
        const termLower = term.toLowerCase();
        if (fullName.toLowerCase().includes(termLower)) {
          score += 15;
          matchCount++;
        }
        if (homeowner.jobName?.toLowerCase().includes(termLower)) {
          score += 12; // Project code is important
          matchCount++;
        }
        if (homeowner.email?.toLowerCase().includes(termLower)) {
          score += 10;
          matchCount++;
        }
        if (homeowner.address?.toLowerCase().includes(termLower)) {
          score += 8;
          matchCount++;
        }
      });
      
      // Cap score at 100
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
  } catch (error) {
    console.error('🔍 [SearchHomeowners] Error:', error);
    return [];
  }
}

/**
 * Search claims with tokenized AND strategy
 * Joins with homeowners to search across both claim and homeowner data
 * Every search term must match SOMEWHERE in the claim or related homeowner
 */
async function searchClaims(query: string): Promise<SearchResult[]> {
  console.log('🔍 [SearchClaims] Called with query:', query);
  
  if (!isDbConfigured) {
    console.log('🔍 [SearchClaims] DB not configured, returning empty array');
    return [];
  }

  try {
    // Tokenize the search query into individual terms
    const terms = query.trim().split(/\s+/);
    console.log('🔍 [SearchClaims] Tokenized search terms:', terms);
    
    // Build WHERE clause: Each term must match at least one column (claim or homeowner)
    const whereConditions = and(
      ...terms.map(term => {
        const searchTerm = `%${term}%`;
        return or(
          // Claim fields
          ilike(claims.title, searchTerm),
          ilike(claims.description, searchTerm),
          ilike(claims.claimNumber, searchTerm),
          // Homeowner fields (joined)
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
        homeownerName: claims.homeownerName,
        address: claims.address,
        // Homeowner fields
        homeownerFirstName: homeowners.firstName,
        homeownerLastName: homeowners.lastName,
        homeownerJobName: homeowners.jobName,
        homeownerAddress: homeowners.address,
      })
      .from(claims)
      .leftJoin(homeowners, sql`${claims.homeownerId} = ${homeowners.id}`)
      .where(whereConditions)
      .orderBy(desc(claims.dateSubmitted))
      .limit(10);
  
    console.log('🔍 [SearchClaims] Found', results.length, 'claims');

    return results.map((claim) => {
      // Create snippet from description (first 100 chars)
      const snippet = claim.description 
        ? (claim.description.length > 100 ? claim.description.substring(0, 100) + '...' : claim.description)
        : 'No description';

      // Calculate score based on how many terms match and where
      let score = 50; // Base score
      let matchCount = 0;
      
      terms.forEach(term => {
        const termLower = term.toLowerCase();
        if (claim.title?.toLowerCase().includes(termLower)) {
          score += 15;
          matchCount++;
        }
        if (claim.description?.toLowerCase().includes(termLower)) {
          score += 12;
          matchCount++;
        }
        if (claim.claimNumber?.toLowerCase().includes(termLower)) {
          score += 13;
          matchCount++;
        }
        if (claim.homeownerJobName?.toLowerCase().includes(termLower)) {
          score += 12; // Project code match is important
          matchCount++;
        }
        if (claim.homeownerFirstName?.toLowerCase().includes(termLower) || 
            claim.homeownerLastName?.toLowerCase().includes(termLower)) {
          score += 10;
          matchCount++;
        }
        if (claim.homeownerAddress?.toLowerCase().includes(termLower)) {
          score += 8;
          matchCount++;
        }
      });
      
      // Cap score at 100
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
  } catch (error) {
    console.error('🔍 [SearchClaims] Error:', error);
    return [];
  }
}

/**
 * Search appointments/events
 */
async function searchAppointments(query: string): Promise<SearchResult[]> {
  console.log('🔍 [SearchAppointments] Called with query:', query);
  
  if (!isDbConfigured) {
    console.log('🔍 [SearchAppointments] DB not configured, returning empty array');
    return [];
  }

  try {
    const searchTerm = `%${query}%`;
    const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const results = await db
    .select({
      id: appointments.id,
      title: appointments.title,
      description: appointments.description,
      startTime: appointments.startTime,
      homeownerId: appointments.homeownerId,
    })
    .from(appointments)
    .where(
      and(
        or(
          ilike(appointments.title, searchTerm),
          ilike(appointments.description, searchTerm)
        ),
        // Only show future events or events from past 30 days
        gte(appointments.startTime, thirtyDaysAgo)
      )
    )
    .orderBy(desc(appointments.startTime))
    .limit(10);
  
  console.log('🔍 [SearchAppointments] Found', results.length, 'appointments');

  return results.map((appointment) => {
    const startDate = appointment.startTime ? new Date(appointment.startTime) : null;
    const dateStr = startDate ? startDate.toLocaleDateString() : 'Date TBD';
    const timeStr = startDate ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    // Calculate score
    const queryLower = query.toLowerCase();
    let score = 50;
    if (appointment.title.toLowerCase().includes(queryLower)) score = 90;
    else if (appointment.description?.toLowerCase().includes(queryLower)) score = 70;
    else score = 60;

    // Boost score for future events
    if (startDate && startDate > new Date()) {
      score += 10;
    }

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
  } catch (error) {
    console.error('🔍 [SearchAppointments] Error:', error);
    return [];
  }
}

/**
 * Search internal chat messages with tokenized AND strategy
 * Joins with channels, users, and homeowner mentions
 * Every search term must match SOMEWHERE in the message content or mentioned homeowner data
 */
async function searchMessages(query: string): Promise<SearchResult[]> {
  console.log('🔍 [SearchMessages] Called with query:', query);
  
  if (!isDbConfigured) {
    console.log('🔍 [SearchMessages] DB not configured, returning empty array');
    return [];
  }

  try {
    // Tokenize the search query into individual terms
    const terms = query.trim().split(/\s+/);
    console.log('🔍 [SearchMessages] Tokenized search terms:', terms);
    
    // For internal messages, we need to search:
    // 1. Message content
    // 2. Mentioned homeowner data (stored in JSON mentions field)
    // Since mentions is JSON, we'll need to use the content field and potentially
    // join with homeowners if mentions contain homeowner IDs
    
    // Build WHERE clause: Each term must match at least one column
    const whereConditions = and(
      ...terms.map(term => {
        const searchTerm = `%${term}%`;
        return or(
          // Message content
          ilike(internalMessages.content, searchTerm),
          // Channel name
          ilike(internalChannels.name, searchTerm),
          // Sender name
          ilike(users.name, searchTerm)
        );
      })
    );
    
    // Join with channels and users to get context
    const results = await db
    .select({
      id: internalMessages.id,
      content: internalMessages.content,
      channelId: internalMessages.channelId,
      senderId: internalMessages.senderId,
      createdAt: internalMessages.createdAt,
      mentions: internalMessages.mentions,
      channelName: internalChannels.name,
      channelType: internalChannels.type,
      senderName: users.name,
    })
    .from(internalMessages)
    .leftJoin(internalChannels, sql`${internalMessages.channelId} = ${internalChannels.id}`)
    .leftJoin(users, sql`${internalMessages.senderId} = ${users.id}`)
    .where(whereConditions)
    .orderBy(desc(internalMessages.createdAt))
    .limit(10);
  
  console.log('🔍 [SearchMessages] Found', results.length, 'messages');

  return results.map((message) => {
    // Create snippet from content (first 80 chars)
    const snippet = message.content.length > 80 
      ? message.content.substring(0, 80) + '...' 
      : message.content;

    // Get context label
    const contextLabel = message.channelType === 'dm' 
      ? `DM with ${message.senderName || 'User'}`
      : message.channelName || 'Channel';

    // Calculate score based on how many terms match and where
    let score = 50; // Base score
    
    terms.forEach(term => {
      const termLower = term.toLowerCase();
      if (message.content.toLowerCase().includes(termLower)) {
        // Exact match at start gets higher score
        if (message.content.toLowerCase().startsWith(termLower)) {
          score += 15;
        } else {
          score += 12;
        }
      }
      if (message.channelName?.toLowerCase().includes(termLower)) {
        score += 10;
      }
      if (message.senderName?.toLowerCase().includes(termLower)) {
        score += 8;
      }
      
      // Check mentions for homeowner project codes
      if (message.mentions && Array.isArray(message.mentions)) {
        for (const mention of message.mentions as any[]) {
          if (mention.projectName?.toLowerCase().includes(termLower) ||
              mention.address?.toLowerCase().includes(termLower)) {
            score += 12; // Boost for project code/address match in mentions
          }
        }
      }
    });
    
    // Cap score at 100
    score = Math.min(score, 100);

    // Boost recent messages
    if (message.createdAt) {
      const daysSince = (Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) score = Math.min(score + 5, 100); // Recent messages get slight boost
    }

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
  } catch (error) {
    console.error('🔍 [SearchMessages] Error:', error);
    return [];
  }
}

/**
 * Search homeowner message threads with tokenized AND strategy
 * Joins with homeowners to enable cross-column search
 * Every search term must match SOMEWHERE in the thread subject, message content, or homeowner data
 */
async function searchHomeownerThreads(query: string): Promise<SearchResult[]> {
  console.log('🔍 [SearchHomeownerThreads] Called with query:', query);
  
  if (!isDbConfigured) {
    console.log('🔍 [SearchHomeownerThreads] DB not configured, returning empty array');
    return [];
  }

  try {
    // Tokenize the search query into individual terms
    const terms = query.trim().split(/\s+/);
    console.log('🔍 [SearchHomeownerThreads] Tokenized search terms:', terms);
    
    // Build WHERE clause: Each term must match at least one column
    const whereConditions = and(
      ...terms.map(term => {
        const searchTerm = `%${term}%`;
        return or(
          // Thread subject
          ilike(messageThreads.subject, searchTerm),
          // Homeowner fields
          ilike(homeowners.firstName, searchTerm),
          ilike(homeowners.lastName, searchTerm),
          ilike(homeowners.jobName, searchTerm),
          ilike(homeowners.address, searchTerm)
          // Note: We can't easily search inside the JSON messages array with this approach
          // For full-text search in JSON, we'd need to use PostgreSQL's jsonb functions
        );
      })
    );
    
    const results = await db
      .select({
        id: messageThreads.id,
        subject: messageThreads.subject,
        homeownerId: messageThreads.homeownerId,
        lastMessageAt: messageThreads.lastMessageAt,
        messages: messageThreads.messages,
        // Homeowner fields
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
  
    console.log('🔍 [SearchHomeownerThreads] Found', results.length, 'threads');

    return results.map((thread) => {
      // Get homeowner name
      const homeownerName = thread.homeownerName || 
        `${thread.homeownerFirstName || ''} ${thread.homeownerLastName || ''}`.trim() || 
        'Unknown Homeowner';

      // Calculate score based on how many terms match and where
      let score = 50; // Base score
      
      terms.forEach(term => {
        const termLower = term.toLowerCase();
        if (thread.subject?.toLowerCase().includes(termLower)) {
          score += 15;
        }
        if (thread.homeownerJobName?.toLowerCase().includes(termLower)) {
          score += 12; // Project code match is important
        }
        if (homeownerName.toLowerCase().includes(termLower)) {
          score += 10;
        }
        if (thread.homeownerAddress?.toLowerCase().includes(termLower)) {
          score += 8;
        }
        
        // Search in message content (JSON array)
        if (thread.messages && Array.isArray(thread.messages)) {
          for (const msg of thread.messages as any[]) {
            if (msg.content?.toLowerCase().includes(termLower)) {
              score += 10;
              break; // Only count once per term
            }
          }
        }
      });
      
      // Cap score at 100
      score = Math.min(score, 100);

      // Boost recent threads
      if (thread.lastMessageAt) {
        const daysSince = (Date.now() - new Date(thread.lastMessageAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) score = Math.min(score + 5, 100);
      }

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
  } catch (error) {
    console.error('🔍 [SearchHomeownerThreads] Error:', error);
    return [];
  }
}

/**
 * Perform global search across all entities
 * @param query - Search query string
 * @returns Unified search results sorted by relevance
 */
export async function performGlobalSearch(query: string): Promise<SearchResponse> {
  console.log('🔍 [GlobalSearch] performGlobalSearch called with query:', query);
  console.log('🔍 [GlobalSearch] isDbConfigured:', isDbConfigured);
  
  if (!query || query.trim().length < 2) {
    console.log('🔍 [GlobalSearch] Query too short, returning empty results');
    return {
      results: [],
      total: 0,
      query: query.trim(),
    };
  }

  const trimmedQuery = query.trim();
  console.log('🔍 [GlobalSearch] Starting parallel searches for:', trimmedQuery);

  try {
    // Run all searches in parallel
    const [homeownerResults, claimResults, appointmentResults, messageResults, threadResults] = await Promise.all([
      searchHomeowners(trimmedQuery),
      searchClaims(trimmedQuery),
      searchAppointments(trimmedQuery),
      searchMessages(trimmedQuery),
      searchHomeownerThreads(trimmedQuery),
    ]);

    console.log('🔍 [GlobalSearch] Search results:', {
      homeowners: homeownerResults.length,
      claims: claimResults.length,
      appointments: appointmentResults.length,
      messages: messageResults.length,
      threads: threadResults.length,
    });

    // Combine all results
    const allResults: SearchResult[] = [
      ...homeownerResults,
      ...claimResults,
      ...appointmentResults,
      ...messageResults,
      ...threadResults,
    ];

    // Sort by score (highest first)
    allResults.sort((a, b) => b.score - a.score);

    console.log('🔍 [GlobalSearch] Returning', allResults.length, 'total results');
    return {
      results: allResults,
      total: allResults.length,
      query: trimmedQuery,
    };
  } catch (error) {
    console.error('🔍 [GlobalSearch] Error during search:', error);
    return {
      results: [],
      total: 0,
      query: trimmedQuery,
    };
  }
}

