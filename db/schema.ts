
import { pgTable, text, timestamp, boolean, uuid, pgEnum, json } from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'HOMEOWNER', 'BUILDER']);
export const claimStatusEnum = pgEnum('claim_status', ['SUBMITTED', 'REVIEWING', 'SCHEDULING', 'SCHEDULED', 'COMPLETED']);

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
  
  // For Builder Users
  builderGroupId: uuid('builder_group_id').references(() => builderGroups.id),
  
  // Email Notification Preferences
  emailNotifyClaimSubmitted: boolean('email_notify_claim_submitted').default(true),
  emailNotifyHomeownerAcceptsAppointment: boolean('email_notify_homeowner_accepts_appointment').default(true),
  emailNotifySubAcceptsAppointment: boolean('email_notify_sub_accepts_appointment').default(true),
  emailNotifyHomeownerRescheduleRequest: boolean('email_notify_homeowner_reschedule_request').default(true),
  emailNotifyTaskAssigned: boolean('email_notify_task_assigned').default(true),
  emailNotifyHomeownerEnrollment: boolean('email_notify_homeowner_enrollment').default(true),
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
  builderGroupId: uuid('builder_group_id').references(() => builderGroups.id),
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
  
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 4. Contractors ---
export const contractors = pgTable('contractors', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: text('company_name').notNull(),
  contactName: text('contact_name'),
  email: text('email').notNull(),
  phone: text('phone'),
  specialty: text('specialty').notNull(),
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
  category: text('category').default('General'),
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

// --- 9. Email Logs (SendGrid Webhook Events) ---
export const emailLogs = pgTable('email_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  sgMessageId: text('sg_message_id').notNull(), // SendGrid message ID
  email: text('email').notNull(), // Recipient email address
  event: text('event').notNull(), // Event type: processed, delivered, open, click, bounce, etc.
  timestamp: timestamp('timestamp').notNull(), // Event timestamp
  createdAt: timestamp('created_at').defaultNow(), // When we received the webhook
  // Additional event data stored as JSON
  eventData: json('event_data').$type<any>().default({}),
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
