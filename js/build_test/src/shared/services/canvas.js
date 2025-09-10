var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { AsyncService } from 'civkit';
import { singleton } from 'tsyringe';
import { Logger } from '../logger.js';
let CanvasService = class CanvasService extends AsyncService {
    constructor() {
        super();
        this.logger = new Logger('CanvasService');
    }
    async init() {
        this.logger.info('CanvasService initialized');
        this.emit('ready');
    }
    async loadImage(url) {
        console.log(`Mock: Loading image from ${url}`);
        return { width: 1000, height: 1000 };
    }
    fitImageToSquareBox(img, size) {
        console.log(`Mock: Fitting image to square box of size ${size}`);
        return { width: size, height: size };
    }
    async canvasToBuffer(canvas, format) {
        console.log(`Mock: Converting canvas to buffer with format ${format}`);
        return Buffer.from('mock image data');
    }
};
CanvasService = __decorate([
    singleton(),
    __metadata("design:paramtypes", [])
], CanvasService);
export { CanvasService };
//# sourceMappingURL=canvas.js.map