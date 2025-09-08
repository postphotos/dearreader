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
exports.CrawlerOptionsHeaderOnly = exports.CrawlerOptions = void 0;
const civkit_1 = require("civkit"); // Adjust the import based on where your decorators are defined
const set_cookie_parser_1 = require("set-cookie-parser");
let CrawlerOptions = class CrawlerOptions extends civkit_1.AutoCastable {
    static from(input, ...args) {
        const instance = super.from(input, ...args);
        const req = args[0];
        if (req) {
            console.log('Request headers:', req.headers);
            const getHeader = (name) => {
                const value = req.headers[name.toLowerCase()];
                return Array.isArray(value) ? value[0] : value;
            };
            const customMode = getHeader('X-Respond-With') || getHeader('X-Return-Format');
            if (customMode) {
                instance.respondWith = customMode;
            }
            const withGeneratedAlt = getHeader('X-With-Generated-Alt');
            if (withGeneratedAlt !== undefined) {
                instance.withGeneratedAlt = withGeneratedAlt.toLowerCase() === 'true';
            }
            const withLinksSummary = getHeader('x-with-links-summary');
            if (withLinksSummary !== undefined) {
                instance.withLinksSummary = Boolean(withLinksSummary);
            }
            const withImagesSummary = getHeader('x-with-images-summary');
            if (withImagesSummary !== undefined) {
                instance.withImagesSummary = Boolean(withImagesSummary);
            }
            const noCache = getHeader('x-no-cache');
            if (noCache !== undefined) {
                instance.noCache = Boolean(noCache);
            }
            if (instance.noCache && instance.cacheTolerance === undefined) {
                instance.cacheTolerance = 0;
            }
            let cacheTolerance = parseInt(getHeader('x-cache-tolerance') || '');
            if (!isNaN(cacheTolerance)) {
                instance.cacheTolerance = cacheTolerance;
            }
            let timeoutSeconds = parseInt(getHeader('x-timeout') || '');
            if (!isNaN(timeoutSeconds) && timeoutSeconds > 0) {
                instance.timeout = timeoutSeconds <= 180 ? timeoutSeconds : 180;
            }
            else if (getHeader('x-timeout')) {
                instance.timeout = null;
            }
            const removeSelector = getHeader('x-remove-selector')?.split(', ');
            instance.removeSelector ??= removeSelector;
            const targetSelector = getHeader('x-target-selector')?.split(', ');
            instance.targetSelector ??= targetSelector;
            const waitForSelector = getHeader('x-wait-for-selector')?.split(', ');
            instance.waitForSelector ??= waitForSelector || instance.targetSelector;
            instance.targetSelector = filterSelector(instance.targetSelector);
            const overrideUserAgent = getHeader('x-user-agent');
            instance.userAgent ??= overrideUserAgent;
            const keepImgDataUrl = getHeader('x-keep-img-data-url');
            if (keepImgDataUrl !== undefined) {
                instance.keepImgDataUrl = Boolean(keepImgDataUrl);
            }
            const withIframe = getHeader('x-with-iframe');
            if (withIframe !== undefined) {
                instance.withIframe = Boolean(withIframe);
            }
            if (instance.withIframe) {
                instance.timeout ??= null;
            }
            const cookies = [];
            const setCookieHeaders = getHeader('x-set-cookie')?.split(', ') || instance.setCookies;
            if (Array.isArray(setCookieHeaders)) {
                for (const setCookie of setCookieHeaders) {
                    cookies.push({
                        ...(0, set_cookie_parser_1.parseString)(setCookie, { decodeValues: false }),
                    });
                }
            }
            else if (setCookieHeaders && typeof setCookieHeaders === 'string') {
                cookies.push({
                    ...(0, set_cookie_parser_1.parseString)(setCookieHeaders, { decodeValues: false }),
                });
            }
            const proxyUrl = getHeader('x-proxy-url');
            instance.proxyUrl ??= proxyUrl;
            if (instance.cacheTolerance) {
                instance.cacheTolerance = instance.cacheTolerance * 1000;
            }
        }
        return instance;
    }
};
exports.CrawlerOptions = CrawlerOptions;
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", String)
], CrawlerOptions.prototype, "url", void 0);
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", String)
], CrawlerOptions.prototype, "html", void 0);
__decorate([
    (0, civkit_1.Prop)({
        default: 'default',
    }),
    __metadata("design:type", String)
], CrawlerOptions.prototype, "respondWith", void 0);
__decorate([
    (0, civkit_1.Prop)({
        default: false,
    }),
    __metadata("design:type", Boolean)
], CrawlerOptions.prototype, "withGeneratedAlt", void 0);
__decorate([
    (0, civkit_1.Prop)({
        default: false,
    }),
    __metadata("design:type", Boolean)
], CrawlerOptions.prototype, "withLinksSummary", void 0);
__decorate([
    (0, civkit_1.Prop)({
        default: false,
    }),
    __metadata("design:type", Boolean)
], CrawlerOptions.prototype, "withImagesSummary", void 0);
__decorate([
    (0, civkit_1.Prop)({
        default: false,
    }),
    __metadata("design:type", Boolean)
], CrawlerOptions.prototype, "noCache", void 0);
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", Number)
], CrawlerOptions.prototype, "cacheTolerance", void 0);
__decorate([
    (0, civkit_1.Prop)({ arrayOf: String }),
    __metadata("design:type", Object)
], CrawlerOptions.prototype, "targetSelector", void 0);
__decorate([
    (0, civkit_1.Prop)({ arrayOf: String }),
    __metadata("design:type", Object)
], CrawlerOptions.prototype, "waitForSelector", void 0);
__decorate([
    (0, civkit_1.Prop)({ arrayOf: String }),
    __metadata("design:type", Object)
], CrawlerOptions.prototype, "removeSelector", void 0);
__decorate([
    (0, civkit_1.Prop)({
        default: false,
    }),
    __metadata("design:type", Boolean)
], CrawlerOptions.prototype, "keepImgDataUrl", void 0);
__decorate([
    (0, civkit_1.Prop)({
        default: false,
    }),
    __metadata("design:type", Boolean)
], CrawlerOptions.prototype, "withIframe", void 0);
__decorate([
    (0, civkit_1.Prop)({
        arrayOf: String,
    }),
    __metadata("design:type", Array)
], CrawlerOptions.prototype, "setCookies", void 0);
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", String)
], CrawlerOptions.prototype, "proxyUrl", void 0);
__decorate([
    (0, civkit_1.Prop)(),
    __metadata("design:type", String)
], CrawlerOptions.prototype, "userAgent", void 0);
__decorate([
    (0, civkit_1.Prop)({
        validate: (v) => v > 0 && v <= 180,
        type: Number,
        nullable: true,
    }),
    __metadata("design:type", Number)
], CrawlerOptions.prototype, "timeout", void 0);
exports.CrawlerOptions = CrawlerOptions = __decorate([
    (0, civkit_1.Also)({
        openapi: {
            operation: {
                parameters: {
                    'Accept': {
                        description: `Specifies your preference for the response format.\n\n` +
                            `Supported formats: \n` +
                            `- text/event-stream\n` +
                            `- application/json or text/json\n` +
                            `- text/plain`,
                        in: 'header',
                        schema: { type: 'string' }
                    },
                    'X-Cache-Tolerance': {
                        description: `Sets internal cache tolerance in seconds if this header is specified with a integer.`,
                        in: 'header',
                        schema: { type: 'string' }
                    },
                    'X-No-Cache': {
                        description: `Ignores internal cache if this header is specified with a value.\n\nEquivalent to X-Cache-Tolerance: 0`,
                        in: 'header',
                        schema: { type: 'string' }
                    },
                    'X-Respond-With': {
                        description: `Specifies the (non-default) form factor of the crawled data you prefer.\n\n` +
                            `Supported formats: \n` +
                            `- markdown\n` +
                            `- html\n` +
                            `- text\n` +
                            `- pageshot\n` +
                            `- screenshot\n`,
                        in: 'header',
                        schema: { type: 'string' }
                    },
                    'X-Wait-For-Selector': {
                        description: `Specifies a CSS selector to wait for the appearance of such an element before returning.\n\n` +
                            'Example: `X-Wait-For-Selector: .content-block`\n',
                        in: 'header',
                        schema: { type: 'string' }
                    },
                    'X-Target-Selector': {
                        description: `Specifies a CSS selector for return target instead of the full html.\n\n` +
                            'Implies `X-Wait-For-Selector: (same selector)`',
                        in: 'header',
                        schema: { type: 'string' }
                    },
                    'X-Remove-Selector': {
                        description: `Specifies a CSS selector to remove elements from the full html.\n\n` +
                            'Example `X-Remove-Selector: nav`',
                        in: 'header',
                        schema: { type: 'string' }
                    },
                    'X-Keep-Img-Data-Url': {
                        description: `Keep data-url as it instead of transforming them to object-url. (Only applicable when targeting markdown format)\n\n` +
                            'Example `X-Keep-Img-Data-Url: true`',
                        in: 'header',
                        schema: { type: 'string' }
                    },
                    'X-Proxy-Url': {
                        description: `Specifies your custom proxy if you prefer to use one.\n\n` +
                            `Supported protocols: \n` +
                            `- http\n` +
                            `- https\n` +
                            `- socks4\n` +
                            `- socks5\n\n` +
                            `For authentication, https://user:pass@host:port`,
                        in: 'header',
                        schema: { type: 'string' }
                    },
                    'X-Set-Cookie': {
                        description: `Sets cookie(s) to the headless browser for your request. \n\n` +
                            `Syntax is the same with standard Set-Cookie`,
                        in: 'header',
                        schema: { type: 'string' }
                    },
                    'X-With-Generated-Alt': {
                        description: `Enable automatic alt-text generating for images without an meaningful alt-text.\n\n` +
                            `Note: Does not work when \`X-Respond-With\` is specified`,
                        in: 'header',
                        schema: { type: 'string' }
                    },
                    'X-With-Images-Summary': {
                        description: `Enable dedicated summary section for images on the page.`,
                        in: 'header',
                        schema: { type: 'string' }
                    },
                    'X-With-links-Summary': {
                        description: `Enable dedicated summary section for hyper links on the page.`,
                        in: 'header',
                        schema: { type: 'string' }
                    },
                    'X-User-Agent': {
                        description: `Override User-Agent.`,
                        in: 'header',
                        schema: { type: 'string' }
                    },
                    'X-Timeout': {
                        description: `Specify timeout in seconds. Max 180.`,
                        in: 'header',
                        schema: { type: 'string' }
                    },
                }
            }
        }
    })
], CrawlerOptions);
class CrawlerOptionsHeaderOnly extends CrawlerOptions {
    static from(...args) {
        const req = args[0];
        return super.from({}, req);
    }
}
exports.CrawlerOptionsHeaderOnly = CrawlerOptionsHeaderOnly;
function filterSelector(s) {
    if (!s) {
        return s;
    }
    const sr = Array.isArray(s) ? s : [s];
    const selectors = sr.filter((i) => {
        const innerSelectors = i.split(',').map((s) => s.trim());
        const someViolation = innerSelectors.find((x) => x.startsWith('*') || x.startsWith(':') || x.includes('*:'));
        if (someViolation) {
            return false;
        }
        return true;
    });
    return selectors;
}
;
//# sourceMappingURL=scrapping-options.js.map