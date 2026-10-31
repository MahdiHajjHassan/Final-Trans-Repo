"use strict";

// Legacy lint consumers expect a callable CJS export. All matching is delegated
// to patched minimatch 11; never recreate the removed backtracking regex engine.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Legacy plugins require a CommonJS export.
const patched = require("minimatch-patched");

function compatible(api) {
  const match = (path, pattern, options) =>
    (typeof api === "function" ? api : api.minimatch)(path, pattern, options);
  Object.assign(match, api);
  match.minimatch = match;
  match.defaults = (options) => compatible(api.defaults(options));
  // eslint-plugin-import only calls .test() on the result of makeRe().
  // This deliberately returns a matcher, not a RegExp or a source string.
  match.makeRe = (pattern, options) => {
    const matcher = new api.Minimatch(pattern, options);
    return Object.freeze({ test: (path) => matcher.match(path) });
  };
  return match;
}

const bridge = compatible(patched);
module.exports = bridge;
// Explicit assignments let Node expose these CJS properties to ESM named imports.
module.exports.minimatch = bridge;
module.exports.Minimatch = bridge.Minimatch;
module.exports.filter = bridge.filter;
module.exports.defaults = bridge.defaults;
module.exports.match = bridge.match;
module.exports.makeRe = bridge.makeRe;
module.exports.braceExpand = bridge.braceExpand;
module.exports.escape = bridge.escape;
module.exports.unescape = bridge.unescape;
module.exports.sep = bridge.sep;
module.exports.GLOBSTAR = bridge.GLOBSTAR;
