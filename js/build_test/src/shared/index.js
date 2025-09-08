var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { CloudHTTPv2 } from './decorators.js';
import { Logger } from './logger.js';
import { OutputServerEventStream } from './output-stream.js';
import { RPCReflect } from './rpc-reflect.js';
import { injectable } from 'tsyringe';
import * as fs from 'fs';
import * as path from 'path';
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
AsyncContext = __decorate([
    injectable()
], AsyncContext);
export { AsyncContext };
export class InsufficientBalanceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InsufficientBalanceError';
    }
}
export function Param(name, options) {
    return (target, propertyKey, parameterIndex) => {
        // Implementation details would go here
    };
}
let FirebaseStorageBucketControl = class FirebaseStorageBucketControl {
    constructor() {
        // Prefer Docker-mounted path /app/local-storage when available, otherwise use project-local storage directory.
        const preferred = process.env.LOCAL_STORAGE_DIR || path.join('/app', 'local-storage');
        const fallback = path.join(process.cwd(), 'storage');
        let chosen = preferred;
        try {
            // try creating preferred; if it fails or is on a read-only fs, fall back
            if (!fs.existsSync(preferred)) {
                fs.mkdirSync(preferred, { recursive: true });
            }
            chosen = preferred;
        }
        catch (e) {
            // fallback to project storage
            if (!fs.existsSync(fallback)) {
                try {
                    fs.mkdirSync(fallback, { recursive: true });
                }
                catch (e2) {
                    // last resort: use OS temp dir
                    chosen = path.join(process.cwd(), '.local-storage');
                    if (!fs.existsSync(chosen)) {
                        fs.mkdirSync(chosen, { recursive: true });
                    }
                }
            }
            else {
                // fallback exists
            }
            chosen = fs.existsSync(fallback) ? fallback : chosen;
        }
        this.localStorageDir = chosen;
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
FirebaseStorageBucketControl = __decorate([
    injectable(),
    __metadata("design:paramtypes", [])
], FirebaseStorageBucketControl);
export { FirebaseStorageBucketControl };
export { CloudHTTPv2, Logger, OutputServerEventStream, RPCReflect, };
export const loadModulesDynamically = (path) => {
    // Simplified implementation
    console.log(`Loading modules from ${path}`);
};
export const registry = {
    exportAll: () => ({}),
    exportGrouped: () => ({}),
    allHandsOnDeck: async () => { },
};
//# sourceMappingURL=index.js.map