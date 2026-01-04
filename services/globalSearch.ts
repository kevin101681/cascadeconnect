/**
 * Global Search Service
 * Provides unified search across homeowners, claims, appointments, and messages
 * Uses Postgres full-text search capabilities for smart ranking
 */

import { db, isDbConfigured } from '../db';
import { homeowners, claims, appointments, internalMessages, internalChannels, users } from '../db/schema';
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
 * Search homeowners
 */
async function searchHomeowners(query: string): Promise<SearchResult[]> {
  if (!isDbConfigured) return [];

  const searchTerm = `%${query}%`;
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
    .where(
      or(
        ilike(homeowners.firstName, searchTerm),
        ilike(homeowners.lastName, searchTerm),
        ilike(homeowners.name, searchTerm),
        ilike(homeowners.email, searchTerm),
        ilike(homeowners.phone, searchTerm),
        ilike(homeowners.address, searchTerm),
        ilike(homeowners.jobName, searchTerm)
      )
    )
    .limit(10);

  return results.map((homeowner) => {
    const fullName = homeowner.name || `${homeowner.firstName || ''} ${homeowner.lastName || ''}`.trim();
    const displayName = fullName || homeowner.email || 'Unknown';
    
    // Calculate score based on match type
    const queryLower = query.toLowerCase();
    let score = 50; // Base score
    if (fullName.toLowerCase().includes(queryLower)) score = 90;
    else if (homeowner.email?.toLowerCase().includes(queryLower)) score = 80;
    else if (homeowner.address?.toLowerCase().includes(queryLower)) score = 70;
    else score = 60;

    return {
      type: 'homeowner' as const,
      id: homeowner.id,
      title: displayName,
      subtitle: homeowner.address || homeowner.email || '',
      url: `#homeowners?homeownerId=${homeowner.id}`,
      icon: 'User',
      score,
    };
  });
}

/**
 * Search claims
 */
async function searchClaims(query: string): Promise<SearchResult[]> {
  if (!isDbConfigured) return [];

  const searchTerm = `%${query}%`;
  const results = await db
    .select({
      id: claims.id,
      title: claims.title,
      description: claims.description,
      claimNumber: claims.claimNumber,
      status: claims.status,
      homeownerName: claims.homeownerName,
      address: claims.address,
    })
    .from(claims)
    .where(
      or(
        ilike(claims.title, searchTerm),
        ilike(claims.description, searchTerm),
        ilike(claims.claimNumber, searchTerm)
      )
    )
    .orderBy(desc(claims.dateSubmitted))
    .limit(10);

  return results.map((claim) => {
    // Create snippet from description (first 100 chars)
    const snippet = claim.description 
      ? (claim.description.length > 100 ? claim.description.substring(0, 100) + '...' : claim.description)
      : 'No description';

    // Calculate score
    const queryLower = query.toLowerCase();
    let score = 50;
    if (claim.title.toLowerCase().includes(queryLower)) score = 90;
    else if (claim.claimNumber?.toLowerCase().includes(queryLower)) score = 85;
    else if (claim.description?.toLowerCase().includes(queryLower)) score = 70;
    else score = 60;

    return {
      type: 'claim' as const,
      id: claim.id,
      title: claim.title || 'Untitled Claim',
      subtitle: `${claim.claimNumber ? `#${claim.claimNumber} • ` : ''}${claim.status || 'Unknown'} • ${snippet}`,
      url: `#claims?claimId=${claim.id}`,
      icon: 'ClipboardList',
      score,
    };
  });
}

/**
 * Search appointments/events
 */
async function searchAppointments(query: string): Promise<SearchResult[]> {
  if (!isDbConfigured) return [];

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
}

/**
 * Search internal chat messages
 */
async function searchMessages(query: string): Promise<SearchResult[]> {
  if (!isDbConfigured) return [];

  const searchTerm = `%${query}%`;
  
  // Join with channels and users to get context
  const results = await db
    .select({
      id: internalMessages.id,
      content: internalMessages.content,
      channelId: internalMessages.channelId,
      senderId: internalMessages.senderId,
      createdAt: internalMessages.createdAt,
      channelName: internalChannels.name,
      channelType: internalChannels.type,
      senderName: users.name,
    })
    .from(internalMessages)
    .leftJoin(internalChannels, sql`${internalMessages.channelId} = ${internalChannels.id}`)
    .leftJoin(users, sql`${internalMessages.senderId} = ${users.id}`)
    .where(ilike(internalMessages.content, searchTerm))
    .orderBy(desc(internalMessages.createdAt))
    .limit(10);

  return results.map((message) => {
    // Create snippet from content (first 80 chars)
    const snippet = message.content.length > 80 
      ? message.content.substring(0, 80) + '...' 
      : message.content;

    // Get context label
    const contextLabel = message.channelType === 'dm' 
      ? `DM with ${message.senderName || 'User'}`
      : message.channelName || 'Channel';

    // Calculate score
    const queryLower = query.toLowerCase();
    let score = 50;
    if (message.content.toLowerCase().includes(queryLower)) {
      // Exact match gets higher score
      if (message.content.toLowerCase().startsWith(queryLower)) score = 90;
      else score = 70;
    } else score = 60;

    // Boost recent messages
    if (message.createdAt) {
      const daysSince = (Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) score += 5; // Recent messages get slight boost
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
}

/**
 * Perform global search across all entities
 * @param query - Search query string
 * @returns Unified search results sorted by relevance
 */
export async function performGlobalSearch(query: string): Promise<SearchResponse> {
  if (!query || query.trim().length < 2) {
    return {
      results: [],
      total: 0,
      query: query.trim(),
    };
  }

  const trimmedQuery = query.trim();

  // Run all searches in parallel
  const [homeownerResults, claimResults, appointmentResults, messageResults] = await Promise.all([
    searchHomeowners(trimmedQuery),
    searchClaims(trimmedQuery),
    searchAppointments(trimmedQuery),
    searchMessages(trimmedQuery),
  ]);

  // Combine all results
  const allResults: SearchResult[] = [
    ...homeownerResults,
    ...claimResults,
    ...appointmentResults,
    ...messageResults,
  ];

  // Sort by score (highest first)
  allResults.sort((a, b) => b.score - a.score);

  return {
    results: allResults,
    total: allResults.length,
    query: trimmedQuery,
  };
}

