var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Also, AutoCastable, Prop } from 'civkit';
import { parseString as parseSetCookieString } from 'set-cookie-parser';
let CrawlerOptions = class CrawlerOptions extends AutoCastable {
    static from(input, ...args) {
        const instance = super.from(input, ...args);
        const req = args[0];
        if (req) {
            const getHeader = (name) => {
                const value = req.headers[name.toLowerCase()];
                return Array.isArray(value) ? value[0] : value;
            };
            const customMode = getHeader('X-Respond-With') || getHeader('X-Return-Format');
            if (customMode)
                instance.respondWith = customMode;
            const withGeneratedAlt = getHeader('X-With-Generated-Alt');
            if (withGeneratedAlt !== undefined)
                instance.withGeneratedAlt = withGeneratedAlt.toLowerCase() === 'true';
            const keepImgDataUrl = getHeader('x-keep-img-data-url');
            if (keepImgDataUrl !== undefined)
                instance.keepImgDataUrl = Boolean(keepImgDataUrl);
            let timeoutSeconds = parseInt(getHeader('x-timeout') || '');
            if (!isNaN(timeoutSeconds) && timeoutSeconds > 0)
                instance.timeout = timeoutSeconds <= 180 ? timeoutSeconds : 180;
            else if (getHeader('x-timeout'))
                instance.timeout = null;
            // Viewport
            let viewportWidth = parseInt(getHeader('x-viewport-width') || '');
            if (!isNaN(viewportWidth) && viewportWidth > 0)
                instance.viewportWidth = viewportWidth;
            let viewportHeight = parseInt(getHeader('x-viewport-height') || '');
            if (!isNaN(viewportHeight) && viewportHeight > 0)
                instance.viewportHeight = viewportHeight;
            const fullPage = getHeader('x-full-page');
            if (fullPage !== undefined)
                instance.fullPage = fullPage.toLowerCase() === 'true';
            const pdfAction = getHeader('x-pdf-action');
            if (pdfAction)
                instance.pdfAction = pdfAction;
            const removeSelector = getHeader('x-remove-selector')?.split(', ');
            instance.removeSelector ??= removeSelector;
            const targetSelector = getHeader('x-target-selector')?.split(', ');
            instance.targetSelector ??= targetSelector;
            const waitForSelector = getHeader('x-wait-for-selector')?.split(', ');
            instance.waitForSelector ??= waitForSelector || instance.targetSelector;
            instance.targetSelector = filterSelector(instance.targetSelector);
            const overrideUserAgent = getHeader('x-user-agent');
            instance.userAgent ??= overrideUserAgent;
            const setCookieHeaders = getHeader('x-set-cookie')?.split(', ') || instance.setCookies;
            const cookies = [];
            if (Array.isArray(setCookieHeaders)) {
                for (const setCookie of setCookieHeaders) {
                    const parsed = parseSetCookieString(setCookie, { decodeValues: false });
                    if (Array.isArray(parsed)) {
                        for (const p of parsed) {
                            cookies.push({
                                name: p.name,
                                value: p.value,
                                url: p.url,
                                domain: p.domain,
                                path: p.path,
                                secure: p.secure,
                                httpOnly: p.httpOnly,
                                sameSite: p.sameSite,
                                expires: typeof p.expires === 'number' ? p.expires : (p.expires instanceof Date ? Math.floor(p.expires.getTime() / 1000) : undefined),
                            });
                        }
                    }
                    else if (parsed && typeof parsed === 'object') {
                        const p = parsed;
                        cookies.push({
                            name: p.name,
                            value: p.value,
                            url: p.url,
                            domain: p.domain,
                            path: p.path,
                            secure: p.secure,
                            httpOnly: p.httpOnly,
                            sameSite: p.sameSite,
                            expires: typeof p.expires === 'number' ? p.expires : (p.expires instanceof Date ? Math.floor(p.expires.getTime() / 1000) : undefined),
                        });
                    }
                }
            }
            if (cookies.length)
                instance.setCookies = cookies;
            const proxyUrl = getHeader('x-proxy-url');
            instance.proxyUrl ??= proxyUrl;
            if (instance.cacheTolerance)
                instance.cacheTolerance = instance.cacheTolerance * 1000;
        }
        return instance;
    }
};
__decorate([
    Prop(),
    __metadata("design:type", String)
], CrawlerOptions.prototype, "url", void 0);
__decorate([
    Prop(),
    __metadata("design:type", String)
], CrawlerOptions.prototype, "html", void 0);
__decorate([
    Prop({ default: 'default' }),
    __metadata("design:type", String)
], CrawlerOptions.prototype, "respondWith", void 0);
__decorate([
    Prop({ default: false }),
    __metadata("design:type", Boolean)
], CrawlerOptions.prototype, "withGeneratedAlt", void 0);
__decorate([
    Prop({ default: false }),
    __metadata("design:type", Boolean)
], CrawlerOptions.prototype, "withLinksSummary", void 0);
__decorate([
    Prop({ default: false }),
    __metadata("design:type", Boolean)
], CrawlerOptions.prototype, "withImagesSummary", void 0);
__decorate([
    Prop({ default: false }),
    __metadata("design:type", Boolean)
], CrawlerOptions.prototype, "noCache", void 0);
__decorate([
    Prop(),
    __metadata("design:type", Number)
], CrawlerOptions.prototype, "cacheTolerance", void 0);
__decorate([
    Prop({ arrayOf: String }),
    __metadata("design:type", Object)
], CrawlerOptions.prototype, "targetSelector", void 0);
__decorate([
    Prop({ arrayOf: String }),
    __metadata("design:type", Object)
], CrawlerOptions.prototype, "waitForSelector", void 0);
__decorate([
    Prop({ arrayOf: String }),
    __metadata("design:type", Object)
], CrawlerOptions.prototype, "removeSelector", void 0);
__decorate([
    Prop({ default: false }),
    __metadata("design:type", Boolean)
], CrawlerOptions.prototype, "keepImgDataUrl", void 0);
__decorate([
    Prop({ default: false }),
    __metadata("design:type", Boolean)
], CrawlerOptions.prototype, "withIframe", void 0);
__decorate([
    Prop({ arrayOf: String }),
    __metadata("design:type", Array)
], CrawlerOptions.prototype, "setCookies", void 0);
__decorate([
    Prop(),
    __metadata("design:type", String)
], CrawlerOptions.prototype, "proxyUrl", void 0);
__decorate([
    Prop(),
    __metadata("design:type", String)
], CrawlerOptions.prototype, "userAgent", void 0);
__decorate([
    Prop({ validate: (v) => v > 0 && v <= 180, type: Number, nullable: true }),
    __metadata("design:type", Number)
], CrawlerOptions.prototype, "timeout", void 0);
__decorate([
    Prop({ type: Number, nullable: true }),
    __metadata("design:type", Number)
], CrawlerOptions.prototype, "viewportWidth", void 0);
__decorate([
    Prop({ type: Number, nullable: true }),
    __metadata("design:type", Number)
], CrawlerOptions.prototype, "viewportHeight", void 0);
__decorate([
    Prop({ default: false }),
    __metadata("design:type", Boolean)
], CrawlerOptions.prototype, "fullPage", void 0);
__decorate([
    Prop(),
    __metadata("design:type", String)
], CrawlerOptions.prototype, "pdfAction", void 0);
CrawlerOptions = __decorate([
    Also({
        openapi: {
            operation: {
                parameters: {
                    'Accept': { description: 'Preferred response format', in: 'header', schema: { type: 'string' } },
                    'X-Respond-With': { description: 'Preferred response form (markdown|html|text|pageshot|screenshot)', in: 'header', schema: { type: 'string' } },
                    'X-Wait-For-Selector': { description: 'CSS selector to wait for', in: 'header', schema: { type: 'string' } },
                    'X-Target-Selector': { description: 'CSS selector to extract only', in: 'header', schema: { type: 'string' } },
                    'X-Remove-Selector': { description: 'CSS selector to remove from output', in: 'header', schema: { type: 'string' } },
                    'X-Proxy-Url': { description: 'Proxy URL for browsing', in: 'header', schema: { type: 'string' } },
                    'X-Set-Cookie': { description: 'Set-Cookie header(s) for the browser', in: 'header', schema: { type: 'string' } },
                    'X-Viewport-Width': { description: 'Viewport width in pixels', in: 'header', schema: { type: 'string' } },
                    'X-Viewport-Height': { description: 'Viewport height in pixels', in: 'header', schema: { type: 'string' } },
                    'X-Full-Page': { description: 'Capture full page (true|false)', in: 'header', schema: { type: 'string' } },
                    'X-PDF-Action': { description: 'PDF-specific action', in: 'header', schema: { type: 'string' } },
                    'X-Timeout': { description: 'Timeout in seconds (max 180)', in: 'header', schema: { type: 'string' } }
                }
            }
        }
    })
], CrawlerOptions);
export { CrawlerOptions };
export class CrawlerOptionsHeaderOnly extends CrawlerOptions {
    static from(...args) {
        const req = args[0];
        return super.from({}, req);
    }
}
// Minimal helper kept local
function filterSelector(s) {
    if (!s)
        return s;
    const sr = Array.isArray(s) ? s : [s];
    const selectors = sr.filter((i) => {
        const innerSelectors = i.split(',').map((s) => s.trim());
        const someViolation = innerSelectors.find((x) => x.startsWith('*') || x.startsWith(':') || x.includes('*:'));
        if (someViolation)
            return false;
        return true;
    });
    return selectors;
}
//# sourceMappingURL=scraping-options.js.map