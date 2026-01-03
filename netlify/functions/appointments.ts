import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { appointments, appointmentGuests } from '../../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { createEvent, EventAttributes } from 'ics';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

// Helper function to generate ICS file
function generateICS(appointment: any, guests: any[]): string {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);

  const event: EventAttributes = {
    start: [start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()],
    end: [end.getFullYear(), end.getMonth() + 1, end.getDate(), end.getHours(), end.getMinutes()],
    title: appointment.title,
    description: appointment.description || '',
    uid: `appt_${appointment.id}@bluetag.com`, // Unique ID for updates
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    organizer: { name: 'Cascade Connect', email: process.env.SENDGRID_FROM_EMAIL || 'noreply@cascadeconnect.com' },
    attendees: guests.map((guest: any) => ({
      name: guest.email.split('@')[0],
      email: guest.email,
      rsvp: true,
      role: 'REQ-PARTICIPANT'
    })),
  };

  const { error, value } = createEvent(event);
  
  if (error) {
    console.error('Error creating ICS:', error);
    throw new Error('Failed to generate calendar invite');
  }
  
  return value || '';
}

// Helper function to send email invites
async function sendInvites(appointment: any, guests: any[], homeowner: any) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid not configured, skipping email invites');
    return;
  }

  const icsContent = generateICS(appointment, guests);
  const icsBase64 = Buffer.from(icsContent).toString('base64');

  const startTime = new Date(appointment.startTime);
  const endTime = new Date(appointment.endTime);
  
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Appointment Scheduled</h2>
      <p><strong>${appointment.title}</strong></p>
      <p>${appointment.description || ''}</p>
      
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Date:</strong> ${startTime.toLocaleDateString()}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}</p>
        ${homeowner ? `<p style="margin: 4px 0;"><strong>Homeowner:</strong> ${homeowner.name}</p>` : ''}
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        The calendar invite is attached to this email. Add it to your calendar to receive reminders.
      </p>
    </div>
  `;

  const emailsToSend = [];

  // Send to guests
  for (const guest of guests) {
    emailsToSend.push({
      to: guest.email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@cascadeconnect.com',
      subject: `Appointment: ${appointment.title}`,
      html: emailBody,
      attachments: [
        {
          content: icsBase64,
          filename: 'invite.ics',
          type: 'text/calendar',
          disposition: 'attachment',
        },
      ],
    });
  }

  // Send to homeowner if visibility is shared_with_homeowner
  if (appointment.visibility === 'shared_with_homeowner' && homeowner?.email) {
    emailsToSend.push({
      to: homeowner.email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@cascadeconnect.com',
      subject: `Appointment Scheduled: ${appointment.title}`,
      html: emailBody,
      attachments: [
        {
          content: icsBase64,
          filename: 'invite.ics',
          type: 'text/calendar',
          disposition: 'attachment',
        },
      ],
    });
  }

  try {
    await sgMail.send(emailsToSend);
    console.log(`Sent ${emailsToSend.length} appointment invites`);
  } catch (error) {
    console.error('Error sending appointment invites:', error);
    throw error;
  }
}

export const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // Initialize DB
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured');
    }

    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);

    const path = event.path.replace('/.netlify/functions/appointments', '');
    const method = event.httpMethod;

    // GET /appointments - List appointments (with optional filters)
    if (method === 'GET' && path === '') {
      const params = event.queryStringParameters || {};
      const homeownerId = params.homeownerId;
      const startDate = params.startDate;
      const endDate = params.endDate;
      const visibility = params.visibility;

      let query = db.select().from(appointments);

      // Apply filters
      const conditions = [];
      if (homeownerId) {
        conditions.push(eq(appointments.homeownerId, homeownerId));
      }
      if (startDate) {
        conditions.push(gte(appointments.startTime, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(appointments.endTime, new Date(endDate)));
      }
      if (visibility) {
        conditions.push(eq(appointments.visibility, visibility as any));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const results = await query;

      // For each appointment, fetch guests
      const appointmentsWithGuests = await Promise.all(
        results.map(async (appt) => {
          const guests = await db.select().from(appointmentGuests).where(eq(appointmentGuests.appointmentId, appt.id));
          return { ...appt, guests };
        })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(appointmentsWithGuests),
      };
    }

    // POST /appointments - Create new appointment
    if (method === 'POST' && path === '') {
      const body = JSON.parse(event.body || '{}');
      const { title, description, startTime, endTime, homeownerId, visibility, type, guests: guestEmails = [], createdById } = body;

      // Validation
      if (!title || !startTime || !endTime) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: title, startTime, endTime' }),
        };
      }

      // Create appointment
      const [newAppointment] = await db
        .insert(appointments)
        .values({
          title,
          description: description || null,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          homeownerId: homeownerId || null,
          visibility: (visibility || 'shared_with_homeowner') as any,
          type: (type || 'other') as any,
          createdById: createdById || null,
        } as any)
        .returning();

      // Create guests
      const guestRecords = [];
      if (guestEmails && guestEmails.length > 0) {
        for (const guestData of guestEmails) {
          const email = typeof guestData === 'string' ? guestData : guestData.email;
          const role = typeof guestData === 'string' ? null : guestData.role;
          
          const [guest] = await db
            .insert(appointmentGuests)
            .values({
              appointmentId: newAppointment.id,
              email,
              role: role || null,
            } as any)
            .returning();
          
          guestRecords.push(guest);
        }
      }

      // Fetch homeowner data if needed
      let homeowner = null;
      if (homeownerId) {
        const homeowners = await sql`SELECT * FROM homeowners WHERE id = ${homeownerId} LIMIT 1`;
        homeowner = homeowners[0] || null;
      }

      // Send email invites
      try {
        await sendInvites(newAppointment, guestRecords, homeowner);
      } catch (emailError) {
        console.error('Failed to send invites, but appointment was created:', emailError);
        // Don't fail the request if email fails
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ ...newAppointment, guests: guestRecords }),
      };
    }

    // PUT /appointments/:id - Update appointment
    if (method === 'PUT' && path.startsWith('/')) {
      const id = path.substring(1);
      const body = JSON.parse(event.body || '{}');
      const { title, description, startTime, endTime, homeownerId, visibility, type } = body;

      const [updated] = await db
        .update(appointments)
        .set({
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(startTime && { startTime: new Date(startTime) }),
          ...(endTime && { endTime: new Date(endTime) }),
          ...(homeownerId !== undefined && { homeownerId }),
          ...(visibility && { visibility }),
          ...(type && { type }),
        })
        .where(eq(appointments.id, id))
        .returning();

      if (!updated) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Appointment not found' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updated),
      };
    }

    // DELETE /appointments/:id - Delete appointment
    if (method === 'DELETE' && path.startsWith('/')) {
      const id = path.substring(1);

      // Delete guests first (foreign key constraint)
      await db.delete(appointmentGuests).where(eq(appointmentGuests.appointmentId, id));

      // Delete appointment
      const [deleted] = await db.delete(appointments).where(eq(appointments.id, id)).returning();

      if (!deleted) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Appointment not found' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error: any) {
    console.error('Appointments API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};

