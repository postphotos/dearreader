"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitControl = void 0;
const civkit_1 = require("civkit");
class RateLimitControl extends civkit_1.AsyncService {
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
exports.RateLimitControl = RateLimitControl;
//# sourceMappingURL=rate-limit.js.map