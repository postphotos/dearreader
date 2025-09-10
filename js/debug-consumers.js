import config from './build/config.js';
import { openaiConsumer, openrouterConsumer, geminiConsumer } from './build/services/openai-consumer.js';

console.log('🔍 Consumer Debug Info');
console.log('======================');
console.log('');

console.log('1️⃣  Config loaded:');
console.log('   ai_providers:', JSON.stringify(config.ai_providers, null, 2));
console.log('');

console.log('2️⃣  Consumer instances:');
console.log('   OpenAI Consumer:');
console.log('     - apiKey:', openaiConsumer.apiKey ? 'SET' : 'NOT SET');
console.log('     - baseUrl:', openaiConsumer.baseUrl);
console.log('     - model:', openaiConsumer.model);
console.log('');

console.log('   OpenRouter Consumer:');
console.log('     - apiKey:', openrouterConsumer.apiKey ? 'SET' : 'NOT SET');
console.log('     - baseUrl:', openrouterConsumer.baseUrl);
console.log('     - model:', openrouterConsumer.model);
console.log('');

console.log('   Gemini Consumer:');
console.log('     - apiKey:', geminiConsumer.apiKey ? 'SET' : 'NOT SET');
console.log('     - baseUrl:', geminiConsumer.baseUrl);
console.log('     - model:', geminiConsumer.model);
console.log('');

console.log('3️⃣  Environment variables:');
console.log('   OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('   OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? 'SET' : 'NOT SET');
console.log('   GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET');