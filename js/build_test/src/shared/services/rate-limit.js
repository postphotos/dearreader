import { AsyncService } from 'civkit';
export class RateLimitControl extends AsyncService {
    constructor() {
        super();
    }
    async init() {
        // Mock implementation
        this.emit('ready');
    }
    async increment(desc) {
        // Mock implementation
        console.log(`Incrementing rate limit for key: ${desc.key}`);
        return true;
    }
    async decrement(desc) {
        // Mock implementation
        console.log(`Decrementing rate limit for key: ${desc.key}`);
    }
}
//# sourceMappingURL=rate-limit.js.map