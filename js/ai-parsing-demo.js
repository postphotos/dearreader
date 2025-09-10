#!/usr/bin/env node

/**
 * AI Provider Parsing Demo for DearReader
 * Demonstrates how to use multiple AI providers for text parsing
 */

import { openaiConsumer, openrouterConsumer, geminiConsumer } from './src/services/openai-consumer.ts';

async function demoAIProviders() {
    console.log('🤖 DearReader AI Provider Parsing Demo');
    console.log('=====================================');
    console.log('');

    const sampleText = `
    DearReader is a local web crawler that converts web pages to LLM-friendly formats.
    It supports multiple output formats including JSON, Markdown, HTML, and plain text.
    The system is designed for local processing without cloud dependencies.
    Key features include queue-based processing, Docker containerization, and performance monitoring.
    `;

    const providers = [
        { name: 'OpenAI', consumer: openaiConsumer },
        { name: 'OpenRouter', consumer: openrouterConsumer },
        { name: 'Gemini', consumer: geminiConsumer }
    ];

    for (const { name, consumer } of providers) {
        try {
            console.log(`🔄 Testing ${name}...`);

            if (!consumer.apiKey) {
                console.log(`   ⚠️  ${name} API key not configured, skipping...`);
                console.log('');
                continue;
            }

            const parsedResult = await consumer.parseText(sampleText);
            console.log(`   ✅ ${name} parsing successful!`);
            console.log(`   📝 Result: ${parsedResult.substring(0, 100)}...`);
            console.log('');

        } catch (error) {
            console.log(`   ❌ ${name} parsing failed: ${error.message}`);
            console.log('');
        }
    }

    console.log('🎉 AI Provider Demo Complete!');
    console.log('');
    console.log('💡 To configure API keys:');
    console.log('   • Set environment variables: OPENAI_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY');
    console.log('   • Or configure in config.yaml under ai_providers.*.api_key');
    console.log('   • The system will automatically use the first available provider');
}

// Handle ES modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Run the demo
demoAIProviders().catch(console.error);