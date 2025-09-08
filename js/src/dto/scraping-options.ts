import { Also, AutoCastable, Prop, AutoCastableMetaClass, Constructor } from 'civkit';
import type { Request } from 'express';
import type { CookieParam } from 'puppeteer';
import { parseString as parseSetCookieString } from 'set-cookie-parser';

@Also({
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
export class CrawlerOptions extends AutoCastable implements AutoCastableMetaClass {
    @Prop() url?: string;
    @Prop() html?: string;
    @Prop({ default: 'default' }) respondWith!: string;
    @Prop({ default: false }) withGeneratedAlt!: boolean;
    @Prop({ default: false }) withLinksSummary!: boolean;
    @Prop({ default: false }) withImagesSummary!: boolean;
    @Prop({ default: false }) noCache!: boolean;
    @Prop() cacheTolerance?: number;
    @Prop({ arrayOf: String }) targetSelector?: string | string[];
    @Prop({ arrayOf: String }) waitForSelector?: string | string[];
    @Prop({ arrayOf: String }) removeSelector?: string | string[];
    @Prop({ default: false }) keepImgDataUrl!: boolean;
    @Prop({ default: false }) withIframe!: boolean;
    @Prop({ arrayOf: String }) setCookies?: CookieParam[];
    @Prop() proxyUrl?: string;
    @Prop() userAgent?: string;
    @Prop({ validate: (v: number) => v > 0 && v <= 180, type: Number, nullable: true }) timeout?: number | null;
    @Prop({ type: Number, nullable: true }) viewportWidth?: number | null;
    @Prop({ type: Number, nullable: true }) viewportHeight?: number | null;
    @Prop({ default: false }) fullPage?: boolean;
    @Prop() pdfAction?: string;

    static override from<T extends CrawlerOptions>(this: Constructor<T>, input: any, ...args: any[]): T {
        const instance = super.from(input, ...args) as T;
        const req = args[0] as Request | undefined;

        if (req) {
            const getHeader = (name: string): string | undefined => {
                const value = req.headers[name.toLowerCase()];
                return Array.isArray(value) ? value[0] : value;
            };

            const customMode = getHeader('X-Respond-With') || getHeader('X-Return-Format');
            if (customMode) instance.respondWith = customMode;

            const withGeneratedAlt = getHeader('X-With-Generated-Alt');
            if (withGeneratedAlt !== undefined) instance.withGeneratedAlt = withGeneratedAlt.toLowerCase() === 'true';

            const keepImgDataUrl = getHeader('x-keep-img-data-url');
            if (keepImgDataUrl !== undefined) instance.keepImgDataUrl = Boolean(keepImgDataUrl);

            let timeoutSeconds = parseInt(getHeader('x-timeout') || '');
            if (!isNaN(timeoutSeconds) && timeoutSeconds > 0) instance.timeout = timeoutSeconds <= 180 ? timeoutSeconds : 180;
            else if (getHeader('x-timeout')) instance.timeout = null;

            // Viewport
            let viewportWidth = parseInt(getHeader('x-viewport-width') || '');
            if (!isNaN(viewportWidth) && viewportWidth > 0) instance.viewportWidth = viewportWidth;
            let viewportHeight = parseInt(getHeader('x-viewport-height') || '');
            if (!isNaN(viewportHeight) && viewportHeight > 0) instance.viewportHeight = viewportHeight;

            const fullPage = getHeader('x-full-page');
            if (fullPage !== undefined) instance.fullPage = fullPage.toLowerCase() === 'true';

            const pdfAction = getHeader('x-pdf-action');
            if (pdfAction) instance.pdfAction = pdfAction;

            const removeSelector = getHeader('x-remove-selector')?.split(', ');
            instance.removeSelector ??= removeSelector;

            const targetSelector = getHeader('x-target-selector')?.split(', ');
            instance.targetSelector ??= targetSelector;

            const waitForSelector = getHeader('x-wait-for-selector')?.split(', ');
            instance.waitForSelector ??= waitForSelector || instance.targetSelector;

            instance.targetSelector = filterSelector(instance.targetSelector);

            const overrideUserAgent = getHeader('x-user-agent');
            instance.userAgent ??= overrideUserAgent;

            const setCookieHeaders = getHeader('x-set-cookie')?.split(', ') || (instance.setCookies as any as string[]);
            const cookies: CookieParam[] = [];
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
                                sameSite: p.sameSite as any,
                                expires: typeof p.expires === 'number' ? p.expires : (p.expires instanceof Date ? Math.floor(p.expires.getTime() / 1000) : undefined),
                            });
                        }
                    } else if (parsed && typeof parsed === 'object') {
                        const p = parsed as any;
                        cookies.push({
                            name: p.name,
                            value: p.value,
                            url: p.url,
                            domain: p.domain,
                            path: p.path,
                            secure: p.secure,
                            httpOnly: p.httpOnly,
                            sameSite: p.sameSite as any,
                            expires: typeof p.expires === 'number' ? p.expires : (p.expires instanceof Date ? Math.floor(p.expires.getTime() / 1000) : undefined),
                        });
                    }
                }
            }
            if (cookies.length) instance.setCookies = cookies;

            const proxyUrl = getHeader('x-proxy-url');
            instance.proxyUrl ??= proxyUrl;

            if (instance.cacheTolerance) instance.cacheTolerance = instance.cacheTolerance * 1000;
        }

        return instance;
    }
}

export class CrawlerOptionsHeaderOnly extends CrawlerOptions {
    static override from<T extends CrawlerOptionsHeaderOnly>(this: Constructor<T>, ...args: any[]): T {
        const req = args[0] as Request;
        return super.from({}, req) as T;
    }
}

// Minimal helper kept local
function filterSelector(s?: string | string[]) {
    if (!s) return s;
    const sr = Array.isArray(s) ? s : [s];
    const selectors = sr.filter((i) => {
        const innerSelectors = i.split(',').map((s) => s.trim());
        const someViolation = innerSelectors.find((x) => x.startsWith('*') || x.startsWith(':') || x.includes('*:'));
        if (someViolation) return false;
        return true;
    });
    return selectors;
}
