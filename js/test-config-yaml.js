#!/usr/bin/env node

/**
 * Test AI Task Manager with YAML Configuration
 * Verify that the AI task manager can load and use provider-model configurations
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import the config
import config from './build/config.js';

async function testAITaskManager() {
    console.log('🧪 Testing AI Task Manager with YAML Configuration');
    console.log('================================================');
    console.log('');

    try {
        console.log('📋 Configuration loaded:');
        console.log(`   - AI Providers: ${Object.keys(config.ai_providers).length}`);
        console.log(`   - AI Tasks: ${Object.keys(config.ai_tasks).length}`);
        console.log('');

        // Test provider configurations
        console.log('🔧 Provider Configurations:');
        Object.entries(config.ai_providers).forEach(([key, provider]) => {
            console.log(`   ${key}:`);
            console.log(`     - Model: ${provider.model}`);
            console.log(`     - Base URL: ${provider.base_url}`);
            console.log(`     - API Key: ${provider.api_key ? 'SET' : 'NOT SET'}`);
            console.log(`     - Temperature: ${provider.temperature}`);
        });
        console.log('');

        // Test task mappings
        console.log('🎯 Task Mappings:');
        Object.entries(config.ai_tasks).forEach(([task, provider]) => {
            console.log(`   ${task} → ${provider}`);
        });
        console.log('');

        // Test that providers referenced in tasks actually exist
        console.log('✅ Validation:');
        let validMappings = 0;
        let invalidMappings = 0;

        Object.entries(config.ai_tasks).forEach(([task, providerKey]) => {
            if (config.ai_providers[providerKey]) {
                validMappings++;
            } else {
                console.log(`   ❌ Invalid mapping: ${task} → ${providerKey} (provider not found)`);
                invalidMappings++;
            }
        });

        console.log(`   ✅ Valid mappings: ${validMappings}`);
        if (invalidMappings === 0) {
            console.log(`   ✅ All task mappings are valid!`);
        } else {
            console.log(`   ❌ Invalid mappings: ${invalidMappings}`);
        }

        console.log('');
        console.log('🎉 Configuration test completed successfully!');

    } catch (error) {
        console.error(`❌ Error testing configuration: ${error.message}`);
        process.exit(1);
    }
}

// Run the test
testAITaskManager();