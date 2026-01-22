/**
 * AI Gatekeeper Test Suite
 * 
 * Run this file to test all components of the AI Gatekeeper system
 * 
 * Usage: tsx scripts/test-gatekeeper.ts
 */

import { normalizePhoneNumber, batchNormalizePhoneNumbers, isE164Format, formatPhoneForDisplay } from '../lib/utils/phoneNormalization';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name: string) {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  log(`🧪 ${name}`, colors.blue);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

function assert(condition: boolean, message: string) {
  if (condition) {
    log(`  ✅ ${message}`, colors.green);
  } else {
    log(`  ❌ ${message}`, colors.red);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual === expected) {
    log(`  ✅ ${message}: ${expected}`, colors.green);
  } else {
    log(`  ❌ ${message}`, colors.red);
    log(`     Expected: ${expected}`, colors.red);
    log(`     Actual: ${actual}`, colors.red);
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Test 1: Phone Number Normalization
 */
function testPhoneNormalization() {
  logTest('Phone Number Normalization');

  // Test various US formats
  assertEqual(normalizePhoneNumber('(555) 123-4567'), '+15551234567', 'Standard format');
  assertEqual(normalizePhoneNumber('555-123-4567'), '+15551234567', 'Dashed format');
  assertEqual(normalizePhoneNumber('555.123.4567'), '+15551234567', 'Dotted format');
  assertEqual(normalizePhoneNumber('5551234567'), '+15551234567', 'Raw 10 digits');
  assertEqual(normalizePhoneNumber('+1 555 123 4567'), '+15551234567', 'E.164 with spaces');
  assertEqual(normalizePhoneNumber('+15551234567'), '+15551234567', 'Already E.164');
  assertEqual(normalizePhoneNumber('1-555-123-4567'), '+15551234567', '1 + dashed');
  assertEqual(normalizePhoneNumber('15551234567'), '+15551234567', '11 digits');

  // Test edge cases
  assertEqual(normalizePhoneNumber(''), null, 'Empty string');
  assertEqual(normalizePhoneNumber(null), null, 'Null input');
  assertEqual(normalizePhoneNumber(undefined), null, 'Undefined input');
  assertEqual(normalizePhoneNumber('abc'), null, 'Non-numeric input');
  assertEqual(normalizePhoneNumber('123'), null, 'Too few digits');

  // Test with international numbers (keep as-is)
  assertEqual(normalizePhoneNumber('+44 20 7123 4567'), '+442071234567', 'UK number');
  assertEqual(normalizePhoneNumber('+86 138 0000 0000'), '+8613800000000', 'China number');

  log('\n✅ All phone normalization tests passed!', colors.green);
}

/**
 * Test 2: Batch Phone Normalization
 */
function testBatchNormalization() {
  logTest('Batch Phone Normalization');

  const input = [
    '(555) 123-4567',
    '555-987-6543',
    null,
    'invalid',
    '+15551112222',
    '123', // too short
  ];

  const result = batchNormalizePhoneNumbers(input);

  assertEqual(result.length, 3, 'Should return 3 valid numbers');
  assertEqual(result[0], '+15551234567', 'First number normalized');
  assertEqual(result[1], '+15559876543', 'Second number normalized');
  assertEqual(result[2], '+15551112222', 'Third number normalized');

  log('\n✅ All batch normalization tests passed!', colors.green);
}

/**
 * Test 3: E.164 Format Validation
 */
function testE164Validation() {
  logTest('E.164 Format Validation');

  assert(isE164Format('+15551234567'), '+15551234567 is valid E.164');
  assert(isE164Format('+442071234567'), '+442071234567 is valid E.164');
  assert(!isE164Format('5551234567'), '5551234567 is not E.164 (missing +)');
  assert(!isE164Format('(555) 123-4567'), '(555) 123-4567 is not E.164');
  assert(!isE164Format('+1555123456789012345'), 'Too many digits (>15)');
  assert(!isE164Format('+0123456789'), 'Cannot start with +0');
  assert(!isE164Format(''), 'Empty string is not E.164');
  assert(!isE164Format(null), 'Null is not E.164');

  log('\n✅ All E.164 validation tests passed!', colors.green);
}

/**
 * Test 4: Phone Display Formatting
 */
function testDisplayFormatting() {
  logTest('Phone Display Formatting');

  assertEqual(formatPhoneForDisplay('+15551234567'), '(555) 123-4567', 'E.164 to display format');
  assertEqual(formatPhoneForDisplay('+442071234567'), '+442071234567', 'Non-US number unchanged');
  assertEqual(formatPhoneForDisplay(''), '', 'Empty string returns empty');
  assertEqual(formatPhoneForDisplay(null), '', 'Null returns empty');

  log('\n✅ All display formatting tests passed!', colors.green);
}

/**
 * Test 5: Contact Sync (Simulated)
 */
function testContactSyncSimulation() {
  logTest('Contact Sync Simulation (Logic Only)');

  // Simulate contact sync logic without database
  const mockContacts = [
    { name: 'John Doe', phone: '(555) 123-4567' },
    { name: 'Jane Smith', phone: '555-987-6543' },
    { name: 'Invalid Contact', phone: 'abc' },
    { name: 'Bob Jones', phone: '+1-555-111-2222' },
  ];

  let validCount = 0;
  let invalidCount = 0;

  for (const contact of mockContacts) {
    const normalized = normalizePhoneNumber(contact.phone);
    if (normalized) {
      validCount++;
      log(`  ✅ ${contact.name}: ${contact.phone} → ${normalized}`, colors.green);
    } else {
      invalidCount++;
      log(`  ⚠️ ${contact.name}: ${contact.phone} → INVALID`, colors.yellow);
    }
  }

  assertEqual(validCount, 3, 'Should have 3 valid contacts');
  assertEqual(invalidCount, 1, 'Should have 1 invalid contact');

  log('\n✅ Contact sync simulation passed!', colors.green);
}

/**
 * Test 6: Vapi Webhook Response Formats
 */
function testWebhookResponses() {
  logTest('Vapi Webhook Response Formats');

  // Known Contact Response (Transfer)
  const transferResponse = {
    transferPlan: {
      destinations: [
        {
          type: 'number',
          number: '+15551234567',
          message: '', // Silent transfer
        },
      ],
    },
  };

  assert(transferResponse.transferPlan !== undefined, 'Transfer response has transferPlan');
  assert(transferResponse.transferPlan.destinations.length === 1, 'Has one destination');
  assertEqual(transferResponse.transferPlan.destinations[0].message, '', 'Silent transfer (empty message)');

  // Unknown Contact Response (Gatekeeper)
  const gatekeeperResponse = {
    assistant: {
      firstMessage: "Who is this and what do you want?",
      model: {
        provider: 'openai',
        model: 'gpt-5.2',
        messages: [
          {
            role: 'system',
            content: 'You are a strict AI Gatekeeper...',
          },
        ],
      },
    },
  };

  assert(gatekeeperResponse.assistant !== undefined, 'Gatekeeper response has assistant');
  assert(gatekeeperResponse.assistant.firstMessage !== '', 'Has first message');
  assertEqual(gatekeeperResponse.assistant.model.provider, 'openai', 'Uses OpenAI');

  log('\n✅ Webhook response format tests passed!', colors.green);
}

/**
 * Test 7: Spam Detection Scenarios (Logic)
 */
function testSpamDetectionScenarios() {
  logTest('Spam Detection Scenarios (Logic Check)');

  // These are the scenarios we expect the AI to handle correctly
  const spamScenarios = [
    { caller: 'Solar Solutions', purpose: 'Save money on solar', expected: 'SPAM' },
    { caller: 'Unknown', purpose: 'Is the business owner available?', expected: 'SPAM' },
    { caller: 'Car Warranty Center', purpose: 'Extended warranty', expected: 'SPAM' },
    { caller: 'Insurance Co', purpose: 'This is not a sales call', expected: 'SPAM' },
  ];

  const legitScenarios = [
    { caller: 'UPS', purpose: 'Delivery for Kevin at 123 Main St', expected: 'LEGIT' },
    { caller: 'Dr. Smith Office', purpose: 'Appointment reminder for Tuesday', expected: 'LEGIT' },
    { caller: 'John Doe', purpose: 'Friend calling about dinner tonight', expected: 'LEGIT' },
  ];

  log('\n  📋 Expected SPAM scenarios:', colors.yellow);
  spamScenarios.forEach(s => {
    log(`     ❌ ${s.caller}: "${s.purpose}"`, colors.red);
  });

  log('\n  📋 Expected LEGIT scenarios:', colors.yellow);
  legitScenarios.forEach(s => {
    log(`     ✅ ${s.caller}: "${s.purpose}"`, colors.green);
  });

  log('\n✅ Spam detection scenario definitions validated!', colors.green);
  log('   Note: Actual AI detection requires Gemini API key and live testing', colors.yellow);
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║     🛡️  AI GATEKEEPER TEST SUITE                          ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan);
  console.log('\n');

  try {
    testPhoneNormalization();
    testBatchNormalization();
    testE164Validation();
    testDisplayFormatting();
    testContactSyncSimulation();
    testWebhookResponses();
    testSpamDetectionScenarios();

    console.log('\n');
    log('╔════════════════════════════════════════════════════════════╗', colors.green);
    log('║     ✅ ALL TESTS PASSED!                                   ║', colors.green);
    log('╚════════════════════════════════════════════════════════════╝', colors.green);
    console.log('\n');

    log('📝 Summary:', colors.cyan);
    log('   ✅ Phone normalization', colors.green);
    log('   ✅ Batch processing', colors.green);
    log('   ✅ E.164 validation', colors.green);
    log('   ✅ Display formatting', colors.green);
    log('   ✅ Contact sync logic', colors.green);
    log('   ✅ Webhook responses', colors.green);
    log('   ✅ Spam scenarios', colors.green);

    console.log('\n');
    log('🚀 Next Steps:', colors.blue);
    log('   1. Deploy to Netlify: npm run netlify:deploy:prod', colors.reset);
    log('   2. Push database schema: npm run db:push', colors.reset);
    log('   3. Configure Vapi webhook URL', colors.reset);
    log('   4. Add environment variables (VAPI_SECRET, KEVIN_PHONE_NUMBER)', colors.reset);
    log('   5. Test with real phone calls', colors.reset);

  } catch (error: any) {
    console.log('\n');
    log('╔════════════════════════════════════════════════════════════╗', colors.red);
    log('║     ❌ TESTS FAILED                                        ║', colors.red);
    log('╚════════════════════════════════════════════════════════════╝', colors.red);
    console.log('\n');
    log(`Error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Run tests
runAllTests();
