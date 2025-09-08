"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceCrashedError = exports.SecurityCompromiseError = void 0;
class SecurityCompromiseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SecurityCompromiseError';
    }
}
exports.SecurityCompromiseError = SecurityCompromiseError;
class ServiceCrashedError extends Error {
    constructor({ message }) {
        super(message);
        this.name = 'ServiceCrashedError';
    }
}
exports.ServiceCrashedError = ServiceCrashedError;
//# sourceMappingURL=errors.js.map