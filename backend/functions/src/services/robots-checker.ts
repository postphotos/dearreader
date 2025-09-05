import { singleton } from 'tsyringe';
import { Logger } from '../shared/index.js';

export interface RobotsRule {
    userAgent: string;
    disallowed: string[];
    allowed: string[];
    crawlDelay?: number;
    sitemaps: string[];
}

@singleton()
export class RobotsChecker {
    private robotsCache = new Map<string, { rules: RobotsRule[], expiry: number }>();
    private readonly cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

    constructor(private logger: Logger) {
        console.log('RobotsChecker initialized');
    }

    async isAllowed(url: URL, userAgent: string = 'DearReader-Bot'): Promise<boolean> {
        try {
            const origin = `${url.protocol}//${url.host}`;
            const robotsUrl = `${origin}/robots.txt`;

            // Get robots.txt rules
            const rules = await this.getRobotsRules(robotsUrl);

            // Check if the path is allowed
            return this.checkPathAllowed(url.pathname, userAgent, rules);
        } catch (error) {
            this.logger.warn('Error checking robots.txt, allowing by default:', error);
            // If we can't check robots.txt, allow by default (be conservative)
            return true;
        }
    }

    private async getRobotsRules(robotsUrl: string): Promise<RobotsRule[]> {
        const cacheKey = robotsUrl;
        const cached = this.robotsCache.get(cacheKey);

        if (cached && Date.now() < cached.expiry) {
            return cached.rules;
        }

        try {
            console.log('Fetching robots.txt from:', robotsUrl);
            const response = await fetch(robotsUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'DearReader-Bot/1.0',
                },
                signal: AbortSignal.timeout(5000), // 5 second timeout
            });

            if (!response.ok) {
                console.log('robots.txt not found or error, allowing all');
                return [];
            }

            const robotsText = await response.text();
            const rules = this.parseRobotsTxt(robotsText);

            // Cache the results
            this.robotsCache.set(cacheKey, {
                rules,
                expiry: Date.now() + this.cacheTimeout
            });

            return rules;
        } catch (error) {
            console.log('Error fetching robots.txt, allowing by default:', error);
            return [];
        }
    }

    private parseRobotsTxt(robotsText: string): RobotsRule[] {
        const lines = robotsText.split('\n').map(line => line.trim());
        const rules: RobotsRule[] = [];
        let currentRule: Partial<RobotsRule> | null = null;

        for (const line of lines) {
            if (!line || line.startsWith('#')) {
                continue; // Skip empty lines and comments
            }

            const [directive, ...valueParts] = line.split(':');
            const value = valueParts.join(':').trim();

            if (!directive || !value) {
                continue;
            }

            const dir = directive.toLowerCase();

            switch (dir) {
                case 'user-agent':
                    // Start a new rule
                    if (currentRule) {
                        rules.push(this.completeRule(currentRule));
                    }
                    currentRule = {
                        userAgent: value.toLowerCase(),
                        disallowed: [],
                        allowed: [],
                        sitemaps: []
                    };
                    break;

                case 'disallow':
                    if (currentRule) {
                        currentRule.disallowed = currentRule.disallowed || [];
                        if (value) {
                            currentRule.disallowed.push(value);
                        }
                    }
                    break;

                case 'allow':
                    if (currentRule) {
                        currentRule.allowed = currentRule.allowed || [];
                        if (value) {
                            currentRule.allowed.push(value);
                        }
                    }
                    break;

                case 'crawl-delay':
                    if (currentRule) {
                        const delay = parseInt(value, 10);
                        if (!isNaN(delay)) {
                            currentRule.crawlDelay = delay;
                        }
                    }
                    break;

                case 'sitemap':
                    if (currentRule) {
                        currentRule.sitemaps = currentRule.sitemaps || [];
                        currentRule.sitemaps.push(value);
                    }
                    break;
            }
        }

        // Add the last rule
        if (currentRule) {
            rules.push(this.completeRule(currentRule));
        }

        return rules;
    }

    private completeRule(rule: Partial<RobotsRule>): RobotsRule {
        return {
            userAgent: rule.userAgent || '*',
            disallowed: rule.disallowed || [],
            allowed: rule.allowed || [],
            crawlDelay: rule.crawlDelay,
            sitemaps: rule.sitemaps || []
        };
    }

    private checkPathAllowed(path: string, userAgent: string, rules: RobotsRule[]): boolean {
        // Find applicable rules for this user agent
        const applicableRules = rules.filter(rule =>
            rule.userAgent === '*' ||
            rule.userAgent === userAgent.toLowerCase() ||
            userAgent.toLowerCase().includes(rule.userAgent)
        );

        if (applicableRules.length === 0) {
            return true; // No rules = allowed
        }

        // Check each applicable rule
        for (const rule of applicableRules) {
            // Check allow rules first (they take precedence)
            for (const allowPattern of rule.allowed) {
                if (this.pathMatches(path, allowPattern)) {
                    return true;
                }
            }

            // Check disallow rules
            for (const disallowPattern of rule.disallowed) {
                if (this.pathMatches(path, disallowPattern)) {
                    return false;
                }
            }
        }

        return true; // Default to allowed if no specific rule matches
    }

    private pathMatches(path: string, pattern: string): boolean {
        if (pattern === '') {
            return false; // Empty pattern doesn't match anything
        }

        if (pattern === '/') {
            return true; // Root pattern matches everything
        }

        // Simple pattern matching - exact prefix match
        // In a full implementation, you might want to support wildcards
        return path.startsWith(pattern);
    }

    async getCrawlDelay(url: URL, userAgent: string = 'DearReader-Bot'): Promise<number | undefined> {
        try {
            const rules = await this.getRobotsRules(`${url.protocol}//${url.host}/robots.txt`);
            const applicableRules = rules.filter(rule =>
                rule.userAgent === '*' ||
                rule.userAgent === userAgent.toLowerCase()
            );

            // Return the first crawl delay found
            for (const rule of applicableRules) {
                if (rule.crawlDelay !== undefined) {
                    return rule.crawlDelay;
                }
            }

            return undefined;
        } catch (error) {
            return undefined;
        }
    }
}
