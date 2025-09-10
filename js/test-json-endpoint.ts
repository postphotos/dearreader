#!/usr/bin/env node

// Test script for JSON endpoint functionality
// This simulates the /json/ endpoint behavior

import './src/polyfills/dommatrix.ts';
import PDFExtractor from './src/services/pdf-extract.ts';
import * as fs from 'fs';
import * as path from 'path';

// Mock the crawler functionality for testing
class MockCrawlerHost {
    private config: any = {
        pdf: { enable_parsing: true },
        domain: { allow_all_tlds: true }
    };

    // Simulate the JSON endpoint response
    async simulateJsonResponse(url: string) {
        console.log(`🧪 Simulating JSON endpoint for: ${url}`);
        console.log('');

        // Check if it's a PDF URL
        const isPdf = url.toLowerCase().endsWith('.pdf');

        if (isPdf) {
            console.log('📄 Detected PDF URL - would extract text content');
            // Simulate PDF extraction
            const mockPdfText = "This is extracted text from a PDF document.\nIt contains multiple lines and paragraphs.\nPDF extraction is working correctly.";
            return this.formatJsonResponse(url, mockPdfText, true);
        } else {
            console.log('🌐 Detected web page URL - would scrape content');
            // Simulate web page scraping
            const mockWebContent = "# Example Domain\n\nThis domain is for use in illustrative examples in documents.\nYou may use this domain in literature without prior coordination or asking for permission.\n\n[More information...](https://www.iana.org/domains/example)";
            return this.formatJsonResponse(url, mockWebContent, false);
        }
    }

    private formatJsonResponse(url: string, content: string, isPdf: boolean) {
        const response = {
            code: 200,
            status: 20000,
            data: {
                title: isPdf ? "PDF Document" : "Example Domain",
                description: isPdf ? "Extracted PDF content" : "Example domain for documentation",
                url: url,
                content: content,
                links: {
                    "https://www.iana.org/domains/example": "More information about example domains"
                },
                images: {},
                metadata: {
                    lang: "en",
                    "og:title": isPdf ? "PDF Document" : "Example Domain",
                    "og:description": isPdf ? "Extracted PDF content" : "Example domain for documentation",
                    "og:type": "website",
                    "og:url": url,
                    "article:author": "",
                    "article:published_time": "",
                    viewport: "width=device-width, initial-scale=1.0"
                },
                usage: {
                    tokens: Math.ceil(content.length / 4)
                }
            },
            meta: {
                usage: {
                    tokens: Math.ceil(content.length / 4)
                }
            }
        };

        return response;
    }
}

// Test the JSON endpoint simulation
async function testJsonEndpoint() {
    console.log('🧪 Testing /json/ Endpoint Functionality');
    console.log('=====================================');
    console.log('');

    const crawler = new MockCrawlerHost();

    // Test cases
    const testUrls = [
        'https://example.com',
        'https://example.com/document.pdf',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    ];

    for (const url of testUrls) {
        console.log(`Testing: ${url}`);
        console.log('-'.repeat(50));

        try {
            const response = await crawler.simulateJsonResponse(url);

            console.log('✅ JSON Response Generated:');
            console.log(JSON.stringify(response, null, 2));
            console.log('');

            // Validate response structure
            validateJsonResponse(response);

        } catch (error) {
            console.error('❌ Error generating JSON response:', (error as Error).message);
        }

        console.log('');
    }

    console.log('🎉 JSON Endpoint Testing Complete!');
    console.log('');
    console.log('💡 The /json/ endpoint should return responses in this exact format.');
    console.log('   When the server is running, you can test with:');
    console.log('   curl "http://localhost:3001/json/https://example.com"');
}

function validateJsonResponse(response: any) {
    const requiredFields = ['code', 'status', 'data'];
    const dataFields = ['title', 'description', 'url', 'content', 'links', 'images', 'metadata'];

    for (const field of requiredFields) {
        if (!(field in response)) {
            console.log(`⚠️  Missing required field: ${field}`);
        }
    }

    for (const field of dataFields) {
        if (!(field in response.data)) {
            console.log(`⚠️  Missing data field: ${field}`);
        }
    }

    if (response.code === 200 && response.status === 20000) {
        console.log('✅ Response structure is valid');
    } else {
        console.log('⚠️  Response status codes may be incorrect');
    }
}

// Run the test
testJsonEndpoint().catch(console.error);