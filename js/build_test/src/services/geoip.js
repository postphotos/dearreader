
// Polyfill for DOMMatrix (needed for pdfjs-dist)
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    constructor(init) {
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;
      if (typeof init === 'string') {
        // ignore matrix string
      }
      else if (Array.isArray(init)) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init.concat([1, 0, 0, 1, 0, 0]).slice(0, 6);
      }
      else if (init && typeof init === 'object') {
        Object.assign(this, init);
      }
    }
    multiply() { return this; }
    multiplySelf() { return this; }
    translateSelf() { return this; }
    scaleSelf() { return this; }
    toString() { return '' + this.a + ',' + this.b + ',' + this.c + ',' + this.d + ',' + this.e + ',' + this.f; }
  }
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}

// Polyfill for Promise.withResolvers (Node.js 18+)
if (typeof globalThis.Promise.withResolvers === 'undefined') {
  globalThis.Promise.withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};
import { container, singleton } from "tsyringe";
import fsp from "fs/promises";
import { Reader } from "maxmind";
import { AsyncService, AutoCastable, Prop, runOnce } from "civkit";
import { Logger } from "../shared/index.js";
import path from "path";
var GEOIP_SUPPORTED_LANGUAGES = /* @__PURE__ */ ((GEOIP_SUPPORTED_LANGUAGES2) => {
  GEOIP_SUPPORTED_LANGUAGES2["EN"] = "en";
  GEOIP_SUPPORTED_LANGUAGES2["ZH_CN"] = "zh-CN";
  GEOIP_SUPPORTED_LANGUAGES2["JA"] = "ja";
  GEOIP_SUPPORTED_LANGUAGES2["DE"] = "de";
  GEOIP_SUPPORTED_LANGUAGES2["FR"] = "fr";
  GEOIP_SUPPORTED_LANGUAGES2["ES"] = "es";
  GEOIP_SUPPORTED_LANGUAGES2["PT_BR"] = "pt-BR";
  GEOIP_SUPPORTED_LANGUAGES2["RU"] = "ru";
  return GEOIP_SUPPORTED_LANGUAGES2;
})(GEOIP_SUPPORTED_LANGUAGES || {});
class GeoIPInfo extends AutoCastable {
}
__decorateClass([
  Prop()
], GeoIPInfo.prototype, "code", 2);
__decorateClass([
  Prop()
], GeoIPInfo.prototype, "name", 2);
class GeoIPCountryInfo extends GeoIPInfo {
}
__decorateClass([
  Prop()
], GeoIPCountryInfo.prototype, "eu", 2);
class GeoIPCityResponse extends AutoCastable {
}
__decorateClass([
  Prop()
], GeoIPCityResponse.prototype, "continent", 2);
__decorateClass([
  Prop()
], GeoIPCityResponse.prototype, "country", 2);
__decorateClass([
  Prop({
    arrayOf: GeoIPInfo
  })
], GeoIPCityResponse.prototype, "subdivisions", 2);
__decorateClass([
  Prop()
], GeoIPCityResponse.prototype, "city", 2);
__decorateClass([
  Prop({
    arrayOf: Number
  })
], GeoIPCityResponse.prototype, "coordinates", 2);
__decorateClass([
  Prop()
], GeoIPCityResponse.prototype, "timezone", 2);
let GeoIPService = class extends AsyncService {
  constructor() {
    super(...arguments);
    this.logger = new Logger("GeoIPService");
  }
  async init() {
    await this.dependencyReady();
    this.emit("ready");
  }
  async _lazyload() {
    const mmdpPath = path.resolve(__dirname, "..", "..", "licensed", "GeoLite2-City.mmdb");
    const dbBuff = await fsp.readFile(mmdpPath, { flag: "r", encoding: null });
    this.mmdbCity = new Reader(dbBuff);
    this.logger.info(`Loaded GeoIP database, ${dbBuff.byteLength} bytes`);
  }
  async lookupCity(ip, lang = "en" /* EN */) {
    await this._lazyload();
    const r = this.mmdbCity.get(ip);
    if (!r) {
      return void 0;
    }
    return GeoIPCityResponse.from({
      continent: r.continent ? {
        code: r.continent?.code,
        name: r.continent?.names?.[lang] || r.continent?.names?.en
      } : void 0,
      country: r.country ? {
        code: r.country?.iso_code,
        name: r.country?.names?.[lang] || r.country?.names.en,
        eu: r.country?.is_in_european_union
      } : void 0,
      city: r.city?.names?.[lang] || r.city?.names?.en,
      subdivisions: r.subdivisions?.map((x) => ({
        code: x.iso_code,
        name: x.names?.[lang] || x.names?.en
      })),
      coordinates: r.location ? [
        r.location.latitude,
        r.location.longitude,
        r.location.accuracy_radius
      ] : void 0,
      timezone: r.location?.time_zone
    });
  }
};
__decorateClass([
  runOnce()
], GeoIPService.prototype, "_lazyload", 1);
GeoIPService = __decorateClass([
  singleton()
], GeoIPService);
const instance = container.resolve(GeoIPService);
var geoip_default = instance;
export {
  GEOIP_SUPPORTED_LANGUAGES,
  GeoIPCityResponse,
  GeoIPCountryInfo,
  GeoIPInfo,
  GeoIPService,
  geoip_default as default
};
//# sourceMappingURL=geoip.js.map
