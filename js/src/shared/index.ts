import { CloudHTTPv2 } from './decorators.js';
import type { Ctx } from './types.js';
import { Logger } from './logger.js';
import { OutputServerEventStream } from './output-stream.js';
import { RPCReflect } from './rpc-reflect.js';
import { injectable } from 'tsyringe';
import * as fs from 'fs';
import * as path from 'path';

@injectable()
export class AsyncContext {
    private storage: Map<string, any> = new Map();
    set(key: string, value: any) {
        this.storage.set(key, value);
    }

    get(key: string): any {
        return this.storage.get(key);
    }
}

export class InsufficientBalanceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InsufficientBalanceError';
    }
}

export function Param(name: string, options?: any): ParameterDecorator {
    return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
        // Implementation details would go here
    };
}

@injectable()
export class FirebaseStorageBucketControl {
    private localStorageDir: string;

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
        } catch (e) {
            // fallback to project storage
            if (!fs.existsSync(fallback)) {
                try {
                    fs.mkdirSync(fallback, { recursive: true });
                } catch (e2) {
                    // last resort: use OS temp dir
                    chosen = path.join(process.cwd(), '.local-storage');
                    if (!fs.existsSync(chosen)) {
                        fs.mkdirSync(chosen, { recursive: true });
                    }
                }
            } else {
                // fallback exists
            }
            chosen = fs.existsSync(fallback) ? fallback : chosen;
        }
        this.localStorageDir = chosen;
    }

    async uploadFile(filePath: string, destination: string): Promise<string> {
        const destPath = path.join(this.localStorageDir, destination);
        await fs.promises.copyFile(filePath, destPath);
        return `file://${destPath}`;
    }

    async downloadFile(filePath: string, destination: string): Promise<void> {
        const sourcePath = path.join(this.localStorageDir, filePath);
        await fs.promises.copyFile(sourcePath, destination);
    }

    async deleteFile(filePath: string): Promise<void> {
        const fullPath = path.join(this.localStorageDir, filePath);
        await fs.promises.unlink(fullPath);
    }

    async fileExists(filePath: string): Promise<boolean> {
        const fullPath = path.join(this.localStorageDir, filePath);
        return fs.existsSync(fullPath);
    }

    async saveFile(filePath: string, content: Buffer, options?: any): Promise<void> {
        const fullPath = path.join(this.localStorageDir, filePath);
        await fs.promises.writeFile(fullPath, new Uint8Array(content));
    }

    async signDownloadUrl(filePath: string, expirationTime: number): Promise<string> {
        const fullPath = path.join(this.localStorageDir, filePath);
        return `file://${fullPath}`;
    }
}

export {
    CloudHTTPv2,
    Ctx,
    Logger,
    OutputServerEventStream,
    RPCReflect,
};

export const loadModulesDynamically = (path: string) => {
    // Simplified implementation
    console.log(`Loading modules from ${path}`);
};

export const registry = {
    exportAll: () => ({}),
    exportGrouped: () => ({}),
    allHandsOnDeck: async () => {},
};
