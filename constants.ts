
import { Claim, ClaimStatus, UserRole, Homeowner, InternalEmployee, Contractor, Task, ClaimClassification, HomeownerDocument, MessageThread, BuilderGroup, BuilderUser } from './types';

// ClaimMessage type (matches MessageSummaryModal)
export interface ClaimMessage {
  id: string;
  claimId: string;
  type: 'HOMEOWNER' | 'SUBCONTRACTOR';
  threadId?: string;
  subject: string;
  recipient: string;
  recipientEmail: string;
  content: string;
  timestamp: Date;
  senderName: string;
}

export const CLAIM_CLASSIFICATIONS: ClaimClassification[] = [
  '60 Day',
  '11 Month',
  'Non-Warranty',
  'Courtesy Repair (Non-Warranty)',
  'Hold for 11 Month',
  'Needs Attention',
  'Service Complete',
  'Other'
];

export const MOCK_BUILDER_GROUPS: BuilderGroup[] = [
  {
    id: 'builder1',
    name: 'Summit Homes',
    email: 'info@summithomes.com',
    address: '123 Builder Lane, Denver, CO 80202',
    primaryContact: 'John Smith'
  },
  {
    id: 'builder2',
    name: 'Mountain View Construction',
    email: 'contact@mountainview.com',
    address: '456 Construction Blvd, Boulder, CO 80301',
    primaryContact: 'Sarah Johnson'
  },
  {
    id: 'builder3',
    name: 'Elite Builders Group',
    email: 'support@elitebuilders.com',
    address: '789 Development Drive, Fort Collins, CO 80525',
    primaryContact: 'Mike Davis'
  }
];

export const MOCK_BUILDER_USERS: BuilderUser[] = [
  {
    id: 'builder_user1',
    name: 'John Smith',
    email: 'john.smith@summithomes.com',
    builderGroupId: 'builder1',
    role: UserRole.BUILDER
  },
  {
    id: 'builder_user2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@mountainview.com',
    builderGroupId: 'builder2',
    role: UserRole.BUILDER
  },
  {
    id: 'builder_user3',
    name: 'Mike Davis',
    email: 'mike.davis@elitebuilders.com',
    builderGroupId: 'builder3',
    role: UserRole.BUILDER
  }
];

export const MOCK_HOMEOWNERS: Homeowner[] = [
  {
    id: 'homeowner1',
    name: 'Robert Martinez',
    firstName: 'Robert',
    lastName: 'Martinez',
    email: 'robert.martinez@email.com',
    phone: '(303) 555-0123',
    buyer2Email: 'lisa.martinez@email.com',
    buyer2Phone: '(303) 555-0124',
    street: '1245 Oak Street',
    city: 'Denver',
    state: 'CO',
    zip: '80210',
    address: '1245 Oak Street, Denver, CO 80210',
    builder: 'Summit Homes',
    builderId: 'builder1',
    jobName: 'Oak Street Development - Lot 42',
    agentName: 'Jennifer Wilson',
    agentEmail: 'jennifer.wilson@realty.com',
    agentPhone: '(303) 555-0200',
    closingDate: new Date('2024-03-15'),
    enrollmentComments: 'First-time homebuyer, very responsive to communications'
  }
];

export const MOCK_INTERNAL_EMPLOYEES: InternalEmployee[] = [
  { id: 'emp1', name: 'Admin', role: 'System Admin', email: 'admin@cascade.com' }
];

export const MOCK_CONTRACTORS: Contractor[] = [
  {
    id: 'contractor1',
    companyName: 'Premier Plumbing Services',
    contactName: 'Tom Anderson',
    email: 'tom@premierplumbing.com',
    specialty: 'Plumbing'
  },
  {
    id: 'contractor2',
    companyName: 'Elite Electrical Solutions',
    contactName: 'Patricia Chen',
    email: 'patricia@eliteelectrical.com',
    specialty: 'Electrical'
  },
  {
    id: 'contractor3',
    companyName: 'Quality HVAC Systems',
    contactName: 'James Wilson',
    email: 'james@qualityhvac.com',
    specialty: 'HVAC'
  }
];

