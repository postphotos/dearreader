import config from '../config.js';
import { setTimeout as delay } from 'timers/promises';
export class OpenAIConsumer {
    constructor() {
        this.baseUrl = (config.openai?.base_url || 'https://api.openai.com/v1').replace(/\/$/, '');
        this.apiKey = config.openai?.api_key || process.env.OPENAI_API_KEY || '';
        this.timeoutMs = config.openai?.request_timeout_ms || 30000;
        this.maxRetries = config.openai?.max_retries ?? 2;
    }
    headers() {
        const h = { 'Content-Type': 'application/json' };
        if (this.apiKey)
            h['Authorization'] = `Bearer ${this.apiKey}`;
        return h;
    }
    async fetchWithRetry(url, opts, retriesLeft = this.maxRetries) {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), this.timeoutMs);
            const res = await fetch(url, { ...opts, signal: controller.signal });
            clearTimeout(id);
            if (!res.ok) {
                const body = await res.text().catch(() => '');
                if (retriesLeft > 0 && (res.status === 429 || res.status >= 500)) {
                    await delay(1000);
                    return this.fetchWithRetry(url, opts, retriesLeft - 1);
                }
                throw new Error(`OpenAI request failed ${res.status}: ${body}`);
            }
            return res.json();
        }
        catch (err) {
            if (retriesLeft > 0) {
                await delay(1000);
                return this.fetchWithRetry(url, opts, retriesLeft - 1);
            }
            throw err;
        }
    }
    async createChatCompletion(messages, model = 'gpt-4o-mini', opts = {}) {
        const url = `${this.baseUrl}/chat/completions`;
        const body = { model, messages: messages.map((m) => ({ role: m.role, content: m.content })), ...opts };
        return this.fetchWithRetry(url, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    }
}
export const openaiConsumer = new OpenAIConsumer();
//# sourceMappingURL=openai-consumer.js.map