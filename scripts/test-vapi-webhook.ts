#!/usr/bin/env tsx
/**
 * VAPI WEBHOOK TEST SCRIPT
 * Date: December 31, 2025
 * Purpose: Test the new Vapi "Structured Output" payload format (Late-2025 update)
 * 
 * Usage:
 *   npm install -g tsx       # Install tsx if not already installed
 *   tsx scripts/test-vapi-webhook.ts
 *   
 * OR with node:
 *   npx tsx scripts/test-vapi-webhook.ts
 * 
 * This script simulates a Vapi webhook call with structured data in the new
 * artifact.structuredOutputs location (as opposed to the old analysis.structuredData).
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ==========================================
// CONFIGURATION
// ==========================================

interface TestConfig {
  webhookUrl: string;
  vapiSecret: string;
  testCallId: string;
}

const config: TestConfig = {
  // Change this to match your local or deployed webhook endpoint
  webhookUrl: process.env.VAPI_WEBHOOK_TEST_URL || 'http://localhost:8888/.netlify/functions/vapi-webhook',
  
  // Get Vapi secret from environment (REQUIRED)
  vapiSecret: process.env.VAPI_SECRET || process.env.VITE_VAPI_SECRET || '',
  
  // Test call ID
  testCallId: `test-call-${Date.now()}`
};

// ==========================================
// TEST PAYLOADS
// ==========================================

/**
 * Test Scenario 1: Standard Warranty Call (New Format)
 * Uses artifact.structuredOutputs (Late-2025 Vapi format)
 */
const TEST_PAYLOAD_NEW_FORMAT = {
  message: {
    type: 'end-of-call-report',
    call: {
      id: config.testCallId,
      transcript: 'This is a test transcript. The homeowner at 123 Test Lane in Builder City called about a leaking faucet in the master bathroom. Their name is Test User and they can be reached at +15550009999. This is an urgent issue.',
      recordingUrl: 'https://example.com/test-recording.mp3',
      artifact: {
        structuredOutputs: {
          propertyAddress: '123 Test Lane, Builder City, WA 98101',
          homeownerName: 'Test User',
          phoneNumber: '+15550009999',
          issueDescription: 'TEST: Master bathroom faucet is leaking. Water is pooling on the floor. Started yesterday.',
          isUrgent: true
        }
      }
    }
  }
};

/**
 * Test Scenario 2: Non-Urgent Call
 */
const TEST_PAYLOAD_NON_URGENT = {
  message: {
    type: 'end-of-call-report',
    call: {
      id: `test-call-non-urgent-${Date.now()}`,
      transcript: 'Homeowner called about a cosmetic issue with kitchen cabinet door alignment. Not urgent.',
      recordingUrl: 'https://example.com/test-recording-2.mp3',
      artifact: {
        structuredOutputs: {
          propertyAddress: '456 Oak Avenue, Test City, OR 97001',
          homeownerName: 'Jane Smith',
          phoneNumber: '503-555-0100',
          issueDescription: 'Kitchen cabinet door slightly misaligned. Cosmetic issue only.',
          isUrgent: false
        }
      }
    }
  }
};

/**
 * Test Scenario 3: Legacy Format (Old location - for backward compatibility testing)
 */
const TEST_PAYLOAD_LEGACY_FORMAT = {
  message: {
    type: 'end-of-call-report',
    call: {
      id: `test-call-legacy-${Date.now()}`,
      transcript: 'Testing legacy format extraction.',
      recordingUrl: 'https://example.com/test-recording-3.mp3',
      analysis: {
        structuredData: {
          propertyAddress: '789 Pine Street, Legacy Town, CA 90001',
          homeownerName: 'Legacy User',
          phoneNumber: '555-0123',
          issueDescription: 'Testing backward compatibility with old Vapi format.',
          isUrgent: false
        }
      }
    }
  }
};

/**
 * Test Scenario 4: Missing Data (Triggers API Fallback + Emergency Extraction)
 */
