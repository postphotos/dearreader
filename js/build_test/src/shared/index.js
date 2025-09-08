"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registry = exports.loadModulesDynamically = exports.RPCReflect = exports.OutputServerEventStream = exports.Logger = exports.CloudHTTPv2 = exports.FirebaseStorageBucketControl = exports.InsufficientBalanceError = exports.AsyncContext = void 0;
exports.Param = Param;
const decorators_js_1 = require("./decorators.js");
Object.defineProperty(exports, "CloudHTTPv2", { enumerable: true, get: function () { return decorators_js_1.CloudHTTPv2; } });
const logger_js_1 = require("./logger.js");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logger_js_1.Logger; } });
const output_stream_js_1 = require("./output-stream.js");
Object.defineProperty(exports, "OutputServerEventStream", { enumerable: true, get: function () { return output_stream_js_1.OutputServerEventStream; } });
const rpc_reflect_js_1 = require("./rpc-reflect.js");
Object.defineProperty(exports, "RPCReflect", { enumerable: true, get: function () { return rpc_reflect_js_1.RPCReflect; } });
const tsyringe_1 = require("tsyringe");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let AsyncContext = class AsyncContext {
    constructor() {
        this.storage = new Map();
    }
    set(key, value) {
        this.storage.set(key, value);
    }
    get(key) {
        return this.storage.get(key);
    }
};
exports.AsyncContext = AsyncContext;
exports.AsyncContext = AsyncContext = __decorate([
    (0, tsyringe_1.injectable)()
], AsyncContext);
class InsufficientBalanceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InsufficientBalanceError';
    }
}
exports.InsufficientBalanceError = InsufficientBalanceError;
function Param(name, options) {
    return (target, propertyKey, parameterIndex) => {
        // Implementation details would go here
    };
}
let FirebaseStorageBucketControl = class FirebaseStorageBucketControl {
    constructor() {
        this.localStorageDir = path.join('/app', 'local-storage');
        if (!fs.existsSync(this.localStorageDir)) {
            fs.mkdirSync(this.localStorageDir, { recursive: true });
        }
    }
    async uploadFile(filePath, destination) {
        const destPath = path.join(this.localStorageDir, destination);
        await fs.promises.copyFile(filePath, destPath);
        return `file://${destPath}`;
    }
    async downloadFile(filePath, destination) {
        const sourcePath = path.join(this.localStorageDir, filePath);
        await fs.promises.copyFile(sourcePath, destination);
    }
    async deleteFile(filePath) {
        const fullPath = path.join(this.localStorageDir, filePath);
        await fs.promises.unlink(fullPath);
    }
    async fileExists(filePath) {
        const fullPath = path.join(this.localStorageDir, filePath);
        return fs.existsSync(fullPath);
    }
    async saveFile(filePath, content, options) {
        const fullPath = path.join(this.localStorageDir, filePath);
        await fs.promises.writeFile(fullPath, new Uint8Array(content));
    }
    async signDownloadUrl(filePath, expirationTime) {
        const fullPath = path.join(this.localStorageDir, filePath);
        return `file://${fullPath}`;
    }
};
exports.FirebaseStorageBucketControl = FirebaseStorageBucketControl;
exports.FirebaseStorageBucketControl = FirebaseStorageBucketControl = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [])
], FirebaseStorageBucketControl);
const loadModulesDynamically = (path) => {
    // Simplified implementation
    console.log(`Loading modules from ${path}`);
};
exports.loadModulesDynamically = loadModulesDynamically;
exports.registry = {
    exportAll: () => ({}),
    exportGrouped: () => ({}),
    allHandsOnDeck: async () => { },
};
//# sourceMappingURL=index.js.map