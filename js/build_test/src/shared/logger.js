var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var Logger_1;
import { injectable } from 'tsyringe';
let Logger = Logger_1 = class Logger {
    constructor(name) {
        this.name = name;
    }
    info(message, ...args) {
        console.log(`[${this.name}] INFO:`, message, ...args);
    }
    warn(message, ...args) {
        console.warn(`[${this.name}] WARN:`, message, ...args);
    }
    error(message, ...args) {
        console.error(`[${this.name}] ERROR:`, message, ...args);
    }
    child(options) {
        return new Logger_1(`${this.name}:${options.service}`);
    }
};
Logger = Logger_1 = __decorate([
    injectable(),
    __metadata("design:paramtypes", [String])
], Logger);
export { Logger };
//# sourceMappingURL=logger.js.map