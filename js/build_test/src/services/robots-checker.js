import axios from 'axios';
export class RobotsChecker {
    constructor() {
        this.robotsTxtCache = new Map();
    }
    async checkAccess(url, userAgent = '*', path = '/') {
        try {
            const baseUrl = new URL(url).origin;
            const robotsUrl = `${baseUrl}/robots.txt`;
            let robotsTxt = this.robotsTxtCache.get(robotsUrl);
            if (!robotsTxt) {
                const response = await axios.get(robotsUrl);
                robotsTxt = response.data;
                this.robotsTxtCache.set(robotsUrl, robotsTxt);
            }
            const rules = this.parseRobotsTxt(robotsTxt);
            const applicableRules = rules[userAgent] || rules['*'] || [];
            for (const rule of applicableRules) {
                if (rule.path === path || path.startsWith(rule.path)) {
                    return { allowed: rule.allow };
                }
            }
            return { allowed: true }; // Default allow if no matching rule
        }
        catch (error) {
            return { allowed: false, reason: 'Failed to fetch or parse robots.txt' };
        }
    }
    parseRobotsTxt(robotsTxt) {
        const rules = {};
        let currentUserAgent = '';
        const lines = robotsTxt.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('User-agent:')) {
                currentUserAgent = trimmed.split(':')[1].trim();
                rules[currentUserAgent] = rules[currentUserAgent] || [];
            }
            else if (trimmed.startsWith('Disallow:') || trimmed.startsWith('Allow:')) {
                if (currentUserAgent) {
                    const parts = trimmed.split(':');
                    const directive = parts[0].trim();
                    const path = parts[1].trim();
                    const allow = directive === 'Allow';
                    rules[currentUserAgent].push({ path, allow });
                }
            }
        }
        return rules;
    }
    async isAllowed(url, userAgent = '*') {
        const result = await this.checkAccess(url, userAgent);
        return result.allowed;
    }
    async getCrawlDelay(url, userAgent = '*') {
        // For now, return a default delay. In a real implementation,
        // this would parse the Crawl-delay directive from robots.txt
        return 1; // 1 second default delay
    }
}
//# sourceMappingURL=robots-checker.js.map