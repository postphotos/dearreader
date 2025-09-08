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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoIPService = exports.GeoIPCityResponse = exports.GeoIPCountryInfo = exports.GeoIPInfo = exports.GEOIP_SUPPORTED_LANGUAGES = void 0;
const tsyringe_1 = require("tsyringe");
const promises_1 = __importDefault(require("fs/promises"));
const maxmind_1 = require("maxmind");
const civkit_1 = require("civkit");
const index_js_1 = require("../shared/index.js");
const path_1 = __importDefault(require("path"));
var GEOIP_SUPPORTED_LANGUAGES;
(function (GEOIP_SUPPORTED_LANGUAGES) {
    GEOIP_SUPPORTED_LANGUAGES["EN"] = "en";
    GEOIP_SUPPORTED_LANGUAGES["ZH_CN"] = "zh-CN";
    GEOIP_SUPPORTED_LANGUAGES["JA"] = "ja";
    GEOIP_SUPPORTED_LANGUAGES["DE"] = "de";
    GEOIP_SUPPORTED_LANGUAGES["FR"] = "fr";
    GEOIP_SUPPORTED_LANGUAGES["ES"] = "es";
    GEOIP_SUPPORTED_LANGUAGES["PT_BR"] = "pt-BR";
    GEOIP_SUPPORTED_LANGUAGES["RU"] = "ru";
})(GEOIP_SUPPORTED_LANGUAGES || (exports.GEOIP_SUPPORTED_LANGUAGES = GEOIP_SUPPORTED_LANGUAGES = {}));
class GeoIPInfo extends civkit_1.AutoCastable {
}
exports.GeoIPInfo = GeoIPInfo;
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", String)
], GeoIPInfo.prototype, "code", void 0);
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", String)
], GeoIPInfo.prototype, "name", void 0);
class GeoIPCountryInfo extends GeoIPInfo {
}
exports.GeoIPCountryInfo = GeoIPCountryInfo;
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", Boolean)
], GeoIPCountryInfo.prototype, "eu", void 0);
class GeoIPCityResponse extends civkit_1.AutoCastable {
}
exports.GeoIPCityResponse = GeoIPCityResponse;
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", GeoIPInfo)
], GeoIPCityResponse.prototype, "continent", void 0);
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", GeoIPCountryInfo)
], GeoIPCityResponse.prototype, "country", void 0);
__decorate([
    (0, civkit_1.Prop)({
        arrayOf: GeoIPInfo
    }),
    __metadata("design:type", Array)
], GeoIPCityResponse.prototype, "subdivisions", void 0);
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", String)
], GeoIPCityResponse.prototype, "city", void 0);
__decorate([
    (0, civkit_1.Prop)({
        arrayOf: Number
    }),
    __metadata("design:type", Array)
], GeoIPCityResponse.prototype, "coordinates", void 0);
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", String)
], GeoIPCityResponse.prototype, "timezone", void 0);
let GeoIPService = class GeoIPService extends civkit_1.AsyncService {
    constructor() {
        super(...arguments);
        this.logger = new index_js_1.Logger('GeoIPService');
    }
    async init() {
        await this.dependencyReady();
        this.emit('ready');
    }
    async _lazyload() {
        const mmdpPath = path_1.default.resolve(__dirname, '..', '..', 'licensed', 'GeoLite2-City.mmdb');
        const dbBuff = await promises_1.default.readFile(mmdpPath, { flag: 'r', encoding: null });
        this.mmdbCity = new maxmind_1.Reader(dbBuff);
        this.logger.info(`Loaded GeoIP database, ${dbBuff.byteLength} bytes`);
    }
    async lookupCity(ip, lang = GEOIP_SUPPORTED_LANGUAGES.EN) {
        await this._lazyload();
        const r = this.mmdbCity.get(ip);
        if (!r) {
            return undefined;
        }
        return GeoIPCityResponse.from({
            continent: r.continent ? {
                code: r.continent?.code,
                name: r.continent?.names?.[lang] || r.continent?.names?.en,
            } : undefined,
            country: r.country ? {
                code: r.country?.iso_code,
                name: r.country?.names?.[lang] || r.country?.names.en,
                eu: r.country?.is_in_european_union,
            } : undefined,
            city: r.city?.names?.[lang] || r.city?.names?.en,
            subdivisions: r.subdivisions?.map((x) => ({
                code: x.iso_code,
                name: x.names?.[lang] || x.names?.en,
            })),
            coordinates: r.location ? [
                r.location.latitude, r.location.longitude, r.location.accuracy_radius
            ] : undefined,
            timezone: r.location?.time_zone,
        });
    }
};
exports.GeoIPService = GeoIPService;
__decorate([
    (0, civkit_1.runOnce)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GeoIPService.prototype, "_lazyload", null);
exports.GeoIPService = GeoIPService = __decorate([
    (0, tsyringe_1.singleton)(),
    __metadata("design:paramtypes", [])
], GeoIPService);
const instance = tsyringe_1.container.resolve(GeoIPService);
exports.default = instance;
//# sourceMappingURL=geoip.js.map