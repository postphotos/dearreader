import axios from 'axios';
import { RobotsParser } from 'robots';
export class RobotsChecker {
    async checkAccess(url, userAgent = '*', path = '/') {
        try {
            const baseUrl = new URL(url).origin;
            const robotsUrl = `${baseUrl}/robots.txt`;
            const response = await axios.get(robotsUrl);
            const robotsTxt = response.data;
            const parser = new RobotsParser();
            const lines = robotsTxt.split('\n');
            parser.parse(lines);
            const allowed = parser.canFetchSync(userAgent, path);
            return { allowed };
        }
        catch (error) {
            return { allowed: true, reason: 'Failed to fetch or parse robots.txt' };
        }
    }
    async isAllowed(url, userAgent = '*') {
        const result = await this.checkAccess(url, userAgent);
        return result.allowed;
    }
    async getCrawlDelay(url, userAgent = '*') {
        try {
            const baseUrl = new URL(url).origin;
            const robotsUrl = `${baseUrl}/robots.txt`;
            const response = await axios.get(robotsUrl);
            const robotsTxt = response.data;
            const parser = new RobotsParser();
            const lines = robotsTxt.split('\n');
            parser.parse(lines);
            const crawlDelay = parser.getCrawlDelay(userAgent);
            return crawlDelay || 1; // Default to 1 second if no crawl-delay is specified
        }
        catch (error) {
            return 1; // 1 second default delay
        }
    }
}
//# sourceMappingURL=robots-checker.js.map