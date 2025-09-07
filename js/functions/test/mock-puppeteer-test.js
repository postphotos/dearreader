// Simple test to verify our Puppeteer mock implementation works
import 'reflect-metadata';

// Set the mock environment variable
process.env.USE_PUPPETEER_MOCK = 'true';

// Import the PuppeteerControl which should use our mock
import puppeteerControl from '../build/services/puppeteer.js';

async function testMockImplementation() {
  console.log('🧪 Testing Puppeteer mock implementation...');

  try {
    // Test basic functionality
    console.log('✅ Mock PuppeteerControl imported successfully');

    // Test that we can call methods without errors
    const testUrl = new URL('https://example.com');

    console.log('🔍 Testing scrape method...');
    const results = [];
    for await (const result of puppeteerControl.scrape(testUrl)) {
      results.push(result);
      console.log('✅ Scrape result:', {
        title: result.title,
        href: result.href,
        hasHtml: !!result.html,
        hasText: !!result.text
      });
    }

    if (results.length > 0) {
      console.log('✅ Mock implementation working correctly!');
      console.log('📊 Test Results:');
      console.log('   - Title:', results[0].title);
      console.log('   - URL:', results[0].href);
      console.log('   - Has HTML content:', !!results[0].html);
      console.log('   - Has text content:', !!results[0].text);
      console.log('   - Has parsed content:', !!results[0].parsed);
    } else {
      console.log('⚠️  No results from scrape method');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testMockImplementation().then(() => {
  console.log('🎉 Mock test completed successfully!');
}).catch((error) => {
  console.error('💥 Test failed with error:', error);
  process.exit(1);
});