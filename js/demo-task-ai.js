import { getAIConsumerWithFallback } from './build/services/ai-task-manager.js';

async function demonstrateTaskBasedAI() {
    console.log('🚀 Task-Based AI Usage Demo');
    console.log('===========================');
    console.log('');

    // Example 1: PDF parsing (uses local llama.cpp)
    console.log('1️⃣  PDF Parsing Task:');
    const pdfConsumer = getAIConsumerWithFallback('parse_pdf');
    if (pdfConsumer) {
        console.log(`   Using: ${pdfConsumer.provider} (${pdfConsumer.model})`);
        console.log(`   Base URL: ${pdfConsumer.baseUrl}`);
        // You would use: await pdfConsumer.parseText(pdfContent, customPrompt);
    }
    console.log('');

    // Example 2: Content validation (uses OpenRouter)
    console.log('2️⃣  Content Validation Task:');
    const validationConsumer = getAIConsumerWithFallback('validate_format');
    if (validationConsumer) {
        console.log(`   Using: ${validationConsumer.provider} (${validationConsumer.model})`);
        console.log(`   Base URL: ${validationConsumer.baseUrl}`);
        // You would use: await validationConsumer.parseText(content, validationPrompt);
    }
    console.log('');

    // Example 3: Code analysis (uses OpenRouter)
    console.log('3️⃣  Code Analysis Task:');
    const codeConsumer = getAIConsumerWithFallback('code_analysis');
    if (codeConsumer) {
        console.log(`   Using: ${codeConsumer.provider} (${codeConsumer.model})`);
        console.log(`   Base URL: ${codeConsumer.baseUrl}`);
        // You would use: await codeConsumer.parseText(codeSnippet, analysisPrompt);
    }
    console.log('');

    // Example 4: General chat (uses local model)
    console.log('4️⃣  General Chat Task:');
    const chatConsumer = getAIConsumerWithFallback('general_chat');
    if (chatConsumer) {
        console.log(`   Using: ${chatConsumer.provider} (${chatConsumer.model})`);
        console.log(`   Base URL: ${chatConsumer.baseUrl}`);
        // You would use: await chatConsumer.parseText(userMessage, systemPrompt);
    }
    console.log('');

    console.log('✅ All tasks successfully assigned to appropriate AI providers!');
    console.log('');
    console.log('💡 Benefits:');
    console.log('   • Automatic provider selection based on task type');
    console.log('   • Built-in fallback to backup providers');
    console.log('   • Optimized for cost and performance');
    console.log('   • Easy to reconfigure without code changes');
}

// Run the demo
demonstrateTaskBasedAI().catch(console.error);