export const MOCK_DOCUMENTS: HomeownerDocument[] = [
  {
    id: 'doc1',
    homeownerId: 'homeowner1',
    name: 'Warranty Enrollment Form.pdf',
    uploadedBy: 'System',
    uploadDate: new Date('2024-03-15'),
    url: '#',
    type: 'PDF'
  },
  {
    id: 'doc2',
    homeownerId: 'homeowner1',
    name: 'Home Inspection Report.pdf',
    uploadedBy: 'Admin',
    uploadDate: new Date('2024-03-20'),
    url: '#',
    type: 'PDF'
  }
];

export const MOCK_TASKS: Task[] = [
  {
    id: 'task1',
    title: 'Follow up on plumbing claim #claim1',
    description: 'Contact homeowner to schedule repair',
    assignedToId: 'emp1',
    assignedById: 'emp1',
    isCompleted: false,
    dateAssigned: new Date('2024-11-15'),
    dueDate: new Date('2024-11-20'),
    relatedClaimIds: ['claim1']
  }
];

export const MOCK_CLAIM_MESSAGES: ClaimMessage[] = [
  // Messages for claim1 (Kitchen Sink Leak)
  {
    id: 'msg1',
    claimId: 'claim1',
    type: 'HOMEOWNER',
    subject: 'Kitchen Sink Leak',
    recipient: 'Robert Martinez',
    recipientEmail: 'robert.martinez@email.com',
    content: 'Thank you for reporting this issue. We\'ve created a claim and will have a plumber contact you soon. I\'ll check on the status and get back to you.',
    timestamp: new Date('2024-11-16T14:15:00'),
    senderName: 'Admin'
  },
  {
    id: 'msg2',
    claimId: 'claim1',
    type: 'HOMEOWNER',
    subject: 'Kitchen Sink Leak',
    recipient: 'Robert Martinez',
    recipientEmail: 'robert.martinez@email.com',
    content: 'Good news! I\'ve scheduled Premier Plumbing Services to come out on December 20th in the morning. They should be able to fix the leak that day. Please let me know if this time works for you.',
    timestamp: new Date('2024-11-17T10:30:00'),
    senderName: 'Admin'
  },
  {
    id: 'msg3',
    claimId: 'claim1',
    type: 'SUBCONTRACTOR',
    subject: 'Service Order: Kitchen Sink Leak - 1245 Oak Street',
    recipient: 'Premier Plumbing Services',
    recipientEmail: 'tom@premierplumbing.com',
    content: 'We have a warranty claim for a kitchen sink leak at 1245 Oak Street. The homeowner reports water pooling on the floor. Please schedule a service call for December 20th, AM time slot. Homeowner contact: Robert Martinez, (303) 555-0123.',
    timestamp: new Date('2024-11-17T11:00:00'),
    senderName: 'Admin'
  },
  // Messages for claim2 (Master Bedroom Window)
  {
    id: 'msg4',
    claimId: 'claim2',
    type: 'HOMEOWNER',
    subject: 'Master Bedroom Window Won\'t Close',
    recipient: 'Robert Martinez',
    recipientEmail: 'robert.martinez@email.com',
    content: 'I understand this is frustrating. We\'re currently reviewing your claim and will assign a contractor shortly. In the meantime, is the window secure enough that it won\'t be a safety issue?',
    timestamp: new Date('2024-11-11T09:45:00'),
    senderName: 'Admin'
  },
  {
    id: 'msg5',
    claimId: 'claim2',
    type: 'HOMEOWNER',
    subject: 'Master Bedroom Window Won\'t Close',
    recipient: 'Robert Martinez',
    recipientEmail: 'robert.martinez@email.com',
    content: 'I\'ve assigned Elite Electrical Solutions to handle your window issue. They will contact you to schedule an appointment. The appointment is tentatively set for December 18th in the afternoon.',
    timestamp: new Date('2024-11-12T14:20:00'),
    senderName: 'Admin'
  },
  {
    id: 'msg6',
    claimId: 'claim2',
    type: 'SUBCONTRACTOR',
    subject: 'Service Order: Master Bedroom Window - 1245 Oak Street',
    recipient: 'Elite Electrical Solutions',
    recipientEmail: 'patricia@eliteelectrical.com',
    content: 'Warranty claim for a stuck window in the master bedroom at 1245 Oak Street. Window won\'t close properly. Please schedule service for December 18th, PM time slot. Homeowner: Robert Martinez, (303) 555-0123.',
    timestamp: new Date('2024-11-12T14:25:00'),
    senderName: 'Admin'
  },
  // Messages for claim3 (Garage Door Opener)
  {
    id: 'msg7',
    claimId: 'claim3',
    type: 'HOMEOWNER',
    subject: 'Garage Door Opener Not Working',
    recipient: 'Robert Martinez',
    recipientEmail: 'robert.martinez@email.com',
    content: 'We\'ve received your claim about the garage door opener. This appears to be an electrical issue. I\'m assigning Elite Electrical Solutions to investigate and repair. They will contact you within 24 hours to schedule.',
    timestamp: new Date('2024-11-21T08:15:00'),
    senderName: 'Admin'
  },
  {
    id: 'msg8',
    claimId: 'claim3',
    type: 'SUBCONTRACTOR',
    subject: 'Service Order: Garage Door Opener - 1245 Oak Street',
    recipient: 'Elite Electrical Solutions',
    recipientEmail: 'patricia@eliteelectrical.com',
    content: 'Warranty claim for non-functioning garage door opener at 1245 Oak Street. Both remote and wall button are not working. Scheduled for December 22nd, All Day. Homeowner: Robert Martinez, (303) 555-0123.',
    timestamp: new Date('2024-11-21T08:30:00'),
    senderName: 'Admin'
  }
];

