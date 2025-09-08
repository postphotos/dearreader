var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { container, singleton } from 'tsyringe';
import { AsyncService, marshalErrorLike } from 'civkit';
import { Logger } from '../shared/index.js';
import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';
const virtualConsole = new VirtualConsole();
virtualConsole.on('error', () => void 0);
let JSDomControl = class JSDomControl extends AsyncService {
    constructor() {
        super(...arguments);
        this.logger = new Logger('CHANGE_LOGGER_NAME');
    }
    async init() {
        await this.dependencyReady();
        this.emit('ready');
    }
    narrowSnapshot(snapshot, options) {
        if (snapshot?.parsed && !options?.targetSelector && !options?.removeSelector && !options?.withIframe) {
            return snapshot;
        }
        if (!snapshot?.html) {
            return snapshot;
        }
        const t0 = Date.now();
        const jsdom = new JSDOM(snapshot.html, { url: snapshot.href, virtualConsole });
        const allNodes = [];
        jsdom.window.document.querySelectorAll('svg').forEach((x) => x.innerHTML = '');
        if (options?.withIframe) {
            jsdom.window.document.querySelectorAll('iframe[src],frame[src]').forEach((x) => {
                const src = x.getAttribute('src');
                const thisSnapshot = snapshot.childFrames?.find((f) => f.href === src);
                if (thisSnapshot?.html) {
                    x.innerHTML = thisSnapshot.html;
                    x.querySelectorAll('script, style').forEach((s) => s.remove());
                    x.querySelectorAll('[src]').forEach((el) => {
                        el.setAttribute('src', new URL(el.getAttribute('src'), src).toString());
                    });
                    x.querySelectorAll('[href]').forEach((el) => {
                        el.setAttribute('href', new URL(el.getAttribute('href'), src).toString());
                    });
                }
            });
        }
        if (Array.isArray(options?.removeSelector)) {
            for (const rl of options.removeSelector) {
                jsdom.window.document.querySelectorAll(rl).forEach((x) => x.remove());
            }
        }
        else if (options?.removeSelector) {
            jsdom.window.document.querySelectorAll(options.removeSelector).forEach((x) => x.remove());
        }
        if (Array.isArray(options?.targetSelector)) {
            for (const x of options.targetSelector.map((x) => jsdom.window.document.querySelectorAll(x))) {
                x.forEach((el) => {
                    if (!allNodes.includes(el)) {
                        allNodes.push(el);
                    }
                });
            }
        }
        else if (options?.targetSelector) {
            jsdom.window.document.querySelectorAll(options.targetSelector).forEach((el) => {
                if (!allNodes.includes(el)) {
                    allNodes.push(el);
                }
            });
        }
        else {
            allNodes.push(jsdom.window.document.documentElement);
        }
        if (!allNodes.length) {
            return snapshot;
        }
        const textChunks = [];
        let rootDoc;
        if (allNodes.length === 1 && allNodes[0].nodeName === 'HTML') {
            rootDoc = allNodes[0].ownerDocument;
            if (rootDoc.body.textContent) {
                textChunks.push(rootDoc.body.textContent);
            }
        }
        else {
            rootDoc = new JSDOM('', { url: snapshot.href, virtualConsole }).window.document;
            for (const n of allNodes) {
                rootDoc.body.appendChild(n);
                rootDoc.body.appendChild(rootDoc.createTextNode('\n\n'));
                if (n.textContent) {
                    textChunks.push(n.textContent);
                }
            }
        }
        let parsed;
        try {
            parsed = new Readability(rootDoc.cloneNode(true)).parse();
        }
        catch (err) {
            this.logger.warn(`Failed to parse selected element`, { err: marshalErrorLike(err) });
        }
        // No innerText in jsdom
        // https://github.com/jsdom/jsdom/issues/1245
        const textContent = textChunks.join('\n\n');
        const cleanedText = textContent?.split('\n').map((x) => x.trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n');
        const imageTags = Array.from(rootDoc.querySelectorAll('img[src],img[data-src]'))
            .map((x) => [x.getAttribute('src'), x.getAttribute('data-src')])
            .flat()
            .map((x) => {
            try {
                return new URL(x, snapshot.rebase || snapshot.href).toString();
            }
            catch (err) {
                return null;
            }
        })
            .filter(Boolean);
        const imageSet = new Set(imageTags);
        const r = {
            ...snapshot,
            title: snapshot.title || jsdom.window.document.title,
            parsed,
            html: rootDoc.documentElement.outerHTML,
            text: cleanedText,
            imgs: snapshot.imgs?.filter((x) => imageSet.has(x.src)) || [],
        };
        const dt = Date.now() - t0;
        if (dt > 1000) {
            this.logger.warn(`Performance issue: Narrowing snapshot took ${dt}ms`, { url: snapshot.href, dt });
        }
        return r;
    }
    inferSnapshot(snapshot) {
        const t0 = Date.now();
        const extendedSnapshot = { ...snapshot };
        try {
            const jsdom = new JSDOM(snapshot.html, { url: snapshot.href, virtualConsole });
            jsdom.window.document.querySelectorAll('svg').forEach((x) => x.innerHTML = '');
            const links = Array.from(jsdom.window.document.querySelectorAll('a[href]'))
                .map((x) => [x.getAttribute('href'), x.textContent.replace(/\s+/g, ' ').trim()])
                .map(([href, text]) => {
                if (!text) {
                    return undefined;
                }
                try {
                    const parsed = new URL(href, snapshot.rebase || snapshot.href);
                    if (parsed.protocol === 'file:' || parsed.protocol === 'javascript:') {
                        return undefined;
                    }
                    return [parsed.toString(), text];
                }
                catch (err) {
                    return undefined;
                }
            })
                .filter(Boolean)
                .reduce((acc, pair) => {
                acc[pair[0]] = pair[1];
                return acc;
            }, {});
            extendedSnapshot.links = links;
            const imgs = Array.from(jsdom.window.document.querySelectorAll('img[src],img[data-src]'))
                .map((x) => {
                let linkPreferredSrc = x.getAttribute('src') || '';
                if (linkPreferredSrc.startsWith('data:')) {
                    const dataSrc = x.getAttribute('data-src') || '';
                    if (dataSrc && !dataSrc.startsWith('data:')) {
                        linkPreferredSrc = dataSrc;
                    }
                }
                return {
                    src: new URL(linkPreferredSrc, snapshot.rebase || snapshot.href).toString(),
                    width: parseInt(x.getAttribute('width') || '0'),
                    height: parseInt(x.getAttribute('height') || '0'),
                    alt: x.getAttribute('alt') || x.getAttribute('title'),
                };
            });
            extendedSnapshot.imgs = imgs;
        }
        catch (_err) {
            void 0;
        }
        const dt = Date.now() - t0;
        if (dt > 1000) {
            this.logger.warn(`Performance issue: Inferring snapshot took ${dt}ms`, { url: snapshot.href, dt });
        }
        return extendedSnapshot;
    }
    snippetToElement(snippet, url) {
        const parsed = new JSDOM(snippet || '', { url, virtualConsole });
        return parsed.window.document.documentElement;
    }
    runTurndown(turndownService, html) {
        const t0 = Date.now();
        try {
            return turndownService.turndown(html);
        }
        finally {
            const dt = Date.now() - t0;
            if (dt > 1000) {
                this.logger.warn(`Performance issue: Turndown took ${dt}ms`, { dt });
            }
        }
    }
};
JSDomControl = __decorate([
    singleton(),
    __metadata("design:paramtypes", [])
], JSDomControl);
export { JSDomControl };
const jsdomControl = container.resolve(JSDomControl);
export default jsdomControl;
//# sourceMappingURL=jsdom.js.map