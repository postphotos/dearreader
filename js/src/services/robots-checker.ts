import axios from 'axios';
import RobotsTxtParser from 'robots-txt-parser';

export interface RobotsCheckerResult {
    allowed: boolean;
    reason?: string;
}

export class RobotsChecker {
    async checkAccess(url: string, userAgent: string = '*', path: string = '/'): Promise<RobotsCheckerResult> {
        try {
            const baseUrl = new URL(url).origin;
            const robotsUrl = `${baseUrl}/robots.txt`;

            const response = await axios.get(robotsUrl);
            const robotsTxt = response.data as string;
            const robots = new RobotsTxtParser(robotsUrl, robotsTxt);

            const allowed = robots.isAllowed(path, userAgent);
            return { allowed };
        } catch (error) {
            return { allowed: true, reason: 'Failed to fetch or parse robots.txt' };
        }
    }

    async isAllowed(url: string, userAgent: string = '*'): Promise<boolean> {
        const result = await this.checkAccess(url, userAgent);
        return result.allowed;
    }

    async getCrawlDelay(url: string, userAgent: string = '*'): Promise<number> {
        try {
            const baseUrl = new URL(url).origin;
            const robotsUrl = `${baseUrl}/robots.txt`;

            const response = await axios.get(robotsUrl);
            const robotsTxt = response.data as string;
            const robots = new RobotsTxtParser(robotsUrl, robotsTxt);

            const crawlDelay = robots.getCrawlDelay(userAgent);
            return crawlDelay || 1; // Default to 1 second if no crawl-delay is specified
        } catch (error) {
            return 1; // 1 second default delay
        }
    }
}