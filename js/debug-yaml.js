import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

console.log('🔍 YAML Loading Debug');
console.log('====================');
console.log('');

try {
    const cfgPath = path.resolve(process.cwd(), 'config.yaml');
    console.log('Config file path:', cfgPath);
    console.log('File exists:', fs.existsSync(cfgPath));
    console.log('');

    if (fs.existsSync(cfgPath)) {
        const raw = fs.readFileSync(cfgPath, 'utf8');
        console.log('Raw YAML content length:', raw.length);
        console.log('First 200 chars:', raw.substring(0, 200));
        console.log('');

        const parsed = yaml.load(raw);
        console.log('Parsed YAML keys:', Object.keys(parsed));
        console.log('ai_providers exists:', !!parsed.ai_providers);
        console.log('');

        if (parsed.ai_providers) {
            console.log('ai_providers keys:', Object.keys(parsed.ai_providers));
            console.log('OpenAI api_key:', parsed.ai_providers.openai?.api_key ? 'SET' : 'NOT SET');
            console.log('OpenRouter api_key:', parsed.ai_providers.openrouter?.api_key ? 'SET' : 'NOT SET');
            console.log('OpenAI base_url:', parsed.ai_providers.openai?.base_url);
        }
    }
} catch (error) {
    console.error('Error loading YAML:', error.message);
}