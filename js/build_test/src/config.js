import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
function loadYamlConfig() {
    try {
        const cfgPath = path.resolve(process.cwd(), 'config.yaml');
        const raw = fs.readFileSync(cfgPath, 'utf8');
        return yaml.load(raw) || {};
    }
    catch (err) {
        return {};
    }
}
const yamlCfg = loadYamlConfig();
const config = {
    url: yamlCfg.url || process.env.READER_BASE_URL || 'http://localhost:3001/',
    base_path: {
        enabled: yamlCfg.base_path?.enabled ?? false,
        path: yamlCfg.base_path?.path || '/dearreader/',
    },
    openai: {
        api_key: process.env.OPENAI_API_KEY || (yamlCfg.openai && yamlCfg.openai.api_key) || '',
        base_url: process.env.OPENAI_BASE_URL || (yamlCfg.openai && yamlCfg.openai.base_url) || 'https://api.openai.com/v1',
        request_timeout_ms: Number(process.env.OPENAI_REQUEST_TIMEOUT_MS) || (yamlCfg.openai && yamlCfg.openai.request_timeout_ms) || 30000,
        max_retries: Number(process.env.OPENAI_MAX_RETRIES) || (yamlCfg.openai && yamlCfg.openai.max_retries) || 2,
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