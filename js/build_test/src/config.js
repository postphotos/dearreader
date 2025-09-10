import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
function loadYamlConfig() {
    try {
        // Look for config.yaml in the project root
        // When running from js/ directory, go up one level to reach project root
        const cfgPath = path.resolve(process.cwd(), '../config.yaml');
        const raw = fs.readFileSync(cfgPath, 'utf8');
        return yaml.load(raw) || {};
    }
    catch (err) {
        console.error('Failed to load config.yaml:', err instanceof Error ? err.message : String(err));
        return {};
    }
}
const yamlCfg = loadYamlConfig();
// Helper function to merge YAML config with environment variables
function mergeProviderConfig(yamlConfig, envPrefix = '') {
    const envKey = envPrefix ? `${envPrefix}_API_KEY` : '';
    const envBaseUrl = envPrefix ? `${envPrefix}_BASE_URL` : '';
    const envModel = envPrefix ? `${envPrefix}_MODEL` : '';
    const envTemp = envPrefix ? `${envPrefix}_TEMPERATURE` : '';
    const envPrompt = envPrefix ? `${envPrefix}_PARSING_PROMPT` : '';
    const envMaxTokens = envPrefix ? `${envPrefix}_MAX_TOKENS` : '';
    const envTopP = envPrefix ? `${envPrefix}_TOP_P` : '';
    const envFreqPenalty = envPrefix ? `${envPrefix}_FREQUENCY_PENALTY` : '';
    const envPresPenalty = envPrefix ? `${envPrefix}_PRESENCE_PENALTY` : '';
    const envTimeout = envPrefix ? `${envPrefix}_REQUEST_TIMEOUT_MS` : '';
    const envRetries = envPrefix ? `${envPrefix}_MAX_RETRIES` : '';
    return {
        api_key: process.env[envKey] || yamlConfig?.api_key || '',
        base_url: process.env[envBaseUrl] || yamlConfig?.base_url || '',
        model: process.env[envModel] || yamlConfig?.model || '',
        temperature: Number(process.env[envTemp]) || yamlConfig?.temperature || 0.2,
        parsing_prompt: process.env[envPrompt] || yamlConfig?.parsing_prompt || 'Extract structured data from the following text:',
        prompt_options: {
            max_tokens: Number(process.env[envMaxTokens]) || yamlConfig?.prompt_options?.max_tokens || 2048,
            top_p: Number(process.env[envTopP]) || yamlConfig?.prompt_options?.top_p || 1.0,
            frequency_penalty: Number(process.env[envFreqPenalty]) || yamlConfig?.prompt_options?.frequency_penalty || 0.0,
            presence_penalty: Number(process.env[envPresPenalty]) || yamlConfig?.prompt_options?.presence_penalty || 0.0,
        },
        request_timeout_ms: Number(process.env[envTimeout]) || yamlConfig?.request_timeout_ms || 30000,
        max_retries: Number(process.env[envRetries]) || yamlConfig?.max_retries || 2,
    };
}
// Load all provider-model configurations from YAML
function loadAIProviders() {
    const providers = {};
    // Load all providers defined in YAML
    if (yamlCfg.ai_providers) {
        Object.entries(yamlCfg.ai_providers).forEach(([providerKey, yamlConfig]) => {
            providers[providerKey] = mergeProviderConfig(yamlConfig);
        });
    }
    // If no providers defined in YAML, provide some defaults
    if (Object.keys(providers).length === 0) {
        providers['openai-gpt-3.5-turbo'] = mergeProviderConfig(undefined, 'OPENAI');
        providers['openrouter-gpt-4'] = mergeProviderConfig(undefined, 'OPENROUTER');
        providers['gemini-pro'] = mergeProviderConfig(undefined, 'GEMINI');
    }
    return providers;
}
const config = {
    url: yamlCfg.url || process.env.READER_BASE_URL || 'http://localhost:3001/',
    base_path: {
        enabled: yamlCfg.base_path?.enabled ?? false,
        path: yamlCfg.base_path?.path || '/dearreader/',
    },
    ai_providers: loadAIProviders(),
    ai_tasks: yamlCfg.ai_tasks || {
        parse_pdf: 'openai-gpt-3.5-turbo',
        parse_pdf_backup: 'openrouter-gpt-4',
        validate_format: 'openrouter-gpt-4',
        validate_format_backup: 'openai-gpt-4',
        edit_crawl: 'openrouter-claude',
        edit_crawl_backup: 'gemini-pro',
        general_chat: 'openai-gpt-3.5-turbo',
        general_chat_backup: 'openrouter-gpt-4',
        code_analysis: 'openrouter-gpt-4',
        code_analysis_backup: 'openai-gpt-4',
        ocr_processing: 'gemini-pro-vision',
        ocr_processing_backup: 'openrouter-claude',
        sentiment_analysis: 'openrouter-claude',
        sentiment_analysis_backup: 'gemini-pro',
        content_classification: 'openai-gpt-3.5-turbo',
        content_classification_backup: 'openrouter-gpt-4',
        default: 'openai-gpt-3.5-turbo',
        default_backup: 'openrouter-gpt-4',
    },
    concurrency: {
        max_api_concurrency: Number(process.env.MAX_API_CONCURRENCY) || (yamlCfg.concurrency && yamlCfg.concurrency.max_api_concurrency) || 50,
        default_client_concurrency: Number(process.env.DEFAULT_CLIENT_CONCURRENCY) || (yamlCfg.concurrency && yamlCfg.concurrency.default_client_concurrency) || 5,
        max_queue_length_per_client: Number(process.env.MAX_QUEUE_LENGTH_PER_CLIENT) || (yamlCfg.concurrency && yamlCfg.concurrency.max_queue_length_per_client) || 20,
    },
    ...yamlCfg,
};
export default config;
//# sourceMappingURL=config.js.map