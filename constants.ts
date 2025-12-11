
import { Claim, ClaimStatus, UserRole, Homeowner, InternalEmployee, Contractor, Task, ClaimClassification, HomeownerDocument, MessageThread, BuilderGroup, BuilderUser } from './types';

export const CLAIM_CLASSIFICATIONS: ClaimClassification[] = [
  '60 Day',
  '11 Month',
  'Non-Warranty',
  'Hold for 11 Month',
  'Service Complete',
  'Other'
];

export const MOCK_BUILDER_GROUPS: BuilderGroup[] = [
  { id: 'bg1', name: 'Legacy Homes', email: 'contact@legacyhomes.com' },
  { id: 'bg2', name: 'Apex Builders', email: 'info@apexbuilders.com' }
];

export const MOCK_BUILDER_USERS: BuilderUser[] = [
  { id: 'bu1', name: 'Bill Builder', email: 'bill@legacyhomes.com', builderGroupId: 'bg1', role: UserRole.BUILDER },
  { id: 'bu2', name: 'Alice Apex', email: 'alice@apexbuilders.com', builderGroupId: 'bg2', role: UserRole.BUILDER }
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
    builderId: 'bg1',
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
    builderId: 'bg2',
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
    builderId: 'bg1',
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
    builderId: 'bg2',
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
  { id: 'c5', companyName: 'Top Notch Drywall', contactName: 'Kyle', email: 'kyle@topnotch.com', specialty: 'Drywall' },
  { id: 'c6', companyName: 'Clear View Windows', contactName: 'Glass Joe', email: 'joe@clearview.com', specialty: 'Windows' },
  { id: 'c7', companyName: 'Elite Roofing', contactName: 'Rufus', email: 'rufus@eliteroofing.com', specialty: 'Roofing' },
  { id: 'c8', companyName: 'Prime Cabinetry', contactName: 'Cab', email: 'support@primecab.com', specialty: 'Cabinetry' }
];

export const MOCK_DOCUMENTS: HomeownerDocument[] = [
  { id: 'd1', homeownerId: 'h1', name: 'Warranty Manual.pdf', uploadedBy: 'System', uploadDate: new Date('2023-05-15'), url: '#', type: 'PDF' },
  { id: 'd2', homeownerId: 'h1', name: 'Signed Orientation Form.pdf', uploadedBy: 'Admin', uploadDate: new Date('2023-05-14'), url: '#', type: 'PDF' },
  { id: 'd3', homeownerId: 'h2', name: 'HVAC Warranty Guide.pdf', uploadedBy: 'System', uploadDate: new Date('2023-08-20'), url: '#', type: 'PDF' },
  { id: 'd4', homeownerId: 'h3', name: 'Floor Care Instructions.pdf', uploadedBy: 'System', uploadDate: new Date('2023-06-01'), url: '#', type: 'PDF' },
  { id: 'd5', homeownerId: 'h4', name: 'Garage Door Manual.pdf', uploadedBy: 'System', uploadDate: new Date('2023-11-10'), url: '#', type: 'PDF' }
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
  },
  {
    id: 't3',
    title: 'Schedule Drywall Repair',
    description: 'Coordinate with Top Notch Drywall for the nail pops at 456 Oak Lane.',
    assignedToId: 'emp1', // Assigned to Sarah (Admin default in tests)
    assignedById: 'emp2',
    isCompleted: false,
    dateAssigned: new Date(),
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    relatedClaimIds: ['CLM-1007']
  }
];

