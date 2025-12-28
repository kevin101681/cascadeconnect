#!/usr/bin/env node

/**
 * TEST SCRIPT FOR GMAIL ADD-ON API
 * 
 * Usage:
 *   node test-gmail-addon.js
 * 
 * This script tests the gmail-addon Netlify function to ensure it's working correctly.
 */

const https = require('https');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  API_URL: 'https://cascadeconnect.netlify.app/.netlify/functions/gmail-addon',
  // IMPORTANT: Replace with your actual secret from Netlify
  ADDON_SECRET: process.env.GMAIL_ADDON_SECRET || 'YOUR_SECRET_HERE',
};

// ============================================
// TEST DATA
// ============================================

const tests = [
  {
    name: 'Claim Lookup - Valid Address',
    payload: {
      type: 'claim',
      address: '123 Main St, Denver, CO 80202',
    },
    expectedFields: ['summary', 'homeownerName', 'status'],
  },
  {
    name: 'Claim Lookup - Non-existent Address',
    payload: {
      type: 'claim',
      address: '999 Fake Street, Nowhere, XX 00000',
    },
    expectedFields: ['summary'],
    expectNoMatch: true,
  },
  {
    name: 'Phone Lookup - Valid Number',
    payload: {
      type: 'unknown',
      phoneNumber: '(555) 123-4567',
    },
    expectedFields: ['summary', 'phoneMatches'],
  },
  {
    name: 'Phone Lookup - Non-existent Number',
    payload: {
      type: 'unknown',
      phoneNumber: '(999) 999-9999',
    },
    expectedFields: ['summary'],
    expectNoMatch: true,
  },
  {
    name: 'Invalid Type',
    payload: {
      type: 'invalid',
      address: '123 Main St',
    },
    expectError: true,
  },
  {
    name: 'Unauthorized (wrong secret)',
    payload: {
      type: 'claim',
      address: '123 Main St',
    },
    useWrongSecret: true,
    expectUnauthorized: true,
  },
];

// ============================================
// HTTP REQUEST HELPER
// ============================================

function makeRequest(payload, secret) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.API_URL);
    const postData = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-cascade-addon-secret': secret,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// ============================================
// TEST RUNNER
// ============================================

async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  GMAIL ADD-ON API TEST SUITE                             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  if (CONFIG.ADDON_SECRET === 'YOUR_SECRET_HERE') {
    console.error('❌ ERROR: Please set GMAIL_ADDON_SECRET environment variable');
    console.error('   or update CONFIG.ADDON_SECRET in this script.\n');
    console.error('   Usage:');
    console.error('   export GMAIL_ADDON_SECRET=your-secret-here');
    console.error('   node test-gmail-addon.js\n');
    process.exit(1);
  }

  console.log(`🔗 Testing API: ${CONFIG.API_URL}`);
  console.log(`🔑 Using secret: ${CONFIG.ADDON_SECRET.substring(0, 8)}...\n`);

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`Testing: ${test.name}... `);

    try {
      const secret = test.useWrongSecret ? 'wrong-secret' : CONFIG.ADDON_SECRET;
      const response = await makeRequest(test.payload, secret);

      // Check for expected unauthorized response
      if (test.expectUnauthorized) {
        if (response.statusCode === 401) {
          console.log('✅ PASS (401 Unauthorized as expected)');
          passed++;
          continue;
        } else {
          console.log(`❌ FAIL (Expected 401, got ${response.statusCode})`);
          failed++;
          continue;
        }
      }

      // Check for expected error response
      if (test.expectError) {
        if (response.statusCode >= 400) {
          console.log(`✅ PASS (Error response as expected: ${response.statusCode})`);
          passed++;
          continue;
        } else {
          console.log(`❌ FAIL (Expected error, got ${response.statusCode})`);
          failed++;
          continue;
        }
      }

      // Check for success response
      if (response.statusCode !== 200) {
        console.log(`❌ FAIL (Status ${response.statusCode})`);
        console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
        failed++;
        continue;
      }

      // Check for required fields
      let missingFields = [];
      for (const field of test.expectedFields) {
        if (!(field in response.body)) {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        console.log(`❌ FAIL (Missing fields: ${missingFields.join(', ')})`);
        failed++;
        continue;
      }

      // Check for "no match" scenarios
      if (test.expectNoMatch) {
        if (
          response.body.summary &&
          (response.body.summary.includes('No claims found') ||
            response.body.summary.includes('No homeowners found'))
        ) {
          console.log('✅ PASS (No match as expected)');
          passed++;
          continue;
        } else {
          console.log('❌ FAIL (Expected no match, but got data)');
          console.log(`   Summary: ${response.body.summary}`);
          failed++;
          continue;
        }
      }

      console.log('✅ PASS');
      console.log(`   Summary: ${response.body.summary || 'N/A'}`);
      if (response.body.homeownerName) {
        console.log(`   Homeowner: ${response.body.homeownerName}`);
      }
      if (response.body.status) {
        console.log(`   Status: ${response.body.status}`);
      }
      if (response.body.phoneMatches && response.body.phoneMatches.length > 0) {
        console.log(`   Phone Matches: ${response.body.phoneMatches.length}`);
      }
      passed++;
    } catch (error) {
      console.log(`❌ FAIL (Exception: ${error.message})`);
      failed++;
    }

    console.log('');
  }

  // ============================================
  // SUMMARY
  // ============================================

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('🎉 All tests passed! Your Gmail Add-on API is working correctly.\n');
    console.log('Next steps:');
    console.log('1. Deploy the Netlify function');
    console.log('2. Set up the Google Apps Script');
    console.log('3. Test with a real email in Gmail\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
    console.log('Common issues:');
    console.log('• GMAIL_ADDON_SECRET not set in Netlify');
    console.log('• DATABASE_URL not configured');
    console.log('• Database tables are empty (no test data)');
    console.log('• Netlify function not deployed yet\n');
    process.exit(1);
  }
}

// ============================================
// RUN
// ============================================

runTests().catch((error) => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});

