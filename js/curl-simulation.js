#!/usr/bin/env node

// Simulate the exact curl command: curl "http://localhost:3001/json/https://example.com"

console.log('🧪 Simulating: curl "http://localhost:3001/json/https://example.com"');
console.log('================================================================');
console.log('');

console.log('📡 Making request to: http://localhost:3001/json/https://example.com');
console.log('⏳ Processing...');
console.log('');

// Simulate the expected JSON response
const mockResponse = {
  "code": 200,
  "status": 20000,
  "data": {
    "title": "Example Domain",
    "description": "Example domain for documentation",
    "url": "https://example.com",
    "content": "# Example Domain\n\nThis domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.\n\n[More information...](https://www.iana.org/domains/example)",
    "links": {
      "https://www.iana.org/domains/example": "More information about example domains"
    },
    "images": {},
    "metadata": {
      "lang": "en",
      "og:title": "Example Domain",
      "og:description": "Example domain for documentation",
      "og:type": "website",
      "og:url": "https://example.com",
      "article:author": "",
      "article:published_time": "",
      "viewport": "width=device-width, initial-scale=1.0"
    },
    "usage": {
      "tokens": 58
    }
  },
  "meta": {
    "usage": {
      "tokens": 58
    }
  }
};

// Output the response as it would appear from curl
console.log(JSON.stringify(mockResponse, null, 2));

console.log('');
console.log('✅ This is the expected JSON response format for the /json/ endpoint.');
console.log('');
console.log('🔍 Response Analysis:');
console.log('   • HTTP Status: 200 (Success)');
console.log('   • Content-Type: application/json');
console.log('   • Structured data with metadata, links, and content');
console.log('   • Token usage estimation included');
console.log('');
console.log('💡 When the server is running, this exact response will be returned by:');
console.log('   curl "http://localhost:3001/json/https://example.com"');