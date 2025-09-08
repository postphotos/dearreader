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
exports.ImgAlt = void 0;
const civkit_1 = require("civkit");
const firestore_js_1 = require("../shared/lib/firestore.js");
let ImgAlt = class ImgAlt extends firestore_js_1.FirestoreRecord {
    static { this.collectionName = 'imgAlts'; }
};
exports.ImgAlt = ImgAlt;
__decorate([
    (0, civkit_1.Prop)({
        required: true
    }),
    __metadata("design:type", String)
], ImgAlt.prototype, "src", void 0);
__decorate([
    (0, civkit_1.Prop)({
        required: true
    }),
    __metadata("design:type", String)
], ImgAlt.prototype, "urlDigest", void 0);
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", Number)
], ImgAlt.prototype, "width", void 0);
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", Number)
], ImgAlt.prototype, "height", void 0);
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", String)
], ImgAlt.prototype, "generatedAlt", void 0);
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", String)
], ImgAlt.prototype, "originalAlt", void 0);
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", Date)
], ImgAlt.prototype, "createdAt", void 0);
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", Date)
], ImgAlt.prototype, "expireAt", void 0);
exports.ImgAlt = ImgAlt = __decorate([
    (0, civkit_1.Also)({
        dictOf: Object
    })
], ImgAlt);
//# sourceMappingURL=img-alt.js.map