#!/usr/bin/env node

/**
 * IP Connection Test for llama.cpp Server
 * Helps verify the IP address configuration is working
 */

async function testIPConnection() {
    console.log('🌐 Testing IP Connection to llama.cpp Server');
    console.log('===========================================');
    console.log('');

    const testIPs = [
        '192.168.1.100:8080',
        '10.0.0.100:8080',
        '172.16.0.100:8080'
    ];

    console.log('🔍 Testing common IP addresses...');
    console.log('');

    for (const ipPort of testIPs) {
        try {
            console.log(`🔄 Testing http://${ipPort}/v1/chat/completions...`);

            const response = await fetch(`http://${ipPort}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'test',
                    messages: [{ role: 'user', content: 'Hello' }],
                    max_tokens: 10
                }),
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });

            if (response.ok) {
                console.log(`✅ Connection successful to ${ipPort}!`);
                console.log('   💡 Update your config.yaml to use this IP:');
                console.log(`      base_url: "http://${ipPort}/v1"`);
                return;
            } else {
                console.log(`❌ Server responded with status ${response.status} for ${ipPort}`);
            }

        } catch (error) {
            console.log(`❌ Connection failed to ${ipPort}: ${error.message}`);
        }
        console.log('');
    }

    console.log('💡 If none of the above IPs work:');
    console.log('   1. Find your llama.cpp server IP: ifconfig or ip addr show');
    console.log('   2. Update config.yaml:');
    console.log('      base_url: "http://YOUR_IP:8080/v1"');
    console.log('   3. Make sure port 8080 is accessible from this machine');
    console.log('');

    // Test current config
    console.log('📋 Current Configuration Test');
    console.log('------------------------------');

    try {
        // Dynamic import to avoid build issues
        const config = (await import('./build/config.js')).default;

        if (config.ai_providers?.openai?.base_url) {
            const currentUrl = config.ai_providers.openai.base_url;
            console.log(`🔧 Current config URL: ${currentUrl}`);

            if (currentUrl.includes('localhost')) {
                console.log('⚠️  Still using localhost - update to IP address');
            } else {
                console.log('✅ Using IP address - ready to test');
            }
        } else {
            console.log('❌ No OpenAI base_url configured');
        }

    } catch (error) {
        console.log(`❌ Config load error: ${error.message}`);
    }
}

// Handle ES modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Run the test
testIPConnection().catch(console.error);