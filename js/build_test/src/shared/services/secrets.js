"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretExposer = void 0;
const civkit_1 = require("civkit");
const tsyringe_1 = require("tsyringe");
const logger_js_1 = require("../logger.js");
let SecretExposer = class SecretExposer extends civkit_1.AsyncService {
    constructor() {
        super();
        this.logger = new logger_js_1.Logger("secrets");
        this.BRAVE_SEARCH_API_KEY = 'mock_brave_search_api_key';
    }
    async init() {
        // Mock initialization
        this.logger.info('SecretExposer initialized');
        this.emit('ready');
    }
};
exports.SecretExposer = SecretExposer;
exports.SecretExposer = SecretExposer = __decorate([
    (0, tsyringe_1.singleton)(),
    __metadata("design:paramtypes", [])
], SecretExposer);
//# sourceMappingURL=secrets.js.map