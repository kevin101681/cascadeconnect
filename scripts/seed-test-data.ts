/**
 * Script to seed mock data for the Test Homeowner
 * 
 * This script populates a test homeowner account with rich mock data:
 * - Tasks (5 items with varied statuses)
 * - Claims/Warranty (4 items: Open, Scheduled, Closed, Draft)
 * - Message Threads (1 thread with 4 messages)
 * - Documents (3 sample PDFs)
 * 
 * Usage:
 *   npx tsx scripts/seed-test-data.ts
 * 
 * Make sure DATABASE_URL or VITE_DATABASE_URL is set in your environment
 */

// Load environment variables from .env.local (or .env as fallback)
import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

// Try .env.local first, then fallback to .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (existsSync(envLocalPath)) {
  console.log('📝 Loading environment from .env.local');
  dotenv.config({ path: envLocalPath });
} else if (existsSync(envPath)) {
  console.log('📝 Loading environment from .env');
  dotenv.config({ path: envPath });
} else {
  console.warn('⚠️  No .env.local or .env file found. Using system environment variables only.');
}

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { 
  homeowners, 
  claims, 
  tasks, 
  messageThreads, 
  documents 
} from '../db/schema';

// Get database URL from environment
const connectionString = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL or VITE_DATABASE_URL environment variable is required');
  console.error('   Set it in your .env.local file or pass it as an environment variable');
  console.error('   Example: DATABASE_URL=your_db_url npx tsx scripts/seed-test-data.ts');
  process.exit(1);
}

// Initialize database connection
const sql = neon(connectionString);
const db = drizzle(sql);

// Target homeowner name
const TEST_HOMEOWNER_NAME = 'Test Homeowner';
const TEST_HOMEOWNER_EMAIL = 'test@cascadebuilderservices.com';

