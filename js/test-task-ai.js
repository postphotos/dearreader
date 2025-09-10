import config from './build/config.js';
import { getAIConsumerForTask, getAIConsumerWithFallback, getAvailableTasks, getTaskConfig } from './build/services/ai-task-manager.js';

console.log('🤖 Task-Based AI Consumer Test');
console.log('==============================');
console.log('');

console.log('1️⃣  Configuration Check');
console.log('-----------------------');
console.log('AI Tasks:', JSON.stringify(config.ai_tasks, null, 2));
console.log('');

console.log('2️⃣  Task-Based Consumer Selection');
console.log('----------------------------------');

// Test different tasks
const testTasks = [
    'parse_pdf',
    'validate_format',
    'edit_crawl',
    'general_chat',
    'code_analysis',
    'nonexistent_task'
];

testTasks.forEach(taskName => {
    console.log(`\n📋 Task: ${taskName}`);

    // Test primary consumer
    const primaryConsumer = getAIConsumerForTask(taskName, false);
    if (primaryConsumer) {
        console.log(`   ✅ Primary: ${primaryConsumer.provider} (${primaryConsumer.baseUrl})`);
    } else {
        console.log(`   ❌ Primary: No consumer available`);
    }

    // Test backup consumer
    const backupConsumer = getAIConsumerForTask(taskName, true);
    if (backupConsumer) {
        console.log(`   🔄 Backup: ${backupConsumer.provider} (${backupConsumer.baseUrl})`);
    } else {
        console.log(`   ❌ Backup: No consumer available`);
    }

    // Test automatic fallback
    const fallbackConsumer = getAIConsumerWithFallback(taskName);
    if (fallbackConsumer) {
        console.log(`   🎯 Auto-select: ${fallbackConsumer.provider} (${fallbackConsumer.baseUrl})`);
    } else {
        console.log(`   ❌ Auto-select: No consumer available`);
    }
});

console.log('');
console.log('3️⃣  Provider Availability Check');
console.log('--------------------------------');
const providers = ['openai', 'openrouter', 'gemini'];
providers.forEach(provider => {
    const consumer = getAIConsumerForTask('default', false);
    if (consumer && consumer.apiKey) {
        console.log(`   ✅ ${provider}: Configured`);
    } else {
        console.log(`   ⚠️  ${provider}: Not configured`);
    }
});

console.log('');
console.log('🎉 Task-Based AI Consumer Test Complete!');
console.log('');
console.log('💡 Usage Examples:');
console.log('   const pdfConsumer = getAIConsumerWithFallback("parse_pdf");');
console.log('   const chatConsumer = getAIConsumerWithFallback("general_chat");');
console.log('   const codeConsumer = getAIConsumerWithFallback("code_analysis");');