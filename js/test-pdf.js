#!/usr/bin/env node

// Simple test script for PDF extraction functionality
// This tests the PDFExtractor class directly

// Import polyfills first
import './src/polyfills/dommatrix.ts';
import PDFExtractor from './src/services/pdf-extract.ts';
import * as fs from 'fs';
import * as path from 'path';

async function testPDFExtraction() {
    console.log('🧪 Testing PDF Extraction Functionality');
    console.log('=====================================');

    try {
        // Test with a simple PDF URL - we'll use a known PDF for testing
        const testPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

        console.log('📄 Testing PDF extraction with:', testPdfUrl);

        // For this test, we'll create a mock PDF buffer since we can't easily download PDFs in this environment
        // In a real scenario, you'd download the PDF first
        const mockPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n72 720 Td\n/F0 12 Tf\n(Hello, PDF World!) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000200 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n284\n%%EOF', 'utf8');

        console.log('📊 Extracting text from PDF...');
        const extractedText = await PDFExtractor.extractTextFromPDF(mockPdfBuffer);

        console.log('✅ PDF extraction successful!');
        console.log('📝 Extracted text:', extractedText);

        if (extractedText && extractedText.trim().length > 0) {
            console.log('🎉 PDF extraction is working correctly!');
            console.log('   - Text length:', extractedText.length);
            console.log('   - Contains expected content:', extractedText.includes('Hello'));
        } else {
            console.log('⚠️  PDF extraction returned empty text');
        }

    } catch (error) {
        console.error('❌ PDF extraction failed:', error.message);
        console.error('   This could be due to:');
        console.error('   - Missing pdfjs-dist dependency');
        console.error('   - Invalid PDF format');
        console.error('   - Browser environment issues');
    }
}

// Run the test
testPDFExtraction().catch(console.error);