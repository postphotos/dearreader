export class SecurityCompromiseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SecurityCompromiseError';
    }
}
export class ServiceCrashedError extends Error {
    constructor({ message }) {
        super(message);
        this.name = 'ServiceCrashedError';
    }
}
//# sourceMappingURL=errors.js.map