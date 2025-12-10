import { Claim, ClaimStatus, UserRole, Homeowner, InternalEmployee, Contractor, Task, ClaimClassification, HomeownerDocument } from './types';

export const CLAIM_CLASSIFICATIONS: ClaimClassification[] = [
  '60 Day',
  '11 Month',
  'Non-Warranty',
  'Hold for 11 Month',
  'Service Complete',
  'Other'
];

export const MOCK_HOMEOWNERS: Homeowner[] = [
  { 
    id: 'h1', 
    name: 'Alice Johnson', 
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice@example.com', 
    address: '123 Maple Drive, Springfield, IL 62704',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
    phone: '(555) 123-4567',
    builder: 'Legacy Homes',
    lotNumber: 'L-42',
    projectOrLlc: 'Maple Ridge LLC',
    closingDate: new Date('2023-05-15'),
    agentName: 'Susan Realtor',
    agentEmail: 'susan@realty.com',
    agentPhone: '(555) 000-1111'
  },
  { 
    id: 'h2', 
    name: 'Bob Smith', 
    firstName: 'Bob',
    lastName: 'Smith',
    email: 'bob@example.com', 
    address: '456 Oak Lane, Springfield, IL 62704',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
    phone: '(555) 987-6543',
    builder: 'Apex Builders',
    lotNumber: 'A-12',
    projectOrLlc: 'Oak Grove Project',
    closingDate: new Date('2023-08-20')
  },
  { 
    id: 'h3', 
    name: 'Charlie Davis', 
    firstName: 'Charlie',
    lastName: 'Davis',
    email: 'charlie@example.com', 
    address: '789 Pine Way, Springfield, IL 62704',
    phone: '(555) 456-7890',
    builder: 'Legacy Homes',
    lotNumber: 'L-45',
    closingDate: new Date('2023-06-01')
  },
  { 
    id: 'h4', 
    name: 'Diana Prince', 
    firstName: 'Diana',
    lastName: 'Prince',
    email: 'diana@example.com', 
    address: '101 Wonder Blvd, Springfield, IL 62704',
    phone: '(555) 222-3333',
    builder: 'Apex Builders',
    lotNumber: 'A-05',
    closingDate: new Date('2023-11-10')
  }
];

export const MOCK_INTERNAL_EMPLOYEES: InternalEmployee[] = [
  { id: 'emp1', name: 'Sarah Connor', role: 'Warranty Manager', email: 'sarah@cascade.com' },
  { id: 'emp2', name: 'John Reese', role: 'Field Specialist', email: 'john@cascade.com' },
  { id: 'emp3', name: 'Harold Finch', role: 'Admin Coordinator', email: 'harold@cascade.com' },
  { id: 'emp4', name: 'Lionel Fusco', role: 'Customer Support', email: 'lionel@cascade.com' },
  { id: 'emp5', name: 'Samantha Groves', role: 'Technical Lead', email: 'root@cascade.com' },
  { id: 'emp6', name: 'Sameen Shaw', role: 'Field Agent', email: 'shaw@cascade.com' }
];

export const MOCK_CONTRACTORS: Contractor[] = [
  { id: 'c1', companyName: 'Rapid Plumbing', contactName: 'Mario', email: 'mario@rapidplumbing.com', specialty: 'Plumbing' },
  { id: 'c2', companyName: 'CoolAir Inc.', contactName: 'Sub-Zero', email: 'service@coolair.com', specialty: 'HVAC' },
  { id: 'c3', companyName: 'Sparky Electric', contactName: 'Electro', email: 'jobs@sparky.com', specialty: 'Electrical' },
  { id: 'c4', companyName: 'Level Floors', contactName: 'Woody', email: 'install@levelfloors.com', specialty: 'Flooring' },
  { id: 'c5', companyName: 'Top Notch Drywall', contactName: 'Kyle', email: 'kyle@topnotch.com', specialty: 'Drywall' }
];

export const MOCK_DOCUMENTS: HomeownerDocument[] = [
  { id: 'd1', homeownerId: 'h1', name: 'Warranty Manual.pdf', uploadedBy: 'System', uploadDate: new Date('2023-05-15'), url: '#', type: 'PDF' },
  { id: 'd2', homeownerId: 'h1', name: 'Signed Orientation Form.pdf', uploadedBy: 'Admin', uploadDate: new Date('2023-05-14'), url: '#', type: 'PDF' },
  { id: 'd3', homeownerId: 'h2', name: 'HVAC Warranty Guide.pdf', uploadedBy: 'System', uploadDate: new Date('2023-08-20'), url: '#', type: 'PDF' }
];

