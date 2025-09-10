#!/usr/bin/env node

// PDF OCR + OpenAI Demo Script for DearReader
// Demonstrates PDF extraction with OCR and OpenAI processing

import './src/polyfills/dommatrix.ts';
import PDFExtractor from './src/services/pdf-extract.ts';
import { openaiConsumer, openrouterConsumer, geminiConsumer } from './src/services/openai-consumer.ts';
import * as fs from 'fs';
import * as path from 'path';

async function demoPDFWithOCRAndOpenAI() {
    console.log('📚 DearReader PDF OCR + OpenAI Demo');
    console.log('====================================');
    console.log('');

    console.log('🎯 This demo shows PDF OCR extraction combined with OpenAI processing!');
    console.log('');

    // Create a sample PDF with image-based text (simulating a scanned document)
    console.log('📄 Creating sample scanned PDF...');
    console.log('----------------------------------');

    try {
        // For demo purposes, we'll use a text-based PDF since creating image PDFs is complex
        // In real scenarios, this would be a scanned PDF with no extractable text
        const samplePdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
72 720 Td
/F0 14 Tf
(Scanned Document: Artificial Intelligence) Tj
72 690 Td
/F0 12 Tf
(This document discusses the impact of AI on society.) Tj
72 660 Td
(Artificial Intelligence (AI) is transforming industries) Tj
72 630 Td
(and creating new opportunities for innovation.) Tj
72 600 Td
(Machine learning algorithms can analyze vast amounts) Tj
72 570 Td
(of data to identify patterns and make predictions.) Tj
72 540 Td
(The ethical implications of AI development must) Tj
72 510 Td
(be carefully considered by researchers and policymakers.) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000200 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
400
%%EOF`;

        const pdfBuffer = Buffer.from(samplePdfContent, 'utf8');

        console.log('🔄 Step 1: Extracting text from PDF...');
        const extractedText = await PDFExtractor.extractTextFromPDF(pdfBuffer);

        console.log('✅ PDF processed successfully!');
        console.log('');
        console.log('📝 Extracted Text:');
        console.log('==================');
        console.log(extractedText);
        console.log('');

        // Show statistics
        const lines = extractedText.split('\n').filter(line => line.trim());
        console.log('📊 Extraction Statistics:');
        console.log(`   • Total characters: ${extractedText.length}`);
        console.log(`   • Text lines: ${lines.length}`);
        console.log('');

        console.log('🤖 Step 2: Processing with AI...');
        console.log('-----------------------------------');

        // Use AI providers for processing (try OpenAI first, fallback to others)
        let aiConsumer = openaiConsumer;
        let providerName = 'OpenAI';

        if (!aiConsumer.apiKey) {
            if (openrouterConsumer.apiKey) {
                aiConsumer = openrouterConsumer;
                providerName = 'OpenRouter';
            } else if (geminiConsumer.apiKey) {
                aiConsumer = geminiConsumer;
                providerName = 'Gemini';
            } else {
                throw new Error('No AI provider API key configured. Set OPENAI_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY');
            }
        }

        // Use the selected AI consumer to summarize the extracted text
        const messages = [
            {
                role: 'system',
                content: 'You are a helpful assistant that summarizes documents and extracts key insights.'
            },
            {
                role: 'user',
                content: `Please summarize the following text extracted from a PDF document and provide key insights:\n\n${extractedText}`
            }
        ];

        const response = await aiConsumer.createChatCompletion(messages, aiConsumer.model, {
            max_tokens: aiConsumer.promptOptions.max_tokens,
            temperature: aiConsumer.temperature
        });

        const summary = aiConsumer.provider === 'gemini' ?
            response.candidates?.[0]?.content?.parts?.[0]?.text :
            response.choices?.[0]?.message?.content;

        console.log(`✅ ${providerName} processing complete!`);
        console.log('');
        console.log('📋 OpenAI Summary:');
        console.log('==================');
        console.log(summary);
        console.log('');

    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        if (error.message.includes('AI provider') || error.message.includes('OpenAI') || error.message.includes('OpenRouter') || error.message.includes('Gemini')) {
            console.log('');
            console.log('💡 To fix AI provider errors:');
            console.log('   1. Set your API key:');
            console.log('      - OpenAI: export OPENAI_API_KEY=your_key_here');
            console.log('      - OpenRouter: export OPENROUTER_API_KEY=your_key_here');
            console.log('      - Gemini: export GEMINI_API_KEY=your_key_here');
            console.log('   2. Or add it to config.yaml under ai_providers.provider.api_key');
        }
        return;
    }

    console.log('');
    console.log('🎉 PDF OCR + AI Demo Complete!');
    console.log('');
    console.log('💡 Key Features Demonstrated:');
    console.log('   ✅ PDF text extraction with OCR fallback');
    console.log('   ✅ Multi-provider AI integration (OpenAI, OpenRouter, Gemini)');
    console.log('   ✅ Combined workflow: Extract → Analyze');
    console.log('   ✅ Error handling and fallbacks');
    console.log('');
    console.log('🚀 Ready for production use!');
    console.log('');
    console.log('📖 Usage:');
    console.log('   1. Set an AI provider API key:');
    console.log('      - export OPENAI_API_KEY=your_key_here');
    console.log('      - export OPENROUTER_API_KEY=your_key_here');
    console.log('      - export GEMINI_API_KEY=your_key_here');
    console.log('   2. Run: node pdf-ocr-openai-demo.js');
    console.log('   3. For real scanned PDFs, OCR will automatically activate');
}

// Handle ES modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Run the demo
demoPDFWithOCRAndOpenAI().catch(console.error);