
export enum UserRole {
  HOMEOWNER = 'HOMEOWNER',
  ADMIN = 'ADMIN',
  BUILDER = 'BUILDER'
}

export enum ClaimStatus {
  OPEN = 'OPEN',
  SUBMITTED = 'SUBMITTED',
  REVIEWING = 'REVIEWING',
  SCHEDULING = 'SCHEDULING',
  SCHEDULED = 'SCHEDULED',
  CLOSED = 'CLOSED',
  COMPLETED = 'COMPLETED'
}

export type ClaimClassification = 
  | '60 Day' 
  | '11 Month' 
  | 'Non-Warranty' 
  | 'Courtesy Repair (Non-Warranty)'
  | 'Hold for 11 Month' 
  | 'Needs Attention'
  | 'Other' 
  | 'Service Complete'
  | 'Duplicate'
  | 'Unclassified';

export interface BuilderGroup {
  id: string;
  name: string;
  address?: string;
  primaryContact?: string;
  email?: string;
  enrollmentSlug?: string; // Unique slug for per-builder enrollment URLs
}

export interface BuilderUser {
  id: string;
  name: string;
  email: string;
  builderGroupId: string; // Links user to a specific builder company
  role: UserRole.BUILDER;
  password?: string;
}

export interface Homeowner {
  id: string;
  clerkId?: string; // Clerk user ID if they've created an account
  name: string; // Combined First + Last for display
  firstName?: string;
  lastName?: string;
  email: string; // Buyer 1 Email
  phone: string; // Buyer 1 Phone
  
  // Buyer 2
  buyer2Email?: string;
  buyer2Phone?: string;

  // Property
  street: string; 
  city: string;
  state: string;
  zip: string;
  address: string; // Combined Full Address for display/search
  
  builder: string; // Display Name (legacy text field)
  builderId?: string; // Legacy: Link to BuilderGroup (deprecated, use builderGroupId)
  builderGroupId?: string; // Database field: Link to BuilderGroup (legacy, being phased out)
  builderUserId?: string; // NEW: Direct link to Builder User in users table
  
  jobName: string; // Replaces Lot/Project/LLC
  
  // Agent
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;

  // PDF Reports App Integration
  reportAppUserId?: string; // ID of user in the PDF Reports App
  reportAppLinked?: boolean; // Whether this homeowner is linked to PDF Reports App
  reportAppLinkedAt?: Date; // When the link was created

  // Dates
  closingDate: Date;
  preferredWalkThroughDate?: Date;
  
  enrollmentComments?: string;
  password?: string;
  
  // Subcontractor list from enrollment spreadsheet
  subcontractorList?: any[]; // Parsed spreadsheet data
  
  // Status tracking for invite/onboarding
  inviteEmailRead?: boolean; // From email_logs table
  createdAt?: Date;
}

export interface InternalEmployee {
  id: string;
  name: string;
  role: string;
  email: string;
  password?: string;
  // Email Notification Preferences
  emailNotifyClaimSubmitted?: boolean;
  emailNotifyHomeownerAcceptsAppointment?: boolean;
  emailNotifySubAcceptsAppointment?: boolean;
  emailNotifyHomeownerRescheduleRequest?: boolean;
  emailNotifyTaskAssigned?: boolean;
  emailNotifyHomeownerEnrollment?: boolean;
  // Push Notification Preferences
  pushNotifyClaimSubmitted?: boolean;
  pushNotifyHomeownerAcceptsAppointment?: boolean;
  pushNotifySubAcceptsAppointment?: boolean;
  pushNotifyHomeownerRescheduleRequest?: boolean;
  pushNotifyTaskAssigned?: boolean;
  pushNotifyHomeownerMessage?: boolean;
  pushNotifyHomeownerEnrollment?: boolean;
  pushNotifyNewMessage?: boolean; // Universal Chat (Admin-to-Admin)
}

export interface Contractor {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  specialty: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string; // Used for Notes
  assignedToId: string;
  assignedById: string;
  isCompleted: boolean;
  dateAssigned: Date; // New field
  dueDate: Date;
  relatedClaimIds?: string[];
}

export interface Comment {
  id: string;
  author: string;
  role: UserRole;
  text: string;
  timestamp: Date;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  // Email tracking
  messageType?: 'email' | 'sms' | 'internal'; // Type of message
  isRead?: boolean; // Email read status from SendGrid
  openedAt?: Date; // When email was opened
}

export interface MessageThread {
  id: string;
  subject: string;
  homeownerId: string;
  participants: string[]; // Names
  lastMessageAt: Date;
  isRead: boolean;
  messages: Message[];
}

export interface ProposedDate {
  date: string; // ISO string
  timeSlot: 'AM' | 'PM' | 'All Day';
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED';
}

export interface Attachment {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  url: string; // Base64 or URL
  name: string;
}

