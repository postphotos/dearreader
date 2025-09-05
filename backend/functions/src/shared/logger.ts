import { injectable } from 'tsyringe';

@injectable()
export class Logger {
    private name: string = 'DearReader';

    constructor(name?: string) {
        if (name) {
            this.name = name;
        }
    }

    info(message: string, ...args: any[]) {
        console.log(`[${this.name}] INFO:`, message, ...args);
    }

    warn(message: string, ...args: any[]) {
        console.warn(`[${this.name}] WARN:`, message, ...args);
    }

    error(message: string, ...args: any[]) {
        console.error(`[${this.name}] ERROR:`, message, ...args);
    }

    child(options: { service: string }) {
        const childLogger = new Logger();
        childLogger.name = `${this.name}:${options.service}`;
        return childLogger;
    }
}