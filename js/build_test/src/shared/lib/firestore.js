var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Prop } from 'civkit';
export class FirestoreRecord {
    static from(input) {
        const instance = new this();
        Object.assign(instance, input);
        return instance;
    }
    static async fromFirestore(id) {
        // Mock implementation
        console.log(`Fetching document with id ${id} from collection ${this.collectionName}`);
        return undefined;
    }
    static async fromFirestoreQuery(query) {
        // Mock implementation
        console.log(`Executing query on collection ${this.collectionName}`);
        return [];
    }
    static async save(data) {
        // Mock implementation
        console.log(`Saving data to collection ${this.collectionName}`);
    }
    degradeForFireStore() {
        // Default implementation
        return { ...this };
    }
    static { this.COLLECTION = {
        doc: (id) => ({
            set: (data, options) => {
                console.log(`Setting document ${id} in collection ${this.collectionName}`);
            }
        }),
        where: () => ({
            orderBy: () => ({
                limit: () => ({})
            })
        })
    }; }
}
__decorate([
    Prop(),
    __metadata("design:type", String)
], FirestoreRecord.prototype, "_id", void 0);
//# sourceMappingURL=firestore.js.map