async function seedTestData() {
  console.log('\n🌱 Seeding Test Data for Test Homeowner\n');
  
  try {
    // ========== STEP 1: Find or Create Test Homeowner ==========
    console.log('📋 Step 1: Finding or creating Test Homeowner...');
    
    let testHomeowner = await db
      .select()
      .from(homeowners)
      .where(eq(homeowners.name, TEST_HOMEOWNER_NAME))
      .limit(1);
    
    let homeownerId: string;
    
    if (testHomeowner.length === 0) {
      console.log('   ➕ Test Homeowner not found. Creating...');
      
      const newHomeowner = await db
        .insert(homeowners)
        .values({
          name: TEST_HOMEOWNER_NAME,
          email: TEST_HOMEOWNER_EMAIL,
          phone: '+15551234567',
          address: '123 Test Street, Portland, OR 97201',
          street: '123 Test Street',
          city: 'Portland',
          state: 'OR',
          zip: '97201',
          builder: 'Cascade Test Builders',
          jobName: 'Test Project - Lot 42',
          closingDate: new Date('2024-06-15'),
          smsOptIn: true,
        } as any)
        .returning();
      
      homeownerId = newHomeowner[0].id;
      console.log(`   ✅ Created Test Homeowner with ID: ${homeownerId}`);
    } else {
      homeownerId = testHomeowner[0].id;
      console.log(`   ✅ Found existing Test Homeowner with ID: ${homeownerId}`);
    }
    
    // ========== STEP 2: Seed Tasks ==========
    console.log('\n📋 Step 2: Creating tasks...');
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Clear existing tasks for this homeowner
    await db.delete(tasks).where(eq(tasks.assignedToId, homeownerId));
    
    const taskData = [
      {
        title: 'Schedule 11-month Walkthrough',
        description: 'Contact Cascade to schedule the 11-month warranty inspection before the warranty expires.',
        assignedToId: homeownerId,
        isCompleted: false,
        dueDate: nextWeek,
        content: 'Schedule 11-month Walkthrough',
        contextLabel: 'Warranty Maintenance',
      },
      {
        title: 'Sign Warranty Paperwork',
        description: 'Review and sign the warranty documents sent via email.',
        assignedToId: homeownerId,
        isCompleted: false,
        dueDate: tomorrow,
        content: 'Sign Warranty Paperwork',
        contextLabel: 'Documentation',
      },
      {
        title: 'Review Punch List',
        description: 'Go through the punch list items and verify completion.',
        assignedToId: homeownerId,
        isCompleted: false,
        dueDate: now,
        content: 'Review Punch List',
        contextLabel: 'Blue Tag Items',
      },
      {
        title: 'Submit HVAC Filter Photos',
        description: 'Take photos of the new HVAC filters installed last month.',
        assignedToId: homeownerId,
        isCompleted: true,
        dueDate: lastWeek,
        content: 'Submit HVAC Filter Photos',
        contextLabel: 'Warranty Claim',
      },
      {
        title: 'Confirm Cabinet Hardware Repair',
        description: 'Verify the cabinet handle was replaced correctly.',
        assignedToId: homeownerId,
        isCompleted: true,
        dueDate: yesterday,
        content: 'Confirm Cabinet Hardware Repair',
        contextLabel: 'Completed Claims',
      },
    ];
    
    const createdTasks = await db.insert(tasks).values(taskData as any).returning();
    console.log(`   ✅ Created ${createdTasks.length} tasks`);
    
    // ========== STEP 3: Seed Claims/Warranty ==========
    console.log('\n📋 Step 3: Creating warranty claims...');
    
    // Clear existing claims for this homeowner
    await db.delete(claims).where(eq(claims.homeownerId, homeownerId));
    
    const claimData = [
      {
        homeownerId,
        homeownerName: TEST_HOMEOWNER_NAME,
        homeownerEmail: TEST_HOMEOWNER_EMAIL,
        builderName: 'Cascade Test Builders',
        jobName: 'Test Project - Lot 42',
        address: '123 Test Street, Portland, OR 97201',
        title: 'Kitchen Sink Leak',
        description: 'Water is pooling under the kitchen sink. It appears to be coming from the connection between the faucet and the drain pipe. The leak is constant but slow - about a cup of water per day.',
        claimNumber: '1',
        status: 'SUBMITTED',
        classification: '60 Day',
        dateSubmitted: new Date('2025-01-20'),
        attachments: [
          {
            id: 'att-001',
            url: 'https://placehold.co/600x400/e3f2fd/1976d2?text=Under+Sink+Leak',
            name: 'sink_leak_1.jpg',
            type: 'IMAGE'
          },
          {
            id: 'att-002',
            url: 'https://placehold.co/600x400/e3f2fd/1976d2?text=Water+Pooling',
            name: 'sink_leak_2.jpg',
            type: 'IMAGE'
          }
        ],
        proposedDates: [],
      },
      {
        homeownerId,
        homeownerName: TEST_HOMEOWNER_NAME,
        homeownerEmail: TEST_HOMEOWNER_EMAIL,
        builderName: 'Cascade Test Builders',
        jobName: 'Test Project - Lot 42',
        address: '123 Test Street, Portland, OR 97201',
        title: 'Drywall Cracks in Hallway',
        description: 'There are several hairline cracks appearing in the hallway ceiling near the master bedroom. They seem to be getting slightly longer. Photos attached.',
        claimNumber: '2',
        status: 'SCHEDULED',
        classification: '1 Year',
        contractorName: 'Perfect Drywall Co.',
        contractorEmail: 'repairs@perfectdrywall.com',
        dateSubmitted: new Date('2025-01-15'),
        scheduledAt: new Date('2025-01-30'),
        attachments: [
          {
            id: 'att-003',
            url: 'https://placehold.co/600x400/fff3e0/f57c00?text=Ceiling+Crack+1',
            name: 'hallway_crack_1.jpg',
            type: 'IMAGE'
          },
          {
            id: 'att-004',
            url: 'https://placehold.co/600x400/fff3e0/f57c00?text=Ceiling+Crack+2',
            name: 'hallway_crack_2.jpg',
            type: 'IMAGE'
          },
          {
            id: 'att-005',
            url: 'https://placehold.co/600x400/fff3e0/f57c00?text=Ceiling+Crack+3',
            name: 'hallway_crack_3.jpg',
            type: 'IMAGE'
          }
        ],
        proposedDates: [
          {
            date: new Date('2025-01-30').toISOString(),
            timeSlot: 'AM',
            status: 'ACCEPTED'
          }
        ],
        internalNotes: '01/22/2025 at 10:30 AM by Admin\nSubcontractor confirmed availability for 1/30. Homeowner approved the date.',
      },
      {
        homeownerId,
        homeownerName: TEST_HOMEOWNER_NAME,
        homeownerEmail: TEST_HOMEOWNER_EMAIL,
        builderName: 'Cascade Test Builders',
        jobName: 'Test Project - Lot 42',
        address: '123 Test Street, Portland, OR 97201',
        title: 'Missing Cabinet Handle',
        description: 'One of the kitchen cabinet handles came loose and fell off. Need replacement handle.',
        claimNumber: '3',
        status: 'COMPLETED',
        classification: '60 Day',
        contractorName: 'Cabinet Pro Repairs',
        contractorEmail: 'service@cabinetpro.com',
        dateSubmitted: new Date('2025-01-10'),
        dateEvaluated: new Date('2025-01-11'),
        scheduledAt: new Date('2025-01-18'),
        completedAt: new Date('2025-01-18'),
        attachments: [
          {
            id: 'att-006',
            url: 'https://placehold.co/600x400/e8f5e9/43a047?text=Missing+Handle',
            name: 'cabinet_handle.jpg',
            type: 'IMAGE'
          }
        ],
        proposedDates: [
          {
            date: new Date('2025-01-18').toISOString(),
            timeSlot: 'PM',
            status: 'ACCEPTED'
          }
        ],
        internalNotes: '01/11/2025 at 2:15 PM by Admin\nOrdered replacement handle from supplier.\n\n01/18/2025 at 3:45 PM by Admin\nHandle installed successfully. Homeowner signed off.',
      },
      {
        homeownerId,
        homeownerName: TEST_HOMEOWNER_NAME,
        homeownerEmail: TEST_HOMEOWNER_EMAIL,
        builderName: 'Cascade Test Builders',
        jobName: 'Test Project - Lot 42',
        address: '123 Test Street, Portland, OR 97201',
        title: 'Draft: Garage Door Noise',
        description: 'The garage door makes a loud grinding noise when opening. Might need lubrication or adjustment.',
        claimNumber: '4',
        status: 'OPEN',
        classification: 'Unclassified',
        dateSubmitted: new Date(),
        attachments: [],
        proposedDates: [],
      },
    ];
    
    const createdClaims = await db.insert(claims).values(claimData as any).returning();
    console.log(`   ✅ Created ${createdClaims.length} warranty claims`);
    
    // ========== STEP 4: Seed Message Thread ==========
    console.log('\n📋 Step 4: Creating message thread...');
    
    // Clear existing message threads for this homeowner
    await db.delete(messageThreads).where(eq(messageThreads.homeownerId, homeownerId));
    
    const threadMessages = [
      {
        id: 'msg-001',
        sender: 'admin',
        senderName: 'Admin Team',
        senderEmail: 'admin@cascadebuilderservices.com',
        content: 'Hi! Just checking in on that kitchen sink leak you reported. Have you noticed if it\'s gotten any worse?',
        timestamp: new Date('2025-01-21T09:30:00').toISOString(),
        isRead: true,
      },
      {
        id: 'msg-002',
        sender: 'homeowner',
        senderName: TEST_HOMEOWNER_NAME,
        senderEmail: TEST_HOMEOWNER_EMAIL,
        content: 'Yes, it\'s still leaking a bit. I\'ve been placing a towel under it to catch the water.',
        timestamp: new Date('2025-01-21T14:15:00').toISOString(),
        isRead: true,
      },
      {
        id: 'msg-003',
        sender: 'admin',
        senderName: 'Admin Team',
        senderEmail: 'admin@cascadebuilderservices.com',
        content: 'Thank you for the update. We\'ll send a plumber out tomorrow morning (Tuesday) between 8-10 AM. Does that work for you?',
        timestamp: new Date('2025-01-21T15:45:00').toISOString(),
        isRead: true,
      },
      {
        id: 'msg-004',
        sender: 'homeowner',
        senderName: TEST_HOMEOWNER_NAME,
        senderEmail: TEST_HOMEOWNER_EMAIL,
        content: 'Perfect! I\'ll be home. Thanks for the quick response!',
        timestamp: new Date('2025-01-21T16:00:00').toISOString(),
        isRead: false,
      },
    ];
    
    const messageThread = await db
      .insert(messageThreads)
      .values({
        subject: 'Re: Kitchen Sink Leak - Claim #1',
        homeownerId,
        participants: [homeownerId, 'admin'],
        isRead: false,
        lastMessageAt: new Date('2025-01-21T16:00:00'),
        messages: threadMessages,
      } as any)
      .returning();
    
    console.log(`   ✅ Created 1 message thread with ${threadMessages.length} messages`);
    
    // ========== STEP 5: Seed Documents ==========
    console.log('\n📋 Step 5: Creating documents...');
    
    // Clear existing documents for this homeowner
    await db.delete(documents).where(eq(documents.homeownerId, homeownerId));
    
    const documentData = [
      {
        homeownerId,
        name: 'Home Warranty Guide.pdf',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        type: 'FILE',
        uploadedBy: 'Admin Team',
        uploadedAt: new Date('2024-06-16'),
      },
      {
        homeownerId,
        name: 'Floor Plan.pdf',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        type: 'FILE',
        uploadedBy: 'Cascade Test Builders',
        uploadedAt: new Date('2024-06-15'),
      },
      {
        homeownerId,
        name: 'Signed Contract.pdf',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        type: 'FILE',
        uploadedBy: 'Admin Team',
        uploadedAt: new Date('2024-06-01'),
      },
    ];
    
    const createdDocuments = await db.insert(documents).values(documentData as any).returning();
    console.log(`   ✅ Created ${createdDocuments.length} documents`);
    
    // ========== SUCCESS SUMMARY ==========
    console.log('\n✅ Test Data Seeding Complete!\n');
    console.log('📊 Summary:');
    console.log(`   • Homeowner: ${TEST_HOMEOWNER_NAME} (${homeownerId})`);
    console.log(`   • Tasks: ${createdTasks.length} items`);
    console.log(`   • Claims: ${createdClaims.length} items (1 Open, 1 Scheduled, 1 Completed, 1 Draft)`);
    console.log(`   • Messages: 1 thread with ${threadMessages.length} messages`);
    console.log(`   • Documents: ${createdDocuments.length} PDFs`);
    console.log('\n💡 You can now log in as the Test Homeowner to view this data!');
    console.log(`   Email: ${TEST_HOMEOWNER_EMAIL}`);
    console.log('\n');
    
  } catch (error: any) {
    console.error('\n❌ Error seeding test data:', error.message);
    console.error('   Details:', error);
    process.exit(1);
  }
}

// Run the script
seedTestData();
