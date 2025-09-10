// Test bootstrap: preload reflect-metadata and DOMMatrix polyfill for pdfjs
require('reflect-metadata');

// Polyfill for Promise.withResolvers (Node.js < 20 compatibility)
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

// If compiled polyfill exists, load it. This file is used by mocha via --require.
try {
  require('./build_test/src/polyfills/dommatrix.js');
} catch (err) {
  // ignore if not compiled yet; runtime tests will import the polyfill otherwise
}
