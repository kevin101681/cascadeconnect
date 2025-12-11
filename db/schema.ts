import { pgTable, text, timestamp, boolean, uuid, date, pgEnum, integer } from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'HOMEOWNER', 'BUILDER']);
export const claimStatusEnum = pgEnum('claim_status', ['SUBMITTED', 'REVIEWING', 'SCHEDULING', 'SCHEDULED', 'COMPLETED']);
export const messageTypeEnum = pgEnum('attachment_type', ['IMAGE', 'VIDEO', 'DOCUMENT']);

// --- 1. Builder Groups (Companies) ---
export const builderGroups = pgTable('builder_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 2. Users (Employees & Builders) ---
// Note: Homeowners are stored separately or linked via Clerk ID
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').unique(), // Link to Auth provider
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: userRoleEnum('role').default('ADMIN'),
  
  // For Builder Users
  builderGroupId: uuid('builder_group_id').references(() => builderGroups.id),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 3. Homeowners ---
export const homeowners = pgTable('homeowners', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').unique(), // Can be null if not yet registered
  
  // Personal Info
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  
  // Buyer 2
  buyer2Email: text('buyer_2_email'),
  buyer2Phone: text('buyer_2_phone'),
  
  // Property Info
  address: text('address').notNull(),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  lotNumber: text('lot_number'),
  projectOrLlc: text('project_llc'),
  
  // Builder Link
  builderGroupId: uuid('builder_group_id').references(() => builderGroups.id),
  
  // Dates
  closingDate: date('closing_date'),
  preferredWalkThroughDate: date('preferred_walk_through_date'),
  
  enrollmentComments: text('enrollment_comments'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 4. Contractors ---
export const contractors = pgTable('contractors', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: text('company_name').notNull(),
  contactName: text('contact_name'),
  email: text('email').notNull(),
  specialty: text('specialty').notNull(), // e.g., Plumbing, HVAC
  createdAt: timestamp('created_at').defaultNow(),
});

// --- 5. Claims ---
export const claims = pgTable('claims', {
  id: uuid('id').defaultRandom().primaryKey(),
  readableId: text('readable_id'), // e.g. CLM-1001
  
  homeownerId: uuid('homeowner_id').references(() => homeowners.id).notNull(),
  
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').default('General'),
  
  status: claimStatusEnum('status').default('SUBMITTED'),
  classification: text('classification').default('Unclassified'), // 60 Day, 11 Month, etc.
  
  // Dates
  dateSubmitted: timestamp('date_submitted').defaultNow(),
  dateEvaluated: timestamp('date_evaluated'),
  
  // Assignment
  contractorId: uuid('contractor_id').references(() => contractors.id),
  
  // Admin Data
  internalNotes: text('internal_notes'),
  nonWarrantyExplanation: text('non_warranty_explanation'),
  summary: text('ai_summary'), // For Service Orders
});

// --- 6. Proposed Dates (for Scheduling) ---
export const proposedDates = pgTable('proposed_dates', {
  id: uuid('id').defaultRandom().primaryKey(),
  claimId: uuid('claim_id').references(() => claims.id).notNull(),
  date: timestamp('date').notNull(),
  timeSlot: text('time_slot').notNull(), // AM, PM, All Day
  status: text('status').default('PROPOSED'), // PROPOSED, ACCEPTED
});

// --- 7. Tasks (Internal) ---
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  
  assignedToId: uuid('assigned_to_id').references(() => users.id),
  assignedById: uuid('assigned_by_id').references(() => users.id),
  
  isCompleted: boolean('is_completed').default(false),
  dateAssigned: timestamp('date_assigned').defaultNow(),
  dueDate: timestamp('due_date'),
});

// --- 8. Task Claims (Many-to-Many Link) ---
export const taskClaims = pgTable('task_claims', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => tasks.id).notNull(),
  claimId: uuid('claim_id').references(() => claims.id).notNull(),
});

// --- 9. Documents ---
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  homeownerId: uuid('homeowner_id').references(() => homeowners.id), // Can be null if general doc
  claimId: uuid('claim_id').references(() => claims.id), // Can be null if account doc
  
  name: text('name').notNull(),
  url: text('url').notNull(), // UploadThing URL
  type: text('type').default('FILE'),
  
  uploadedBy: text('uploaded_by'), // Name string or ID
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});

// --- 10. Messages ---
export const messageThreads = pgTable('message_threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  subject: text('subject').notNull(),
  homeownerId: uuid('homeowner_id').references(() => homeowners.id),
  isRead: boolean('is_read').default(false),
  lastMessageAt: timestamp('last_message_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id').references(() => messageThreads.id).notNull(),
  
  senderId: text('sender_id').notNull(), // User ID or Homeowner ID
  senderRole: userRoleEnum('sender_role').notNull(),
  senderName: text('sender_name').notNull(),
  
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});