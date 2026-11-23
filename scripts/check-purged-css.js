/*
 * Which @layer components selectors in index.css are referenced by source but
 * missing from the built stylesheet? Tailwind drops component rules whose class
 * name never appears as a literal string (e.g. built with a template literal),
 * so this list is the set of silently-dead styles.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../client');
const src = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');
const distFile = fs.readdirSync(path.join(root, 'dist/assets')).find((f) => /^index-.*\.css$/.test(f));
if (!distFile) {
  console.error('run `npm run build` first — no dist/assets/index-*.css found');
  process.exit(1);
}
const dist = fs.readFileSync(path.join(root, 'dist/assets', distFile), 'utf8');

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const full = path.join(dir, e.name);
  if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(full);
  return /\.(jsx|js|html)$/.test(e.name) ? [fs.readFileSync(full, 'utf8')] : [];
});
const source = [path.join(root, 'src'), path.join(root, 'index.html')].flatMap((p) =>
  fs.statSync(p).isDirectory() ? walk(p) : [fs.readFileSync(p, 'utf8')]).join('\n');

const selectors = new Set();
for (const m of src.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) selectors.add(m[1]);

const dead = [];
const unused = [];
for (const c of [...selectors].sort()) {
  if (dist.includes('.' + c)) continue;
  (source.includes(c) ? dead : unused).push(c);
}

console.log(`index.css selectors: ${selectors.size}`);
console.log(`\nDEAD — referenced in source but purged (${dead.length}):\n  ${dead.join('\n  ') || 'none'}`);
console.log(`\nnot referenced anywhere (${unused.length}):\n  ${unused.join(', ') || 'none'}`);
