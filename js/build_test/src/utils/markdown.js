
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

function tidyMarkdown(markdown) {
  let normalizedMarkdown = markdown.replace(/\[\s*([^\]\n]+?)\s*\]\s*\(\s*([^)]+)\s*\)/g, (match, text, url) => {
    text = text.replace(/\s+/g, " ").trim();
    url = url.replace(/\s+/g, "").trim();
    return `[${text}](${url})`;
  });
  normalizedMarkdown = normalizedMarkdown.replace(/\[\s*([^\]\n!]*?)\s*\n*(?:!\[([^\]]*)\]\((.*?)\))?\s*\n*\]\s*\(\s*([^)]+)\s*\)/g, (match, text, alt, imgUrl, linkUrl) => {
    text = text.replace(/\s+/g, " ").trim();
    alt = alt ? alt.replace(/\s+/g, " ").trim() : "";
    imgUrl = imgUrl ? imgUrl.replace(/\s+/g, "").trim() : "";
    linkUrl = linkUrl.replace(/\s+/g, "").trim();
    if (imgUrl) {
      return `[${text} ![${alt}](${imgUrl})](${linkUrl})`;
    } else {
      return `[${text}](${linkUrl})`;
    }
  });
  normalizedMarkdown = normalizedMarkdown.replace(/\[\s*([^\]]+)\]\s*\(\s*([^)]+)\)/g, (match, text, url) => {
    text = text.replace(/\s+/g, " ").trim();
    url = url.replace(/\s+/g, "").trim();
    return `[${text}](${url})`;
  });
  normalizedMarkdown = normalizedMarkdown.replace(/\n{3,}/g, "\n\n");
  normalizedMarkdown = normalizedMarkdown.replace(/^[ \t]+/gm, "");
  return normalizedMarkdown.trim();
}
export {
  tidyMarkdown
};
//# sourceMappingURL=markdown.js.map
