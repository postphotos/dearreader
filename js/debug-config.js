#!/usr/bin/env node

/**
 * Debug Config Loading
 * Check what's actually being loaded from config.yaml
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

function debugConfigLoading() {
    console.log('🔍 Debug Config Loading');
    console.log('=======================');
    console.log('');

    try {
        const cfgPath = path.resolve(process.cwd(), '../config.yaml');
        console.log(`📁 Config file path: ${cfgPath}`);

        if (!fs.existsSync(cfgPath)) {
            console.log('❌ Config file does not exist!');
            return;
        }

        const raw = fs.readFileSync(cfgPath, 'utf8');
        console.log(`📄 Raw config length: ${raw.length} characters`);

        const parsed = yaml.load(raw);
        console.log('📋 Parsed config structure:');

        if (parsed.ai_providers) {
            console.log('✅ ai_providers section found:');
            Object.keys(parsed.ai_providers).forEach(provider => {
                const config = parsed.ai_providers[provider];
                console.log(`   ${provider}:`);
                console.log(`     - api_key: ${config.api_key ? 'SET' : 'NOT SET'}`);
                console.log(`     - base_url: ${config.base_url}`);
                console.log(`     - model: ${config.model}`);
            });
        } else {
            console.log('❌ ai_providers section NOT found');
        }

        // Check for old openai section
        if (parsed.openai) {
            console.log('⚠️  Old openai section still exists:');
            console.log(`   - base_url: ${parsed.openai.base_url}`);
        }

        console.log('');
        console.log('🔧 Environment variables:');
        console.log(`   OPENAI_BASE_URL: ${process.env.OPENAI_BASE_URL || 'NOT SET'}`);
        console.log(`   OPENROUTER_BASE_URL: ${process.env.OPENROUTER_BASE_URL || 'NOT SET'}`);
        console.log(`   GEMINI_BASE_URL: ${process.env.GEMINI_BASE_URL || 'NOT SET'}`);

    } catch (error) {
        console.log(`❌ Error loading config: ${error.message}`);
    }
}

// Handle ES modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Run the debug
debugConfigLoading();