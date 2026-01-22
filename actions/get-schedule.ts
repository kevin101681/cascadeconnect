/**
 * GET SCHEDULE ACTION
 * Unified event fetch for the Schedule Tab
 * Fetches both Appointments and Claims with Repair Dates
 * January 22, 2026
 */

import { db, isDbConfigured } from '../db';
import { appointments, claims, homeowners } from '../db/schema';
import { eq, isNotNull, sql } from 'drizzle-orm';

/**
 * Calendar Event interface matching ScheduleTab expectations
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'appointment' | 'repair' | 'inspection' | 'phone_call' | 'other' | 'REPAIR';
  visibility?: 'internal_only' | 'shared_with_homeowner';
  homeownerId?: string;
  homeownerName?: string;
  claimId?: string; // For claim events
  appointmentId?: string; // For appointment events
  description?: string;
}

/**
 * Fetch all schedule events (appointments + claim repair dates)
 * @param homeownerId - Optional: filter by specific homeowner
 * @returns Array of calendar events sorted by date ascending
 */
export async function getScheduleEvents(homeownerId?: string): Promise<CalendarEvent[]> {
  if (!isDbConfigured) {
    console.warn('⚠️ Database not configured');
    return [];
  }

  try {
    const events: CalendarEvent[] = [];

    // 1. Fetch Appointments (existing logic)
    let appointmentsQuery = db
      .select({
        id: appointments.id,
        title: appointments.title,
        description: appointments.description,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        homeownerId: appointments.homeownerId,
        visibility: appointments.visibility,
        type: appointments.type,
      })
      .from(appointments);

    // Filter by homeownerId if provided
    if (homeownerId) {
      appointmentsQuery = appointmentsQuery.where(eq(appointments.homeownerId, homeownerId)) as any;
    }

    const appointmentResults = await appointmentsQuery;

    // Get homeowner names for appointments
    const appointmentHomeownerIds = [...new Set(appointmentResults
      .map(appt => appt.homeownerId)
      .filter(Boolean))] as string[];
    
    const homeownerMap = new Map<string, string>();
    if (appointmentHomeownerIds.length > 0) {
      const homeownerResults = await db
        .select({
          id: homeowners.id,
          name: homeowners.name,
          address: homeowners.address,
        })
        .from(homeowners)
        .where(sql`${homeowners.id} IN (${sql.join(appointmentHomeownerIds.map(id => sql`${id}`), sql`, `)})`);

      homeownerResults.forEach(h => {
        homeownerMap.set(h.id, h.name || h.address || 'Unknown');
      });
    }

    // Transform appointments to calendar events
    const appointmentEvents: CalendarEvent[] = appointmentResults.map((appt) => ({
      id: appt.id,
      title: appt.title,
      start: new Date(appt.startTime),
      end: new Date(appt.endTime),
      type: appt.type || 'other',
      visibility: appt.visibility,
      homeownerId: appt.homeownerId || undefined,
      homeownerName: appt.homeownerId ? homeownerMap.get(appt.homeownerId) : undefined,
      appointmentId: appt.id,
      description: appt.description || undefined,
    }));

    events.push(...appointmentEvents);

    // 2. Fetch Claims with Repair Dates
    let claimsQuery = db
      .select({
        id: claims.id,
        title: claims.title,
        description: claims.description,
        homeownerId: claims.homeownerId,
        scheduledAt: claims.scheduledAt,
        status: claims.status,
        claimNumber: claims.claimNumber,
      })
      .from(claims)
      .where(isNotNull(claims.scheduledAt)); // Only claims with scheduled dates

    // Filter by homeownerId if provided
    if (homeownerId) {
      claimsQuery = claimsQuery.where(eq(claims.homeownerId, homeownerId)) as any;
    }

    const claimResults = await claimsQuery;

    // Get homeowner names for claims
    const claimHomeownerIds = [...new Set(claimResults
      .map(claim => claim.homeownerId)
      .filter(Boolean))] as string[];
    
    if (claimHomeownerIds.length > 0) {
      const claimHomeownerResults = await db
        .select({
          id: homeowners.id,
          name: homeowners.name,
          address: homeowners.address,
        })
        .from(homeowners)
        .where(sql`${homeowners.id} IN (${sql.join(claimHomeownerIds.map(id => sql`${id}`), sql`, `)})`);

      claimHomeownerResults.forEach(h => {
        homeownerMap.set(h.id, h.name || h.address || 'Unknown');
      });
    }

    // 3. Map Claims to Calendar Events
    const claimEvents: CalendarEvent[] = claimResults.map((claim) => {
      const repairDate = new Date(claim.scheduledAt!);
      
      // Set end time to 1 hour after start for timed events
      // If no time component, make it an all-day event (same start/end)
      const endDate = new Date(repairDate);
      const hasTimeComponent = repairDate.getHours() !== 0 || repairDate.getMinutes() !== 0;
      if (hasTimeComponent) {
        endDate.setHours(repairDate.getHours() + 1); // 1-hour duration
      }

      return {
        id: `claim-${claim.id}`,
        title: `Repair: ${claim.title}`,
        start: repairDate,
        end: endDate,
        type: 'REPAIR', // Special type for claim repairs
        visibility: 'shared_with_homeowner',
        homeownerId: claim.homeownerId || undefined,
        homeownerName: claim.homeownerId ? homeownerMap.get(claim.homeownerId) : undefined,
        claimId: claim.id,
        description: claim.description || undefined,
      };
    });

    events.push(...claimEvents);

    // 4. Merge & Sort by date ascending
    events.sort((a, b) => a.start.getTime() - b.start.getTime());

    console.log(`✅ Fetched ${appointmentEvents.length} appointments and ${claimEvents.length} claim repair dates`);
    return events;
  } catch (error) {
    console.error('❌ Error fetching schedule events:', error);
    throw error;
  }
}

/**
 * Fetch schedule events for a specific date range
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @param homeownerId - Optional: filter by specific homeowner
 * @returns Array of calendar events in the date range
 */
export async function getScheduleEventsByDateRange(
  startDate: Date,
  endDate: Date,
  homeownerId?: string
): Promise<CalendarEvent[]> {
  const allEvents = await getScheduleEvents(homeownerId);
  
  return allEvents.filter(event => 
    event.start >= startDate && event.start <= endDate
  );
}
