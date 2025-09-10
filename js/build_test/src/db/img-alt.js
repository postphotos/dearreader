var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Also, Prop } from 'civkit';
import { FirestoreRecord } from '../shared/lib/firestore.js';
let ImgAlt = class ImgAlt extends FirestoreRecord {
    static { this.collectionName = 'imgAlts'; }
};
__decorate([
    Prop({
        required: true
    }),
    __metadata("design:type", String)
], ImgAlt.prototype, "src", void 0);
__decorate([
    Prop({
        required: true
    }),
    __metadata("design:type", String)
], ImgAlt.prototype, "urlDigest", void 0);
__decorate([
    Prop(),
    __metadata("design:type", Number)
], ImgAlt.prototype, "width", void 0);
__decorate([
    Prop(),
    __metadata("design:type", Number)
], ImgAlt.prototype, "height", void 0);
__decorate([
    Prop(),
    __metadata("design:type", String)
], ImgAlt.prototype, "generatedAlt", void 0);
__decorate([
    Prop(),
    __metadata("design:type", String)
], ImgAlt.prototype, "originalAlt", void 0);
__decorate([
    Prop(),
    __metadata("design:type", Date)
], ImgAlt.prototype, "createdAt", void 0);
__decorate([
    Prop(),
    __metadata("design:type", Date)
], ImgAlt.prototype, "expireAt", void 0);
ImgAlt = __decorate([
    Also({
        dictOf: Object
    })
], ImgAlt);
export { ImgAlt };
//# sourceMappingURL=img-alt.js.map