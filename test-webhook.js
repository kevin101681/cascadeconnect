// IMPORTANT: For local testing, you must use Netlify Dev, not the regular dev server
// Run: npx netlify dev (or npm run dev:netlify if you add it to package.json)
// Netlify Dev will handle the _redirects file and route webhooks to Netlify Functions
// 
// For production, use: https://your-site.netlify.app/api/webhook/vapi
// For local Netlify Dev, use: http://localhost:8888/api/webhook/vapi (default port)
const LOCAL_URL = 'http://localhost:8888/api/webhook/vapi'; // Netlify Dev default port

// 1. SCENARIO A: The "Perfect" Webhook (Data is present)
const happyPayload = {
      message: {
            type: 'end-of-call-report',
                call: { id: 'test-call-happy-' + Date.now() },
                    analysis: {
                              structuredData: {
                                        propertyAddress: '123 Main St',
                                                callerType: 'Homeowner',
                                                        callIntent: 'Warranty Issue'
                              },
                                    summary: 'Test summary: Homeowner called about a leak.'
                    }
      }
};

// 2. SCENARIO B: The "Broken" Webhook (Data is missing -> Triggers Fallback)
const fallbackPayload = {
      message: {
            type: 'end-of-call-report',
                call: { id: 'test-call-fallback-' + Date.now() },
                    // analysis is missing structuredData
                        analysis: {} 
      }
};

async function sendTest(name, payload) {
      console.log(`\n--- 🧪 TESTING: ${name} ---`);
        try {
                const res = await fetch(LOCAL_URL, {
                          method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(payload)
                });
                    
                        const data = await res.json(); // Assuming your API returns JSON
                            console.log(`Status: ${res.status}`);
                                console.log('Response:', data);
        } catch (err) {
                console.error('❌ Error:', err.message);
        }
}

(async () => {
      // Run Happy Path
        await sendTest('Standard Webhook', happyPayload);

          // Run Fallback Path
            // Note: Your server logs should show "Initiating 2-second delay..."
              // The actual Vapi API fetch will fail (404) because this is a fake Call ID,
                // but seeing that log proves the logic works!
                  await sendTest('Empty Payload (Fallback Trigger)', fallbackPayload);
})();