export const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Review Plumbing Quote',
    description: 'Review the quote for the leak at 123 Maple Drive.',
    assignedToId: 'emp1',
    assignedById: 'emp3',
    isCompleted: false,
    dateAssigned: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
    relatedClaimIds: ['CLM-1001']
  },
  {
    id: 't2',
    title: 'Call Bob Smith',
    description: 'Follow up regarding the HVAC scheduling conflict.',
    assignedToId: 'emp2',
    assignedById: 'emp1',
    isCompleted: true,
    dateAssigned: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
    relatedClaimIds: ['CLM-1002']
  }
];

export const MOCK_CLAIMS: Claim[] = [
  {
    id: 'CLM-1001',
    title: 'Leaking Kitchen Sink',
    description: 'The pipe under the main kitchen sink is dripping water continuously. It has caused some swelling in the cabinet base.',
    category: 'Plumbing',
    address: '123 Maple Drive, Springfield',
    homeownerName: 'Alice Johnson',
    homeownerEmail: 'alice@example.com',
    builderName: 'Legacy Homes',
    projectName: 'L-42',
    closingDate: new Date('2023-05-15'),
    status: ClaimStatus.SUBMITTED,
    classification: 'Unclassified',
    dateSubmitted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    proposedDates: [],
    internalNotes: 'Initial review pending. Need to check if this is a install defect or wear and tear.',
    comments: [
      {
        id: 'c1',
        author: 'Alice Johnson',
        role: UserRole.HOMEOWNER,
        text: 'I put a bucket under it for now.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
      }
    ],
    attachments: [
        { id: 'a1', type: 'IMAGE', name: 'sink_leak.jpg', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=200' }
    ]
  },
  {
    id: 'CLM-1002',
    title: 'HVAC Not Cooling',
    description: 'The AC unit is running but not blowing cold air. Thermostat is set to 70 but temp is 78.',
    category: 'HVAC',
    address: '456 Oak Lane, Springfield',
    homeownerName: 'Bob Smith',
    homeownerEmail: 'bob@example.com',
    builderName: 'Apex Builders',
    projectName: 'A-12',
    closingDate: new Date('2023-08-20'),
    contractorName: 'CoolAir Inc.',
    contractorId: 'c2',
    status: ClaimStatus.SCHEDULING,
    classification: '60 Day',
    dateEvaluated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
    dateSubmitted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    proposedDates: [
      { date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1).toISOString(), timeSlot: 'AM', status: 'PROPOSED' },
      { date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(), timeSlot: 'PM', status: 'PROPOSED' }
    ],
    comments: [],
    attachments: []
  },
  {
    id: 'CLM-1003',
    title: 'Cracked Tile in Foyer',
    description: 'One of the large tiles in the entry foyer has a hairline crack running through the center.',
    category: 'Flooring',
    address: '789 Pine Way, Springfield',
    homeownerName: 'Charlie Davis',
    homeownerEmail: 'charlie@example.com',
    builderName: 'Legacy Homes',
    projectName: 'L-45',
    closingDate: new Date('2023-06-01'),
    status: ClaimStatus.COMPLETED,
    classification: '11 Month',
    dateSubmitted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    proposedDates: [
      { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), timeSlot: 'AM', status: 'ACCEPTED' }
    ],
    comments: [],
    attachments: []
  },
  {
    id: 'CLM-1004',
    title: 'Garage Door Stuck',
    description: 'Garage door gets stuck halfway when opening. Need manual force to push it up.',
    category: 'Exterior',
    address: '101 Wonder Blvd, Springfield',
    homeownerName: 'Diana Prince',
    homeownerEmail: 'diana@example.com',
    builderName: 'Apex Builders',
    projectName: 'A-05',
    closingDate: new Date('2023-11-10'),
    status: ClaimStatus.REVIEWING,
    classification: 'Unclassified',
    dateSubmitted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
    proposedDates: [],
    comments: [],
    attachments: []
  }
];

export const CATEGORIES = ['Plumbing', 'Electrical', 'HVAC', 'Flooring', 'Drywall', 'Appliances', 'Exterior', 'Roofing', 'Concrete'];