
import { pgTable, text, timestamp, boolean, uuid, pgEnum, json } from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'HOMEOWNER', 'BUILDER']);
export const claimStatusEnum = pgEnum('claim_status', ['SUBMITTED', 'REVIEWING', 'SCHEDULING', 'SCHEDULED', 'COMPLETED']);
export const appointmentVisibilityEnum = pgEnum('appointment_visibility', ['internal_only', 'shared_with_homeowner']);
export const appointmentTypeEnum = pgEnum('appointment_type', ['repair', 'inspection', 'phone_call', 'other']);

// --- 1. Builder Groups (Companies) ---
export const builderGroups = pgTable('builder_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 2. Users (Employees & Builders) ---
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').unique(), // Link to Auth provider
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: userRoleEnum('role').default('ADMIN'),
  password: text('password'),
  
  // Internal role for ADMIN users (Administrator, Employee, etc.)
  internalRole: text('internal_role'), // Stores "Administrator", "Employee", etc.
  
  // For Builder Users
  builderGroupId: uuid('builder_group_id').references(() => builderGroups.id),
  
  // Email Notification Preferences
  emailNotifyClaimSubmitted: boolean('email_notify_claim_submitted').default(true),
  emailNotifyHomeownerAcceptsAppointment: boolean('email_notify_homeowner_accepts_appointment').default(true),
  emailNotifySubAcceptsAppointment: boolean('email_notify_sub_accepts_appointment').default(true),
  emailNotifyHomeownerRescheduleRequest: boolean('email_notify_homeowner_reschedule_request').default(true),
  emailNotifyTaskAssigned: boolean('email_notify_task_assigned').default(true),
  emailNotifyHomeownerEnrollment: boolean('email_notify_homeowner_enrollment').default(true),
  
  // Simplified Notification Preferences (for centralized notification service)
  notifyClaims: boolean('notify_claims').default(true),
  notifyTasks: boolean('notify_tasks').default(true),
  notifyAppointments: boolean('notify_appointments').default(true),
  // Push Notification Preferences
  pushNotifyClaimSubmitted: boolean('push_notify_claim_submitted').default(false),
  pushNotifyHomeownerAcceptsAppointment: boolean('push_notify_homeowner_accepts_appointment').default(false),
  pushNotifySubAcceptsAppointment: boolean('push_notify_sub_accepts_appointment').default(false),
  pushNotifyHomeownerRescheduleRequest: boolean('push_notify_homeowner_reschedule_request').default(false),
  pushNotifyTaskAssigned: boolean('push_notify_task_assigned').default(false),
  pushNotifyHomeownerMessage: boolean('push_notify_homeowner_message').default(false),
  pushNotifyHomeownerEnrollment: boolean('push_notify_homeowner_enrollment').default(false),
  // Note: Users always get email notifications when homeowner sends a message (if on thread)
  
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 3. Homeowners ---
export const homeowners = pgTable('homeowners', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').unique(), 
  
  // Personal Info
  name: text('name').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email').notNull(),
  
  // FIXED: Explicitly added phone column for TS build
  phone: text('phone'), 
  
  password: text('password'),
  
  // Buyer 2
  buyer2Email: text('buyer_2_email'),
  buyer2Phone: text('buyer_2_phone'),
  
  // Property Info
  street: text('street'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  address: text('address').notNull(),
  
  // Builder Info
  builder: text('builder'),
  builderGroupId: uuid('builder_group_id').references(() => builderGroups.id), // Legacy - to be deprecated
  builderUserId: uuid('builder_user_id').references(() => users.id), // New: Direct link to builder user
  jobName: text('job_name'),
  
  // Agent Info
  agentName: text('agent_name'),
  agentPhone: text('agent_phone'),
  agentEmail: text('agent_email'),
  
  // Dates
  closingDate: timestamp('closing_date'),
  preferredWalkThroughDate: timestamp('preferred_walk_through_date'),
  
  enrollmentComments: text('enrollment_comments'),
  
  // PDF Reports App Integration
  reportAppUserId: text('report_app_user_id'), // ID of user in the PDF Reports App
  reportAppLinked: boolean('report_app_linked').default(false), // Whether this homeowner is linked to PDF Reports App
  reportAppLinkedAt: timestamp('report_app_linked_at'), // When the link was created
  
  // SMS Opt-in
  smsOptIn: boolean('sms_opt_in').default(false), // Whether homeowner consents to receive SMS messages
  
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 4. Contractors ---
export const contractors = pgTable('contractors', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: text('company_name').notNull(),
  contactName: text('contact_name'),
  email: text('email'), // Made optional for import
  phone: text('phone'),
  specialty: text('specialty'), // Made optional - can be null during import
  builderUserId: uuid('builder_user_id').references(() => users.id), // Link to builder
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 5. Claims ---
export const claims = pgTable('claims', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // FIXED: Explicitly added homeownerId column for TS build
  homeownerId: uuid('homeowner_id').references(() => homeowners.id), 
  
  // Denormalized fields
  homeownerName: text('homeowner_name'),
  homeownerEmail: text('homeowner_email'),
  builderName: text('builder_name'),
  jobName: text('job_name'),
  address: text('address'),

  title: text('title').notNull(),
  description: text('description').notNull(),
  claimNumber: text('claim_number'), // Sequential claim number per homeowner (1, 2, 3, etc.)
  
  status: claimStatusEnum('status').default('SUBMITTED'),
  classification: text('classification').default('Unclassified'),
  
  // Assignment
  contractorId: uuid('contractor_id').references(() => contractors.id),
  contractorName: text('contractor_name'),
  contractorEmail: text('contractor_email'),

  // Dates
  dateSubmitted: timestamp('date_submitted').defaultNow(),
  dateEvaluated: timestamp('date_evaluated'),
  
  // Admin Data
  internalNotes: text('internal_notes'),
  nonWarrantyExplanation: text('non_warranty_explanation'),
  summary: text('ai_summary'),
  
  // JSON Store
  attachments: json('attachments').$type<any[]>().default([]),
  proposedDates: json('proposed_dates').$type<any[]>().default([]),
});

// --- 6. Documents ---
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  homeownerId: uuid('homeowner_id').references(() => homeowners.id),
  
  name: text('name').notNull(),
  url: text('url').notNull(),
  type: text('type').default('FILE'),
  
  uploadedBy: text('uploaded_by'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});

// --- 7. Tasks ---
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  
  assignedToId: text('assigned_to_id'),
  assignedById: text('assigned_by_id'),
  
  isCompleted: boolean('is_completed').default(false),
  dateAssigned: timestamp('date_assigned').defaultNow(),
  dueDate: timestamp('due_date'),
  
  relatedClaimIds: json('related_claim_ids').$type<string[]>().default([]),
  
  // Google Tasks-style fields (for global task drawer)
  content: text('content'), // If null, use title as content for backward compatibility
  claimId: uuid('claim_id').references(() => claims.id), // Single claim link for task drawer
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 8. Messages ---
export const messageThreads = pgTable('message_threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  subject: text('subject').notNull(),
  homeownerId: uuid('homeowner_id').references(() => homeowners.id),
  participants: json('participants').$type<string[]>().default([]),
  isRead: boolean('is_read').default(false),
  lastMessageAt: timestamp('last_message_at').defaultNow(),
  messages: json('messages').$type<any[]>().default([]),
});

// --- 9. Email Logs (Self-Hosted Email History) ---
export const emailLogs = pgTable('email_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipient: text('recipient').notNull(), // Recipient email address
  subject: text('subject').notNull(), // Email subject
  status: text('status').notNull(), // 'sent' | 'failed'
  error: text('error'), // Error message if status is 'failed' (nullable)
  metadata: json('metadata').$type<any>(), // JSON metadata (claim_id, user_id, etc.) (nullable)
  sendgridMessageId: text('sendgrid_message_id'), // SendGrid message ID for tracking
  openedAt: timestamp('opened_at'), // When the email was first opened (null if not opened)
  createdAt: timestamp('created_at').defaultNow(), // When the email was sent/attempted
});

