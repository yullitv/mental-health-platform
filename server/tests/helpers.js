const path = require("node:path");
const SRC = path.join(__dirname, "..", "src");
function inject(relPath, exportsObj) {
  const file = require.resolve(path.join(SRC, relPath));
  require.cache[file] = { id: file, filename: file, loaded: true, exports: exportsObj };
}
function load(relPath) {
  const file = require.resolve(path.join(SRC, relPath));
  delete require.cache[file];
  return require(file);
}
module.exports = { inject, load };
