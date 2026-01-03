/**
 * Appointments Service
 * Utility functions for working with appointments in the Vapi AI integration
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { appointments } from '../../db/schema';
import { eq, and, gte } from 'drizzle-orm';

interface UpcomingAppointment {
  date: string;
  time: string;
  title: string;
  type: string;
}

/**
 * Get upcoming appointments for a homeowner (for Vapi AI agent)
 * Returns a simplified, AI-friendly string format
 * 
 * @param homeownerId - The UUID of the homeowner
 * @param limit - Maximum number of appointments to return (default: 3)
 * @returns A formatted string of upcoming appointments or a message if none exist
 */
export async function getUpcomingAppointments(
  homeownerId: string,
  limit: number = 3
): Promise<string> {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured');
    }

    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);

    const now = new Date();

    // Query upcoming appointments
    const upcomingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.homeownerId, homeownerId),
          eq(appointments.visibility, 'shared_with_homeowner'),
          gte(appointments.startTime, now)
        )
      )
      .orderBy(appointments.startTime)
      .limit(limit);

    if (!upcomingAppointments || upcomingAppointments.length === 0) {
      return 'You have no upcoming appointments scheduled at this time.';
    }

    // Format appointments for AI agent
    const formattedAppointments: UpcomingAppointment[] = upcomingAppointments.map((appt) => {
      const startDate = new Date(appt.startTime);
      return {
        date: startDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        time: startDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        title: appt.title,
        type: appt.type,
      };
    });

    // Convert to natural language string
    const appointmentStrings = formattedAppointments.map((appt, index) => {
      return `${index + 1}. ${appt.title} on ${appt.date} at ${appt.time}`;
    });

    return `You have ${upcomingAppointments.length} upcoming appointment${upcomingAppointments.length > 1 ? 's' : ''}:\n${appointmentStrings.join('\n')}`;
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    return 'I was unable to retrieve your appointment information at this time. Please try again later.';
  }
}

/**
 * Get upcoming appointments as JSON (for programmatic use)
 * 
 * @param homeownerId - The UUID of the homeowner
 * @param limit - Maximum number of appointments to return (default: 3)
 * @returns Array of upcoming appointments or empty array
 */
export async function getUpcomingAppointmentsJSON(
  homeownerId: string,
  limit: number = 3
): Promise<UpcomingAppointment[]> {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured');
    }

    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);

    const now = new Date();

    const upcomingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.homeownerId, homeownerId),
          eq(appointments.visibility, 'shared_with_homeowner'),
          gte(appointments.startTime, now)
        )
      )
      .orderBy(appointments.startTime)
      .limit(limit);

    return upcomingAppointments.map((appt) => {
      const startDate = new Date(appt.startTime);
      return {
        date: startDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        time: startDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        title: appt.title,
        type: appt.type,
      };
    });
  } catch (error) {
    console.error('Error fetching upcoming appointments JSON:', error);
    return [];
  }
}

/**
 * Get the next appointment for a homeowner (for quick queries)
 * 
 * @param homeownerId - The UUID of the homeowner
 * @returns A formatted string of the next appointment or a message if none exist
 */
export async function getNextAppointment(homeownerId: string): Promise<string> {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured');
    }

    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);

    const now = new Date();

    const [nextAppointment] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.homeownerId, homeownerId),
          eq(appointments.visibility, 'shared_with_homeowner'),
          gte(appointments.startTime, now)
        )
      )
      .orderBy(appointments.startTime)
      .limit(1);

    if (!nextAppointment) {
      return 'You have no upcoming appointments scheduled.';
    }

    const startDate = new Date(nextAppointment.startTime);
    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `Your next appointment is "${nextAppointment.title}" on ${dateStr} at ${timeStr}.`;
  } catch (error) {
    console.error('Error fetching next appointment:', error);
    return 'I was unable to retrieve your appointment information at this time.';
  }
}

