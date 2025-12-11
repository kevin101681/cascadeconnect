
import { Claim, ClaimStatus, UserRole, Homeowner, InternalEmployee, Contractor, Task, ClaimClassification, HomeownerDocument, MessageThread, BuilderGroup, BuilderUser } from './types';

export const CLAIM_CLASSIFICATIONS: ClaimClassification[] = [
  '60 Day',
  '11 Month',
  'Non-Warranty',
  'Hold for 11 Month',
  'Service Complete',
  'Other'
];

export const MOCK_BUILDER_GROUPS: BuilderGroup[] = [];

export const MOCK_BUILDER_USERS: BuilderUser[] = [];

export const MOCK_HOMEOWNERS: Homeowner[] = [];

export const MOCK_INTERNAL_EMPLOYEES: InternalEmployee[] = [
  { id: 'emp1', name: 'Admin', role: 'System Admin', email: 'admin@cascade.com' }
];

export const MOCK_CONTRACTORS: Contractor[] = [];

export const MOCK_DOCUMENTS: HomeownerDocument[] = [];

export const MOCK_TASKS: Task[] = [];

export const MOCK_THREADS: MessageThread[] = [];

export const MOCK_CLAIMS: Claim[] = [];

export const CATEGORIES = ['Plumbing', 'Electrical', 'HVAC', 'Flooring', 'Drywall', 'Appliances', 'Exterior', 'Roofing', 'Concrete', 'Cabinetry', 'Windows'];
