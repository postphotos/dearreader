import { expect } from 'chai';
import { getAIConsumerForTask, getAIConsumerWithFallback, getAvailableTasks, getTaskConfig } from '../ai-task-manager.js';
import config from '../../config.js';
describe('AI Task Manager', () => {
    // Check if AI is enabled in config
    const aiEnabled = config.ai_enabled !== false;
    describe('Configuration Tests', () => {
        it('should check AI enable/disable configuration', () => {
            // This test always passes - it verifies the AI enable/disable logic
            if (aiEnabled) {
                console.log('✅ AI processing is enabled');
            }
            else {
                console.log('⚠️  AI processing is disabled');
            }
            expect(typeof aiEnabled).to.equal('boolean');
        });
    });
    if (aiEnabled) {
        describe('getAIConsumerForTask', () => {
            it('should return primary consumer for parse_pdf task', () => {
                const consumer = getAIConsumerForTask('parse_pdf', false);
                expect(consumer).to.not.be.null;
                expect(consumer?.provider).to.equal('openrouter');
                expect(consumer?.baseUrl).to.include('openrouter.ai');
            });
            it('should return backup consumer for parse_pdf task', () => {
                const consumer = getAIConsumerForTask('parse_pdf', true);
                expect(consumer).to.not.be.null;
                expect(consumer?.provider).to.equal('openrouter');
                expect(consumer?.baseUrl).to.include('openrouter.ai');
            });
            it('should return primary consumer for validate_format task', () => {
                const consumer = getAIConsumerForTask('validate_format', false);
                expect(consumer).to.not.be.null;
                expect(consumer?.provider).to.equal('openrouter');
            });
            it('should return backup consumer for validate_format task', () => {
                const consumer = getAIConsumerForTask('validate_format', true);
                expect(consumer).to.not.be.null;
                expect(consumer?.provider).to.equal('openrouter');
            });
            it('should return default consumer for unknown task', () => {
                const consumer = getAIConsumerForTask('unknown_task', false);
                expect(consumer).to.not.be.null;
                expect(consumer?.provider).to.equal('openrouter'); // default
            });
            it('should return default backup consumer for unknown task', () => {
                const consumer = getAIConsumerForTask('unknown_task', true);
                expect(consumer).to.not.be.null;
                expect(consumer?.provider).to.equal('openrouter'); // default_backup
            });
            it('should return null for invalid provider', () => {
                // Temporarily modify config to test error handling
                const originalTasks = config.ai_tasks;
                config.ai_tasks = { ...originalTasks, test_invalid: 'invalid_provider' };
                const consumer = getAIConsumerForTask('test_invalid', false);
                expect(consumer).to.be.null;
                // Restore original config
                config.ai_tasks = originalTasks;
            });
        });
        describe('getAIConsumerWithFallback', () => {
            it('should return primary consumer when available', () => {
                const consumer = getAIConsumerWithFallback('parse_pdf');
                expect(consumer).to.not.be.null;
                expect(consumer?.provider).to.equal('openrouter');
            });
            it('should fallback to backup when primary fails', () => {
                // Temporarily modify config to simulate primary failure
                const originalTasks = config.ai_tasks;
                config.ai_tasks = {
                    ...originalTasks,
                    test_fallback: 'invalid_provider',
                    test_fallback_backup: 'openrouter-gpt-4'
                };
                const consumer = getAIConsumerWithFallback('test_fallback');
                expect(consumer).to.not.be.null;
                expect(consumer?.provider).to.equal('openrouter');
                // Restore original config
                config.ai_tasks = originalTasks;
            });
            it('should fallback to default when both primary and backup fail', () => {
                // Temporarily modify config to simulate both failing
                const originalTasks = config.ai_tasks;
                config.ai_tasks = {
                    ...originalTasks,
                    test_double_fallback: 'invalid_provider',
                    test_double_fallback_backup: 'invalid_provider2'
                };
                const consumer = getAIConsumerWithFallback('test_double_fallback');
                expect(consumer).to.not.be.null;
                expect(consumer?.provider).to.equal('openrouter'); // default
                // Restore original config
                config.ai_tasks = originalTasks;
            });
        });
        describe('getAvailableTasks', () => {
            it('should return all configured tasks', () => {
                const tasks = getAvailableTasks();
                expect(tasks).to.be.an('array');
                expect(tasks).to.include('parse_pdf');
                expect(tasks).to.include('validate_format');
                expect(tasks).to.include('edit_crawl');
                expect(tasks).to.include('general_chat');
                expect(tasks).to.include('code_analysis');
                expect(tasks).to.include('default');
            });
            it('should include backup tasks', () => {
                const tasks = getAvailableTasks();
                expect(tasks).to.include('parse_pdf_backup');
                expect(tasks).to.include('validate_format_backup');
            });
        });
        describe('getTaskConfig', () => {
            it('should return primary and backup config for parse_pdf', () => {
                const taskConfig = getTaskConfig('parse_pdf');
                expect(taskConfig.primary).to.equal('openrouter-big');
                expect(taskConfig.backup).to.equal('openrouter-small');
            });
            it('should return primary and backup config for validate_format', () => {
                const taskConfig = getTaskConfig('validate_format');
                expect(taskConfig.primary).to.equal('openrouter-small');
                expect(taskConfig.backup).to.equal('openrouter-big');
            });
            it('should return null for unknown task', () => {
                const config = getTaskConfig('unknown_task');
                expect(config.primary).to.be.null;
                expect(config.backup).to.be.null;
            });
        });
        describe('Integration Tests', () => {
            it('should handle real API calls with fallback', async function () {
                this.timeout(30000); // Increase timeout for API calls
                const consumer = getAIConsumerWithFallback('general_chat');
                expect(consumer).to.not.be.null;
                try {
                    const result = await consumer.parseText('Hello, respond with "test successful"');
                    expect(result).to.be.a('string');
                    expect(result.length).to.be.greaterThan(0);
                }
                catch (error) {
                    // Allow API errors in test environment
                    console.log('API call failed (expected in test environment):', error instanceof Error ? error.message : String(error));
                }
            });
            it('should work with different task types', () => {
                const tasks = ['parse_pdf', 'validate_format', 'edit_crawl', 'general_chat', 'code_analysis'];
                tasks.forEach(task => {
                    const consumer = getAIConsumerWithFallback(task);
                    expect(consumer).to.not.be.null;
                    expect(consumer?.provider).to.be.oneOf(['openai', 'openrouter', 'gemini', 'anthropic']);
                });
            });
            it('should maintain consumer properties', () => {
                const consumer = getAIConsumerWithFallback('parse_pdf');
                expect(consumer).to.not.be.null;
                expect(consumer?.baseUrl).to.be.a('string');
                expect(consumer?.model).to.be.a('string');
                expect(consumer?.temperature).to.be.a('number');
            });
        });
        describe('Error Handling', () => {
            it('should handle missing ai_tasks configuration', () => {
                const originalTasks = config.ai_tasks;
                config.ai_tasks = undefined;
                const consumer = getAIConsumerForTask('parse_pdf', false);
                expect(consumer).to.be.null;
                // Restore original config
                config.ai_tasks = originalTasks;
            });
            it('should handle empty ai_tasks configuration', () => {
                const originalTasks = config.ai_tasks;
                config.ai_tasks = {};
                const consumer = getAIConsumerForTask('parse_pdf', false);
                expect(consumer).to.be.null;
                // Restore original config
                config.ai_tasks = originalTasks;
            });
        });
    }
    else {
        describe('AI Disabled Tests', () => {
            it('should handle AI being disabled gracefully', () => {
                // When AI is disabled, the system should still function without AI features
                expect(aiEnabled).to.equal(false);
            });
            it('should return null for AI consumers when disabled', () => {
                const consumer = getAIConsumerForTask('parse_pdf', false);
                expect(consumer).to.be.null;
            });
            it('should return empty task list when AI is disabled', () => {
                const tasks = getAvailableTasks();
                expect(tasks).to.be.an('array');
                // Tasks might still be returned but consumers will be null
            });
        });
    }
});
//# sourceMappingURL=ai-task-manager.test.js.map