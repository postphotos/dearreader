#!/usr/bin/env node

/**
 * Simple AI Integration Test for DearReader
 * Tests the user's local llama.cpp setup at localhost:8080
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Simple DOMMatrix polyfill for pdfjs
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(init) {
      if (typeof init === 'string') {
        // ignore matrix string
      } else if (Array.isArray(init)) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init.concat([1,0,0,1,0,0]).slice(0,6);
      } else if (init && typeof init === 'object') {
        Object.assign(this, init);
      }
    }
    multiply() { return this; }
    multiplySelf() { return this; }
    translateSelf() { return this; }
    scaleSelf() { return this; }
    toString() { return '' + this.a + ',' + this.b + ',' + this.c + ',' + this.d + ',' + this.e + ',' + this.f; }
  }
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}

async function testAIIntegration() {
    console.log('🤖 DearReader AI Integration Test');
    console.log('=================================');
    console.log('');

    try {
        // Dynamic imports to avoid module resolution issues
        const { openaiConsumer, openrouterConsumer, geminiConsumer } = await import('./build/services/openai-consumer.js');
        const config = (await import('./build/config.js')).default;

        console.log('1️⃣  Configuration Check');
        console.log('-----------------------');

        const providers = [
            { name: 'Local llama.cpp', consumer: openaiConsumer, expectedUrl: 'localhost:8080' },
            { name: 'OpenRouter', consumer: openrouterConsumer, expectedUrl: 'openrouter.ai' },
            { name: 'Gemini', consumer: geminiConsumer, expectedUrl: 'generativelanguage.googleapis.com' }
        ];

        providers.forEach(({ name, consumer, expectedUrl }) => {
            if (consumer.apiKey) {
                console.log(`   ✅ ${name}: Configured (${consumer.baseUrl})`);
            } else {
                console.log(`   ⚠️  ${name}: Not configured`);
            }
        });

        console.log('');

        // Test local llama.cpp first
        console.log('2️⃣  Testing Local llama.cpp (localhost:8080)');
        console.log('-------------------------------------------');

        if (openaiConsumer.apiKey) {
            try {
                console.log('🔄 Sending test request to local llama.cpp...');

                const testMessage = 'Hello! Please respond with exactly "Local AI test successful"';
                const response = await openaiConsumer.parseText(testMessage, 'Respond to: ');

                if (response && response.toLowerCase().includes('successful')) {
                    console.log('✅ Local llama.cpp integration successful!');
                    console.log(`   📝 Response: ${response}`);
                } else {
                    console.log('⚠️  Local llama.cpp responded but with unexpected content');
                    console.log(`   📝 Response: ${response || 'No response'}`);
                }

            } catch (error) {
                console.log(`❌ Local llama.cpp test failed: ${error.message}`);
                if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
                    console.log('   💡 Make sure llama.cpp server is running on localhost:8080');
                    console.log('   💡 Check that the model file is loaded correctly');
                }
            }
        } else {
            console.log('⚠️  Local llama.cpp not configured (missing API key)');
        }

        console.log('');

        // Test OpenRouter
        console.log('3️⃣  Testing OpenRouter');
        console.log('----------------------');

        if (openrouterConsumer.apiKey) {
            try {
                console.log('🔄 Testing OpenRouter API...');

                const response = await openrouterConsumer.parseText(
                    'What is DearReader?',
                    'Explain what this tool does:'
                );

                console.log('✅ OpenRouter integration successful!');
                console.log(`   📝 Response: ${response.substring(0, 100)}...`);

            } catch (error) {
                console.log(`❌ OpenRouter test failed: ${error.message}`);
            }
        } else {
            console.log('⚠️  OpenRouter not configured');
        }

        console.log('');
        console.log('🎉 AI Integration Test Complete!');
        console.log('');
        console.log('💡 Summary:');
        console.log('   • Local llama.cpp: ' + (openaiConsumer.apiKey ? 'Configured' : 'Not configured'));
        console.log('   • OpenRouter: ' + (openrouterConsumer.apiKey ? 'Configured' : 'Not configured'));
        console.log('   • Gemini: ' + (geminiConsumer.apiKey ? 'Configured' : 'Not configured'));
        console.log('');
        console.log('🚀 Ready to use AI-powered PDF processing!');

    } catch (error) {
        console.error('❌ Test setup failed:', error.message);
        console.error('   This might be due to missing dependencies or build issues');
    }
}

// Run the test
testAIIntegration().catch(console.error);