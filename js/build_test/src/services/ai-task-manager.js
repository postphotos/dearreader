import config from '../config.js';
import { AIConsumer } from './openai-consumer.js';
// Helper function to get AI consumer for a specific task
export function getAIConsumerForTask(taskName, useBackup = false) {
    // Check if AI is enabled
    if (config.ai_enabled === false) {
        return null;
    }
    const taskKey = useBackup ? `${taskName}_backup` : taskName;
    const providerName = config.ai_tasks?.[taskKey] || config.ai_tasks?.[useBackup ? 'default_backup' : 'default'];
    if (!providerName || !config.ai_providers?.[providerName]) {
        console.warn(`No AI provider configured for task: ${taskName} (using ${useBackup ? 'backup' : 'primary'})`);
        return null;
    }
    try {
        return new AIConsumer(providerName);
    }
    catch (error) {
        console.error(`Failed to create AI consumer for provider ${providerName}:`, error);
        return null;
    }
}
// Helper function to get AI consumer with automatic fallback
export function getAIConsumerWithFallback(taskName) {
    // Try primary first
    let consumer = getAIConsumerForTask(taskName, false);
    if (consumer) {
        return consumer;
    }
    // Try backup
    consumer = getAIConsumerForTask(taskName, true);
    if (consumer) {
        console.log(`Using backup AI provider for task: ${taskName}`);
        return consumer;
    }
    // Try default
    consumer = getAIConsumerForTask('default', false);
    if (consumer) {
        console.log(`Using default AI provider for task: ${taskName}`);
        return consumer;
    }
    // Try default backup
    consumer = getAIConsumerForTask('default', true);
    if (consumer) {
        console.log(`Using default backup AI provider for task: ${taskName}`);
        return consumer;
    }
    console.error(`No AI providers available for task: ${taskName}`);
    return null;
}
// Get all available tasks
export function getAvailableTasks() {
    return Object.keys(config.ai_tasks || {});
}
// Get task configuration
export function getTaskConfig(taskName) {
    const primary = config.ai_tasks?.[taskName] || null;
    const backup = config.ai_tasks?.[`${taskName}_backup`] || null;
    return { primary, backup };
}
//# sourceMappingURL=ai-task-manager.js.map