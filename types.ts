export enum UserRole {
  HOMEOWNER = 'HOMEOWNER',
  ADMIN = 'ADMIN'
}

export enum ClaimStatus {
  SUBMITTED = 'SUBMITTED',
  REVIEWING = 'REVIEWING',
  SCHEDULING = 'SCHEDULING',
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED'
}

export type ClaimClassification = 
  | '60 Day' 
  | '11 Month' 
  | 'Non-Warranty' 
  | 'Hold for 11 Month' 
  | 'Other' 
  | 'Service Complete'
  | 'Unclassified';

export interface Homeowner {
  id: string;
  name: string; // Combined First + Last for display
  firstName?: string;
  lastName?: string;
  email: string; // Buyer 1 Email
  phone: string; // Buyer 1 Phone
  
  // Buyer 2
  buyer2Email?: string;
  buyer2Phone?: string;

  // Property
  address: string; // Combined or specific street
  city?: string;
  state?: string;
  zip?: string;
  
  builder: string;
  lotNumber: string;
  projectOrLlc?: string;
  
  // Agent
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;

  // Dates
  closingDate: Date;
  preferredWalkThroughDate?: Date;
  
  enrollmentComments?: string;
}

export interface InternalEmployee {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface Contractor {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
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
}

export interface Claim {
  id: string;
  title: string;
  description: string;
  category: string;
  
  // Homeowner / Location Data
  address: string;
  homeownerName: string;
  homeownerEmail: string;
  builderName?: string;
  projectName?: string; // Lot/Unit
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