const TEST_PAYLOAD_MISSING_DATA = {
  message: {
    type: 'end-of-call-report',
    call: {
      id: `test-call-missing-${Date.now()}`,
      transcript: 'The homeowner at 999 Emergency Lane in Fallback City called about a serious leak. This is John Doe and you can reach me at 206-555-9999.',
      recordingUrl: 'https://example.com/test-recording-4.mp3',
      artifact: {
        structuredOutputs: {} // EMPTY - should trigger emergency extraction from transcript
      }
    }
  }
};

// ==========================================
// TEST RUNNER
// ==========================================

interface TestResult {
  scenario: string;
  success: boolean;
  statusCode?: number;
  response?: any;
  error?: string;
  extractedData?: any;
}

async function sendWebhookRequest(payload: any, scenario: string): Promise<TestResult> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 TEST: ${scenario}`);
  console.log(`${'='.repeat(80)}`);
  console.log('📤 Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vapi-secret': config.vapiSecret,
        'X-Vapi-Secret': config.vapiSecret, // Duplicate header for case-insensitivity
      },
      body: JSON.stringify(payload)
    });

    const statusCode = response.status;
    const responseText = await response.text();
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log(`\n📥 Response Status: ${statusCode}`);
    console.log(`📥 Response Body:`, responseData);

    const success = statusCode >= 200 && statusCode < 300;
    
    if (success) {
      console.log('✅ TEST PASSED');
    } else {
      console.log('❌ TEST FAILED');
    }

    return {
      scenario,
      success,
      statusCode,
      response: responseData
    };

  } catch (error: any) {
    console.log('❌ TEST ERROR:', error.message);
    return {
      scenario,
      success: false,
      error: error.message
    };
  }
}

async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    VAPI WEBHOOK TEST SUITE                                ║');
  console.log('║                    December 31, 2025                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  // Validate configuration
  if (!config.vapiSecret) {
    console.error('❌ ERROR: VAPI_SECRET not found in environment variables!');
    console.error('   Please set VAPI_SECRET in your .env file or environment.');
    process.exit(1);
  }

  console.log('🔧 Configuration:');
  console.log(`   Webhook URL: ${config.webhookUrl}`);
  console.log(`   Vapi Secret: ${config.vapiSecret.substring(0, 10)}...`);
  console.log(`   Test Call ID: ${config.testCallId}\n`);

  const results: TestResult[] = [];

  // Run all test scenarios
  results.push(await sendWebhookRequest(TEST_PAYLOAD_NEW_FORMAT, 'Scenario 1: Standard Warranty Call (New Format)'));
  await sleep(1000);

  results.push(await sendWebhookRequest(TEST_PAYLOAD_NON_URGENT, 'Scenario 2: Non-Urgent Call'));
  await sleep(1000);

  results.push(await sendWebhookRequest(TEST_PAYLOAD_LEGACY_FORMAT, 'Scenario 3: Legacy Format (Backward Compatibility)'));
  await sleep(1000);

  results.push(await sendWebhookRequest(TEST_PAYLOAD_MISSING_DATA, 'Scenario 4: Missing Data (Emergency Extraction Test)'));

  // Print summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                          TEST SUMMARY                                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const status = result.success ? 'PASSED' : 'FAILED';
    console.log(`${icon} ${result.scenario}: ${status}`);
    if (result.statusCode) {
      console.log(`   Status Code: ${result.statusCode}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log(`\n📊 Total: ${results.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  // Check database next
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     NEXT STEPS                                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');
  console.log('1. Check Netlify function logs for detailed extraction logs:');
  console.log('   netlify functions:log vapi-webhook --live\n');
  console.log('2. Verify data was saved to database:');
  console.log('   psql $DATABASE_URL -c "SELECT vapi_call_id, property_address, homeowner_name, is_urgent FROM calls ORDER BY created_at DESC LIMIT 5;"\n');
  console.log('3. Look for these log patterns:');
  console.log('   • "🔍 PAYLOAD SNIFFER" - Shows where structured data was found');
  console.log('   • "✅ Found structured data with keys:" - Extraction successful');
  console.log('   • "🆘 EMERGENCY EXTRACTION" - Gemini fallback triggered');
  console.log('   • "✅ Call saved to database" - Database write successful\n');

  process.exit(failed > 0 ? 1 : 0);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// MAIN EXECUTION
// ==========================================

runAllTests().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