export const MOCK_THREADS: MessageThread[] = [
  {
    id: 'thread1',
    subject: 'Kitchen Sink Leak',
    homeownerId: 'homeowner1',
    participants: ['Robert Martinez', 'Admin'],
    isRead: false,
    lastMessageAt: new Date('2024-11-18'),
    messages: [
      {
        id: 'msg1',
        senderId: 'homeowner1',
        senderName: 'Robert Martinez',
        senderRole: UserRole.HOMEOWNER,
        content: 'Hello, I noticed a leak under my kitchen sink. It started yesterday.',
        timestamp: new Date('2024-11-15')
      },
      {
        id: 'msg2',
        senderId: 'emp1',
        senderName: 'Admin',
        senderRole: UserRole.ADMIN,
        content: 'Thank you for reporting this. We\'ve created a claim and will have a plumber contact you soon. I\'ll check on the scheduling status and get back to you.',
        timestamp: new Date('2024-11-16')
      },
      {
        id: 'msg3',
        senderId: 'emp1',
        senderName: 'Admin',
        senderRole: UserRole.ADMIN,
        content: 'Good news! I\'ve scheduled Premier Plumbing Services to come out on November 25th in the morning. They should be able to fix the leak that day.',
        timestamp: new Date('2024-11-17')
      },
      {
        id: 'msg4',
        senderId: 'homeowner1',
        senderName: 'Robert Martinez',
        senderRole: UserRole.HOMEOWNER,
        content: 'That works great for me. Thank you for the quick response!',
        timestamp: new Date('2024-11-18')
      }
    ]
  },
  {
    id: 'thread2',
    subject: 'Master Bedroom Window Won\'t Close',
    homeownerId: 'homeowner1',
    participants: ['Robert Martinez', 'Admin'],
    isRead: false,
    lastMessageAt: new Date('2024-11-12'),
    messages: [
      {
        id: 'msg5',
        senderId: 'homeowner1',
        senderName: 'Robert Martinez',
        senderRole: UserRole.HOMEOWNER,
        content: 'The window in my master bedroom is stuck and won\'t close. It\'s been getting worse.',
        timestamp: new Date('2024-11-10')
      },
      {
        id: 'msg6',
        senderId: 'emp1',
        senderName: 'Admin',
        senderRole: UserRole.ADMIN,
        content: 'I understand this is frustrating. We\'re currently reviewing your claim and will assign a contractor shortly. In the meantime, is the window secure enough that it won\'t be a safety issue?',
        timestamp: new Date('2024-11-11')
      },
      {
        id: 'msg7',
        senderId: 'homeowner1',
        senderName: 'Robert Martinez',
        senderRole: UserRole.HOMEOWNER,
        content: 'Yes, it\'s secure, just won\'t close all the way. There\'s a small gap letting in cold air.',
        timestamp: new Date('2024-11-12')
      }
    ]
  },
  {
    id: 'thread3',
    subject: 'Garage Door Opener Not Working',
    homeownerId: 'homeowner1',
    participants: ['Robert Martinez', 'Admin'],
    isRead: false,
    lastMessageAt: new Date('2024-11-21'),
    messages: [
      {
        id: 'msg8',
        senderId: 'homeowner1',
        senderName: 'Robert Martinez',
        senderRole: UserRole.HOMEOWNER,
        content: 'My garage door opener stopped working completely. Neither the remote nor the wall button work.',
        timestamp: new Date('2024-11-20')
      },
      {
        id: 'msg9',
        senderId: 'emp1',
        senderName: 'Admin',
        senderRole: UserRole.ADMIN,
        content: 'I\'ve created a claim for this issue. We\'ll need to have an electrician or garage door specialist take a look. Can you manually open the garage door for now?',
        timestamp: new Date('2024-11-21')
      }
    ]
  }
];

