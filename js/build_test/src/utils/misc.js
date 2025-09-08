"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanAttribute = cleanAttribute;
function cleanAttribute(attribute) {
    return attribute ? attribute.replace(/(\n+\s*)+/g, '\n') : '';
}
//# sourceMappingURL=misc.js.map