"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPCReflect = RPCReflect;
function RPCReflect() {
    return function (target, propertyKey, parameterIndex) {
        console.log(`RPCReflect decorator applied to parameter ${parameterIndex} of ${String(propertyKey)}`);
    };
}
//# sourceMappingURL=rpc-reflect.js.map