export const MOCK_CLAIMS: Claim[] = [
  // Open Claims
  {
    id: 'claim1',
    title: 'Kitchen Sink Leak',
    description: 'Water leaking from under kitchen sink. Started yesterday afternoon. Water pooling on floor.',
    category: 'Plumbing',
    address: '1245 Oak Street, Denver, CO 80210',
    homeownerName: 'Robert Martinez',
    homeownerEmail: 'robert.martinez@email.com',
    builderName: 'Summit Homes',
    jobName: 'Oak Street Development - Lot 42',
    closingDate: new Date('2024-03-15'),
    status: ClaimStatus.SCHEDULED,
    classification: '11 Month',
    dateSubmitted: new Date('2024-11-15'),
    dateEvaluated: new Date('2024-11-16'),
    contractorId: 'contractor1',
    contractorName: 'Premier Plumbing Services',
    contractorEmail: 'tom@premierplumbing.com',
    proposedDates: [
      {
        date: '2024-12-20',
        timeSlot: 'AM',
        status: 'ACCEPTED'
      },
      {
        date: '2024-11-26',
        timeSlot: 'PM',
        status: 'PROPOSED'
      }
    ],
    comments: [
      {
        id: 'comment1',
        author: 'Admin',
        role: UserRole.ADMIN,
        text: 'Claim evaluated and assigned to Premier Plumbing Services',
        timestamp: new Date('2024-11-16')
      }
    ],
    internalNotes: `Homeowner is responsive and available weekdays

[11/16/2024 at 02:15 PM by Admin] New message thread started with homeowner: "Thank you for reporting this. We've created a claim and will have a plumber contact you soon. I'll check on..."

[11/17/2024 at 10:30 AM by Admin] Message sent to homeowner: "Good news! I've scheduled Premier Plumbing Services to come out on November 25th in the morning. They should be able to fix the leak that day."`,
    attachments: []
  },
  {
    id: 'claim2',
    title: 'Master Bedroom Window Won\'t Close',
    description: 'The window in the master bedroom is stuck and won\'t close properly. It\'s been getting worse over the past week.',
    category: 'Windows',
    address: '1245 Oak Street, Denver, CO 80210',
    homeownerName: 'Robert Martinez',
    homeownerEmail: 'robert.martinez@email.com',
    builderName: 'Summit Homes',
    jobName: 'Oak Street Development - Lot 42',
    closingDate: new Date('2024-03-15'),
    status: ClaimStatus.SCHEDULED,
    classification: 'Unclassified',
    dateSubmitted: new Date('2024-11-10'),
    dateEvaluated: new Date('2024-11-12'),
    contractorId: 'contractor2',
    contractorName: 'Elite Electrical Solutions',
    contractorEmail: 'patricia@eliteelectrical.com',
    proposedDates: [
      {
        date: '2024-12-18',
        timeSlot: 'PM',
        status: 'ACCEPTED'
      }
    ],
    comments: [],
    internalNotes: `[11/11/2024 at 09:45 AM by Admin] New message thread started with homeowner: "I understand this is frustrating. We're currently reviewing your claim and will assign a contractor shortly. In the meantime, is the window secure enough that it won't be a safety issue?"`,
    attachments: []
  },
  {
    id: 'claim3',
    title: 'Garage Door Opener Not Working',
    description: 'The garage door opener stopped working suddenly. The remote doesn\'t respond and the wall button also doesn\'t work.',
    category: 'Other',
    address: '1245 Oak Street, Denver, CO 80210',
    homeownerName: 'Robert Martinez',
    homeownerEmail: 'robert.martinez@email.com',
    builderName: 'Summit Homes',
    jobName: 'Oak Street Development - Lot 42',
    closingDate: new Date('2024-03-15'),
    status: ClaimStatus.SCHEDULED,
    classification: 'Unclassified',
    dateSubmitted: new Date('2024-11-20'),
    dateEvaluated: new Date('2024-11-21'),
    contractorId: 'contractor2',
    contractorName: 'Elite Electrical Solutions',
    contractorEmail: 'patricia@eliteelectrical.com',
    proposedDates: [
      {
        date: '2024-12-22',
        timeSlot: 'All Day',
        status: 'ACCEPTED'
      }
    ],
    comments: [],
    internalNotes: `[11/21/2024 at 11:20 AM by Admin] New message thread started with homeowner: "I've created a claim for this issue. We'll need to have an electrician or garage door specialist take a look. Can you manually open the garage door for now?"`,
    attachments: []
  },
  // Closed/Completed Claims
  {
    id: 'claim4',
    title: 'Bathroom Faucet Dripping',
    description: 'Guest bathroom faucet has been dripping continuously for the past month.',
    category: 'Plumbing',
    address: '1245 Oak Street, Denver, CO 80210',
    homeownerName: 'Robert Martinez',
    homeownerEmail: 'robert.martinez@email.com',
    builderName: 'Summit Homes',
    jobName: 'Oak Street Development - Lot 42',
    closingDate: new Date('2024-03-15'),
    status: ClaimStatus.COMPLETED,
    classification: '60 Day',
    dateSubmitted: new Date('2024-09-05'),
    dateEvaluated: new Date('2024-09-06'),
    contractorId: 'contractor1',
    contractorName: 'Premier Plumbing Services',
    contractorEmail: 'tom@premierplumbing.com',
    proposedDates: [
      {
        date: '2024-09-12',
        timeSlot: 'AM',
        status: 'ACCEPTED'
      }
    ],
    comments: [
      {
        id: 'comment2',
        author: 'Admin',
        role: UserRole.ADMIN,
        text: 'Claim approved and scheduled',
        timestamp: new Date('2024-09-06')
      },
      {
        id: 'comment3',
        author: 'Tom Anderson',
        role: UserRole.ADMIN,
        text: 'Faucet cartridge replaced. Issue resolved.',
        timestamp: new Date('2024-09-12')
      }
    ],
    internalNotes: `Standard warranty repair completed successfully

[09/06/2024 at 08:30 AM by Admin] Service order sent to Premier Plumbing Services: "Service Order: Summit Homes - Oak Street Development - Lot 42 - Bathroom Faucet Dripping"

[09/06/2024 at 09:15 AM by Admin] New message thread started with homeowner: "Thank you for reporting the dripping faucet. We've assigned Premier Plumbing Services to handle this repair."`,
    attachments: []
  },
  {
    id: 'claim5',
    title: 'Electrical Outlet Not Working',
    description: 'Outlet in the living room stopped working. No power to devices plugged in.',
    category: 'Electrical',
    address: '1245 Oak Street, Denver, CO 80210',
    homeownerName: 'Robert Martinez',
    homeownerEmail: 'robert.martinez@email.com',
    builderName: 'Summit Homes',
    jobName: 'Oak Street Development - Lot 42',
    closingDate: new Date('2024-03-15'),
    status: ClaimStatus.COMPLETED,
    classification: '60 Day',
    dateSubmitted: new Date('2024-08-20'),
    dateEvaluated: new Date('2024-08-21'),
    contractorId: 'contractor2',
    contractorName: 'Elite Electrical Solutions',
    contractorEmail: 'patricia@eliteelectrical.com',
    proposedDates: [
      {
        date: '2024-08-28',
        timeSlot: 'PM',
        status: 'ACCEPTED'
      }
    ],
    comments: [
      {
        id: 'comment4',
        author: 'Patricia Chen',
        role: UserRole.ADMIN,
        text: 'Loose wire connection found and repaired. Outlet now functioning properly.',
        timestamp: new Date('2024-08-28')
      }
    ],
    internalNotes: `Quick fix, homeowner satisfied

[08/21/2024 at 10:00 AM by Admin] Service order sent to Elite Electrical Solutions: "Service Order: Summit Homes - Oak Street Development - Lot 42 - Electrical Outlet Not Working"

[08/21/2024 at 02:30 PM by Admin] Message sent to homeowner: "We've scheduled Elite Electrical Solutions to come out on August 28th in the afternoon to fix the outlet issue."`,
    attachments: []
  },
  {
    id: 'claim6',
    title: 'AC Unit Not Cooling',
    description: 'Air conditioning unit in master bedroom not cooling properly. Room stays warm even when AC is on.',
    category: 'HVAC',
    address: '1245 Oak Street, Denver, CO 80210',
    homeownerName: 'Robert Martinez',
    homeownerEmail: 'robert.martinez@email.com',
    builderName: 'Summit Homes',
    jobName: 'Oak Street Development - Lot 42',
    closingDate: new Date('2024-03-15'),
    status: ClaimStatus.COMPLETED,
    classification: '11 Month',
    dateSubmitted: new Date('2024-07-10'),
    dateEvaluated: new Date('2024-07-11'),
    contractorId: 'contractor3',
    contractorName: 'Quality HVAC Systems',
    contractorEmail: 'james@qualityhvac.com',
    proposedDates: [
      {
        date: '2024-07-18',
        timeSlot: 'All Day',
        status: 'ACCEPTED'
      }
    ],
    comments: [
      {
        id: 'comment5',
        author: 'James Wilson',
        role: UserRole.ADMIN,
        text: 'Refrigerant leak detected and repaired. System recharged and tested. Cooling properly now.',
        timestamp: new Date('2024-07-18')
      }
    ],
    internalNotes: `Major repair completed under warranty

[07/11/2024 at 09:00 AM by Admin] Service order sent to Quality HVAC Systems: "Service Order: Summit Homes - Oak Street Development - Lot 42 - AC Unit Not Cooling"

[07/11/2024 at 11:45 AM by Admin] New message thread started with homeowner: "We've identified this as a potential refrigerant issue. Quality HVAC Systems will need to perform a full diagnostic and repair. This may take most of the day."`,
    attachments: []
  },
  {
    id: 'claim7',
    title: 'Cracked Tile in Kitchen',
    description: 'One tile in the kitchen floor has a crack. Noticed it about 2 weeks after move-in.',
    category: 'Flooring',
    address: '1245 Oak Street, Denver, CO 80210',
    homeownerName: 'Robert Martinez',
    homeownerEmail: 'robert.martinez@email.com',
    builderName: 'Summit Homes',
    jobName: 'Oak Street Development - Lot 42',
    closingDate: new Date('2024-03-15'),
    status: ClaimStatus.COMPLETED,
    classification: '60 Day',
    dateSubmitted: new Date('2024-04-01'),
    dateEvaluated: new Date('2024-04-02'),
    proposedDates: [
      {
        date: '2024-04-10',
        timeSlot: 'AM',
        status: 'ACCEPTED'
      }
    ],
    comments: [
      {
        id: 'comment6',
        author: 'Admin',
        role: UserRole.ADMIN,
        text: 'Tile replaced. Homeowner confirmed satisfaction.',
        timestamp: new Date('2024-04-10')
      }
    ],
    internalNotes: 'Minor cosmetic issue resolved quickly',
    attachments: []
  }
];

export const CATEGORIES = ['Plumbing', 'Electrical', 'HVAC', 'Flooring', 'Drywall', 'Appliances', 'Exterior', 'Roofing', 'Concrete', 'Cabinetry', 'Windows'];