export const MOCK_THREADS: MessageThread[] = [
  {
    id: 'th1',
    subject: 'Question about 60-day review',
    homeownerId: 'h1',
    participants: ['Alice Johnson', 'Sarah Connor'],
    isRead: true,
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    messages: [
      {
        id: 'm1',
        senderId: 'h1',
        senderName: 'Alice Johnson',
        senderRole: UserRole.HOMEOWNER,
        content: 'Hi, I was wondering when I can schedule my 60-day review?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
      },
      {
        id: 'm2',
        senderId: 'emp1',
        senderName: 'Sarah Connor',
        senderRole: UserRole.ADMIN,
        content: 'Hello Alice, you can submit your request anytime after July 15th. You will see a notification in your portal.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
      }
    ]
  },
  {
    id: 'th2',
    subject: 'Emergency Contact Info',
    homeownerId: 'h1',
    participants: ['Alice Johnson', 'Lionel Fusco'],
    isRead: false,
    lastMessageAt: new Date(),
    messages: [
      {
        id: 'm3',
        senderId: 'h1',
        senderName: 'Alice Johnson',
        senderRole: UserRole.HOMEOWNER,
        content: 'Do you have the number for the emergency plumber? Water is leaking fast!',
        timestamp: new Date()
      }
    ]
  },
  {
    id: 'th3',
    subject: 'Access Code for Contractor',
    homeownerId: 'h2',
    participants: ['Bob Smith', 'John Reese'],
    isRead: true,
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    messages: [
      {
        id: 'm4',
        senderId: 'emp2',
        senderName: 'John Reese',
        senderRole: UserRole.ADMIN,
        content: 'Hi Bob, can you confirm the gate code for the HVAC tech tomorrow?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6)
      },
      {
        id: 'm5',
        senderId: 'h2',
        senderName: 'Bob Smith',
        senderRole: UserRole.HOMEOWNER,
        content: 'Sure, it is #1234.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5)
      }
    ]
  }
];