// --- 10. Calls (AI Intake Service - Vapi) ---
export const calls = pgTable('calls', {
  id: uuid('id').defaultRandom().primaryKey(),
  vapiCallId: text('vapi_call_id').notNull().unique(), // Vapi call ID
  homeownerId: uuid('homeowner_id').references(() => homeowners.id), // Foreign key to homeowners (null if unmatched)
  
  // Call data from Vapi
  homeownerName: text('homeowner_name'), // Name from the call (not from database)
  phoneNumber: text('phone_number'),
  propertyAddress: text('property_address'), // Address from the call (used for matching)
  issueDescription: text('issue_description'),
  isUrgent: boolean('is_urgent').default(false),
  transcript: text('transcript'),
  recordingUrl: text('recording_url'),
  
  // Verification status
  isVerified: boolean('is_verified').default(false), // True if address matched to homeowner
  addressMatchSimilarity: text('address_match_similarity'), // Similarity score for matching
  
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 11. SMS System (Real-Time Two-Way SMS with Pusher) ---
// SMS Threads: One thread per homeowner containing all their SMS conversations
export const smsThreads = pgTable('sms_threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  homeownerId: uuid('homeowner_id').references(() => homeowners.id).notNull(),
  phoneNumber: text('phone_number').notNull(), // Homeowner's phone number for quick lookup
  lastMessageAt: timestamp('last_message_at').defaultNow().notNull(), // For sorting threads by recent activity
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// SMS Messages: Individual messages within a thread
export const smsMessages = pgTable('sms_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id').references(() => smsThreads.id).notNull(),
  direction: text('direction').notNull(), // 'inbound' | 'outbound'
  body: text('body').notNull(), // Message content
  twilioSid: text('twilio_sid'), // Twilio message SID for tracking
  status: text('status').default('sent'), // 'sent' | 'delivered' | 'failed' | 'received'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- 12. Appointments (Calendar System) ---
export const appointments = pgTable('appointments', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  
  // Link to homeowner
  homeownerId: uuid('homeowner_id').references(() => homeowners.id),
  
  // Visibility control
  visibility: appointmentVisibilityEnum('visibility').default('shared_with_homeowner'),
  
  // Type of appointment
  type: appointmentTypeEnum('type').default('other'),
  
  // Created by (admin/staff user)
  createdById: uuid('created_by_id').references(() => users.id),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Appointment Guests: External invitees (email + optional role)
export const appointmentGuests = pgTable('appointment_guests', {
  id: uuid('id').defaultRandom().primaryKey(),
  appointmentId: uuid('appointment_id').references(() => appointments.id).notNull(),
  email: text('email').notNull(),
  role: text('role'), // Optional: 'contractor', 'inspector', 'homeowner', etc.
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 13. Internal Chat System (Team Messaging) ---
// Import and export internal chat tables
export * from './schema/internal-chat';
