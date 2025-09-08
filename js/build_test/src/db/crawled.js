var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var Crawled_1;
import { Also, parseJSONText, Prop } from 'civkit';
import { FirestoreRecord } from '../shared/lib/firestore.js';
let Crawled = class Crawled extends FirestoreRecord {
    static { Crawled_1 = this; }
    static { this.collectionName = 'crawled'; }
    static { this.patchedFields = [
        'snapshot'
    ]; }
    static from(input) {
        for (const field of this.patchedFields) {
            if (typeof input[field] === 'string') {
                input[field] = parseJSONText(input[field]);
            }
        }
        return super.from(input);
    }
    degradeForFireStore() {
        const copy = { ...this };
        for (const field of this.constructor.patchedFields) {
            if (typeof copy[field] === 'object') {
                copy[field] = JSON.stringify(copy[field]);
            }
        }
        return copy;
    }
};
__decorate([
    Prop({
        required: true
    }),
    __metadata("design:type", String)
], Crawled.prototype, "url", void 0);
__decorate([
    Prop({
        required: true
    }),
    __metadata("design:type", String)
], Crawled.prototype, "urlPathDigest", void 0);
__decorate([
    Prop(),
    __metadata("design:type", Object)
], Crawled.prototype, "snapshot", void 0);
__decorate([
    Prop(),
    __metadata("design:type", Boolean)
], Crawled.prototype, "screenshotAvailable", void 0);
__decorate([
    Prop(),
    __metadata("design:type", Boolean)
], Crawled.prototype, "pageshotAvailable", void 0);
__decorate([
    Prop(),
    __metadata("design:type", Boolean)
], Crawled.prototype, "snapshotAvailable", void 0);
__decorate([
    Prop(),
    __metadata("design:type", Date)
], Crawled.prototype, "createdAt", void 0);
__decorate([
    Prop(),
    __metadata("design:type", Date)
], Crawled.prototype, "expireAt", void 0);
Crawled = Crawled_1 = __decorate([
    Also({
        dictOf: Object
    })
], Crawled);
export { Crawled };
//# sourceMappingURL=crawled.js.map