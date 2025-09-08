"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudHTTPv2 = CloudHTTPv2;
function CloudHTTPv2(config) {
    return function (target, propertyKey, descriptor) {
        // Simplified implementation
        console.log(`CloudHTTPv2 decorator applied to ${String(propertyKey)}`);
        return descriptor;
    };
}
//# sourceMappingURL=decorators.js.map