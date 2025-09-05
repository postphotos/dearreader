import axios from 'axios';

export interface RobotsCheckerResult {
    allowed: boolean;
    reason?: string;
}

export class RobotsChecker {
    private robotsTxtCache: Map<string, string> = new Map();

    async checkAccess(url: string, userAgent: string = '*', path: string = '/'): Promise<RobotsCheckerResult> {
        try {
            const baseUrl = new URL(url).origin;
            const robotsUrl = `${baseUrl}/robots.txt`;

            let robotsTxt = this.robotsTxtCache.get(robotsUrl);
            if (!robotsTxt) {
                const response = await axios.get(robotsUrl);
                robotsTxt = response.data;
                this.robotsTxtCache.set(robotsUrl, c);
            }

            const rules = this.parseRobotsTxt(robotsTxt);
            const applicableRules = rules[userAgent] || rules['*'] || [];

            for (const rule of applicableRules) {
                if (rule.path === path || path.startsWith(rule.path)) {
                    return { allowed: rule.allow };
                }
            }

            return { allowed: true }; // Default allow if no matching rule
        } catch (error) {
            return { allowed: false, reason: 'Failed to fetch or parse robots.txt' };
        }
    }

    private parseRobotsTxt(robotsTxt: string): Record<string, { path: string; allow: boolean }[]> {
        const rules: Record<string, { path: string; allow: boolean }[]> = {};
        let currentUserAgent = '';

        const lines = robotsTxt.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('User-agent:')) {
                currentUserAgent = trimmed.split(':')[1].trim();
                rules[currentUserAgent] = rules[currentUserAgent] || [];
            } else if (trimmed.startsWith('Disallow:') || trimmed.startsWith('Allow:')) {
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
}