// Test bootstrap: preload reflect-metadata and DOMMatrix polyfill for pdfjs
require('reflect-metadata');
// If compiled polyfill exists, load it. This file is used by mocha via --require.
try {
  require('./build_test/src/polyfills/dommatrix.js');
} catch (err) {
  // ignore if not compiled yet; runtime tests will import the polyfill otherwise
}