export interface HomeownerDocument {
  id: string;
  homeownerId: string;
  name: string;
  uploadedBy: string; // 'Admin' or 'System'
  uploadDate: Date;
  url: string;
  type: string; // 'PDF', 'DOCX', etc.
  thumbnailUrl?: string; // Pre-rendered thumbnail image URL (data URL or URL)
}

export interface Claim {
  id: string;
  claimNumber?: string; // Human-readable claim number (e.g., "CLM-2024-001")
  title: string;
  description: string;
  category: string;
  
  // Homeowner / Location Data
  address: string;
  homeownerName: string;
  homeownerEmail: string;
  builderName?: string;
  jobName?: string; // Replaces projectName/Lot
  closingDate?: Date;

  // Assignment
  contractorId?: string;
  contractorName?: string;
  contractorEmail?: string;

  // Status & Classification
  status: ClaimStatus;
  classification: ClaimClassification;
  dateEvaluated?: Date;
  nonWarrantyExplanation?: string;
  reviewed?: boolean; // Marks if claim has been reviewed/processed
  
  dateSubmitted: Date;
  scheduledAt?: Date; // When appointment was confirmed/scheduled
  completedAt?: Date; // When work was actually finished
  proposedDates: ProposedDate[];
  comments: Comment[];
  internalNotes?: string; // Admin only

  summary?: string; 
  attachments: Attachment[];
}

export interface DashboardStats {
  total: number;
  open: number;
  scheduled: number;
  avgDaysOpen: number;
}

export interface Call {
  id: string;
  vapiCallId: string;
  homeownerId?: string | null;
  homeownerName?: string | null;
  phoneNumber?: string | null;
  propertyAddress?: string | null;
  issueDescription?: string | null;
  isUrgent: boolean;
  transcript?: string | null;
  recordingUrl?: string | null;
  isVerified: boolean;
  addressMatchSimilarity?: number | null;
  createdAt: Date;
  // Joined from homeowners table (when matched)
  verifiedBuilderName?: string | null;
  verifiedClosingDate?: Date | null;
}

export interface SmsMessage {
  id: string;
  homeownerId: string;
  callId?: string | null;
  direction: 'inbound' | 'outbound';
  content: string;
  status: 'sent' | 'delivered' | 'failed';
  createdAt: Date;
}




export interface Task {

  id: string;

  title: string;

  description?: string; // Used for Notes

  assignedToId: string;

  assignedById: string;

  isCompleted: boolean;

  dateAssigned: Date; // New field

  dueDate: Date;

  relatedClaimIds?: string[];

}



export interface Comment {

  id: string;

  author: string;

  role: UserRole;

  text: string;

  timestamp: Date;

}



export interface Message {

  id: string;

  senderId: string;

  senderName: string;

  senderRole: UserRole;

  content: string;

  timestamp: Date;

  attachments?: Attachment[];
  
  // Email tracking
  messageType?: 'email' | 'sms' | 'internal'; // Type of message
  isRead?: boolean; // Email read status from SendGrid
  openedAt?: Date; // When email was opened

}



export interface MessageThread {

  id: string;

  subject: string;

  homeownerId: string;

  participants: string[]; // Names

  lastMessageAt: Date;

  isRead: boolean;

  messages: Message[];

}



export interface ProposedDate {

  date: string; // ISO string

  timeSlot: 'AM' | 'PM' | 'All Day';

  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED';

}



export interface Attachment {

  id: string;

  type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';

  url: string; // Base64 or URL

  name: string;

}



export interface HomeownerDocument {

  id: string;

  homeownerId: string;

  name: string;

  uploadedBy: string; // 'Admin' or 'System'

  uploadDate: Date;

  url: string;

  type: string; // 'PDF', 'DOCX', etc.

  thumbnailUrl?: string; // Pre-rendered thumbnail image URL (data URL or URL)
}



export interface Claim {

  id: string;

  claimNumber?: string; // Human-readable claim number (e.g., "CLM-2024-001")

  title: string;

  description: string;

  category: string;

  

  // Homeowner / Location Data

  address: string;

  homeownerName: string;

  homeownerEmail: string;

  builderName?: string;

  jobName?: string; // Replaces projectName/Lot

  closingDate?: Date;



  // Assignment

  contractorId?: string;

  contractorName?: string;

  contractorEmail?: string;



  // Status & Classification

  status: ClaimStatus;

  classification: ClaimClassification;

  dateEvaluated?: Date;

  nonWarrantyExplanation?: string;

  

  dateSubmitted: Date;

  scheduledAt?: Date; // When appointment was confirmed/scheduled

  completedAt?: Date; // When work was actually finished

  proposedDates: ProposedDate[];

  comments: Comment[];

  internalNotes?: string; // Admin only



  summary?: string; 

  attachments: Attachment[];

}



export interface DashboardStats {

  total: number;

  open: number;

  scheduled: number;

  avgDaysOpen: number;

}