export const MOCK_CLAIMS: Claim[] = [
  // --- Alice Johnson (h1) ---
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
    dateSubmitted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
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
    id: 'CLM-1005',
    title: 'Cabinet Door Misaligned',
    description: 'The upper left cabinet door in the kitchen scrapes against the adjacent door when opening.',
    category: 'Cabinetry',
    address: '123 Maple Drive, Springfield',
    homeownerName: 'Alice Johnson',
    homeownerEmail: 'alice@example.com',
    builderName: 'Legacy Homes',
    projectName: 'L-42',
    closingDate: new Date('2023-05-15'),
    contractorName: 'Prime Cabinetry',
    contractorId: 'c8',
    status: ClaimStatus.COMPLETED,
    classification: '60 Day',
    dateSubmitted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45),
    dateEvaluated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40),
    proposedDates: [],
    comments: [],
    attachments: []
  },
  {
    id: 'CLM-1006',
    title: 'Drafty Master Window',
    description: 'Can feel cold air coming through the bottom seal of the master bedroom window during windy days.',
    category: 'Windows',
    address: '123 Maple Drive, Springfield',
    homeownerName: 'Alice Johnson',
    homeownerEmail: 'alice@example.com',
    builderName: 'Legacy Homes',
    projectName: 'L-42',
    closingDate: new Date('2023-05-15'),
    status: ClaimStatus.REVIEWING,
    classification: '11 Month',
    dateSubmitted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    proposedDates: [],
    comments: [],
    attachments: []
  },

  // --- Bob Smith (h2) ---
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
    id: 'CLM-1007',
    title: 'Nail Pops in Living Room',
    description: 'Several nail pops have appeared in the ceiling of the living room.',
    category: 'Drywall',
    address: '456 Oak Lane, Springfield',
    homeownerName: 'Bob Smith',
    homeownerEmail: 'bob@example.com',
    builderName: 'Apex Builders',
    projectName: 'A-12',
    closingDate: new Date('2023-08-20'),
    status: ClaimStatus.SUBMITTED,
    classification: '11 Month',
    dateSubmitted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
    proposedDates: [],
    comments: [],
    attachments: []
  },
  {
    id: 'CLM-1008',
    title: 'Grout Cracking in Shower',
    description: 'The grout line in the master shower corner is cracking and separating.',
    category: 'Flooring', // Often Tile falls under flooring or specialty
    address: '456 Oak Lane, Springfield',
    homeownerName: 'Bob Smith',
    homeownerEmail: 'bob@example.com',
    builderName: 'Apex Builders',
    projectName: 'A-12',
    closingDate: new Date('2023-08-20'),
    status: ClaimStatus.REVIEWING,
    classification: '11 Month',
    dateSubmitted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    proposedDates: [],
    comments: [],
    attachments: []
  },

  // --- Charlie Davis (h3) ---
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
    contractorName: 'Level Floors',
    contractorId: 'c4',
    dateSubmitted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    proposedDates: [
      { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), timeSlot: 'AM', status: 'ACCEPTED' }
    ],
    comments: [],
    attachments: []
  },
  {
    id: 'CLM-1009',
    title: 'Outlet Not Working',
    description: 'The GFCI outlet in the guest bathroom will not reset and has no power.',
    category: 'Electrical',
    address: '789 Pine Way, Springfield',
    homeownerName: 'Charlie Davis',
    homeownerEmail: 'charlie@example.com',
    builderName: 'Legacy Homes',
    projectName: 'L-45',
    closingDate: new Date('2023-06-01'),
    status: ClaimStatus.SUBMITTED,
    classification: 'Unclassified',
    dateSubmitted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    proposedDates: [],
    comments: [],
    attachments: []
  },
  {
    id: 'CLM-1010',
    title: 'Roof Shingle Loose',
    description: 'A shingle appears to be flapping in the wind on the front elevation above the garage.',
    category: 'Roofing',
    address: '789 Pine Way, Springfield',
    homeownerName: 'Charlie Davis',
    homeownerEmail: 'charlie@example.com',
    builderName: 'Legacy Homes',
    projectName: 'L-45',
    closingDate: new Date('2023-06-01'),
    contractorName: 'Elite Roofing',
    contractorId: 'c7',
    status: ClaimStatus.SCHEDULING,
    classification: 'Other',
    dateSubmitted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    proposedDates: [],
    comments: [],
    attachments: []
  },

  // --- Diana Prince (h4) ---
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
  },
  {
    id: 'CLM-1011',
    title: 'Water Heater Noise',
    description: 'Water heater is making a loud popping noise when heating up.',
    category: 'Plumbing',
    address: '101 Wonder Blvd, Springfield',
    homeownerName: 'Diana Prince',
    homeownerEmail: 'diana@example.com',
    builderName: 'Apex Builders',
    projectName: 'A-05',
    closingDate: new Date('2023-11-10'),
    contractorName: 'Rapid Plumbing',
    contractorId: 'c1',
    status: ClaimStatus.SCHEDULED,
    classification: '60 Day',
    dateSubmitted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    proposedDates: [
      { date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(), timeSlot: 'AM', status: 'ACCEPTED' }
    ],
    comments: [],
    attachments: []
  },
  {
    id: 'CLM-1012',
    title: 'Deck Paint Peeling',
    description: 'The stain on the back deck railing is peeling off in large strips.',
    category: 'Exterior',
    address: '101 Wonder Blvd, Springfield',
    homeownerName: 'Diana Prince',
    homeownerEmail: 'diana@example.com',
    builderName: 'Apex Builders',
    projectName: 'A-05',
    closingDate: new Date('2023-11-10'),
    status: ClaimStatus.COMPLETED,
    classification: 'Non-Warranty',
    nonWarrantyExplanation: 'Homeowner applied third-party chemical cleaner that stripped the seal. Not a workmanship defect.',
    dateEvaluated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    dateSubmitted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
    proposedDates: [],
    comments: [],
    attachments: []
  }
];

export const CATEGORIES = ['Plumbing', 'Electrical', 'HVAC', 'Flooring', 'Drywall', 'Appliances', 'Exterior', 'Roofing', 'Concrete', 'Cabinetry', 'Windows'];
