/**
 * Test Script: AI Warranty Assistant
 * Tests the analyzeWarrantyImage server action
 * 
 * Run: npx tsx scripts/test-ai-warranty-assistant.ts
 */

import { analyzeWarrantyImage } from '../actions/analyze-image';

const TEST_IMAGE_URL = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

async function testAIWarrantyAssistant() {
  console.log('🧪 Testing AI Warranty Assistant\n');
  console.log('=' .repeat(50));
  
  // Test 1: Analyze without existing description
  console.log('\n📝 Test 1: Auto-Fill (Empty Description)');
  console.log('-'.repeat(50));
  
  try {
    console.log('Image URL:', TEST_IMAGE_URL);
    console.log('Current Description: (empty)');
    console.log('\n⏳ Analyzing...\n');
    
    const result1 = await analyzeWarrantyImage(TEST_IMAGE_URL);
    
    console.log('✅ Success!');
    console.log('\nTitle:', result1.title);
    console.log('Description:', result1.description);
    console.log('\n' + '='.repeat(50));
  } catch (error) {
    console.error('❌ Test 1 Failed:', error instanceof Error ? error.message : error);
  }
  
  // Test 2: Refine existing description
  console.log('\n📝 Test 2: Refine (Existing Description)');
  console.log('-'.repeat(50));
  
  try {
    const existingDesc = 'The kitchen faucet is leaking water underneath the sink.';
    console.log('Image URL:', TEST_IMAGE_URL);
    console.log('Current Description:', existingDesc);
    console.log('\n⏳ Analyzing...\n');
    
    const result2 = await analyzeWarrantyImage(TEST_IMAGE_URL, existingDesc);
    
    console.log('✅ Success!');
    console.log('\nTitle:', result2.title);
    console.log('Description:', result2.description);
    console.log('\n' + '='.repeat(50));
  } catch (error) {
    console.error('❌ Test 2 Failed:', error instanceof Error ? error.message : error);
  }
  
  // Test 3: Error handling - invalid URL
  console.log('\n📝 Test 3: Error Handling (Invalid URL)');
  console.log('-'.repeat(50));
  
  try {
    console.log('Image URL: https://invalid-url-that-does-not-exist.com/image.jpg');
    console.log('\n⏳ Testing error handling...\n');
    
    await analyzeWarrantyImage('https://invalid-url-that-does-not-exist.com/image.jpg');
    console.error('❌ Should have thrown an error!');
  } catch (error) {
    console.log('✅ Error handled correctly!');
    console.log('Error message:', error instanceof Error ? error.message : error);
    console.log('\n' + '='.repeat(50));
  }
  
  console.log('\n✅ All tests completed!\n');
  console.log('💡 Tips:');
  console.log('  - Make sure VITE_GEMINI_API_KEY is set in your environment');
  console.log('  - Replace TEST_IMAGE_URL with actual warranty claim images');
  console.log('  - Check console for detailed logs during analysis');
}

// Run tests
testAIWarrantyAssistant().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});

