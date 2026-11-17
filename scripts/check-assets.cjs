const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const postcss = require('postcss');

process.chdir(path.resolve(__dirname, '..'));
const pages = fs.readdirSync('.').filter(file => file.endsWith('.html') && file !== 'header.html' && file !== 'footer.html');
const css = fs.readFileSync('assets/site.css', 'utf8');
const rules = new Set();
postcss.parse(css).walkRules(rule => rule.selector.split(',').forEach(selector => rules.add(selector.trim())));

for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  assert(html.includes('href="assets/site.css"'), `${page}: missing shared styles`);
  assert(html.includes('rel="modulepreload" href="app.js"'), `${page}: missing early script load`);
  assert(html.includes('<meta name="color-scheme" content="light">'), `${page}: missing initial light color scheme`);
  const initialPaint = html.indexOf('<style id="page-paint">');
  assert(initialPaint >= 0 && initialPaint < html.indexOf('href="assets/site.css"'), `${page}: initial background must precede external styles`);
  if (page === 'producto.html') {
    assert(!/id="main-product-img"[^>]*transition-opacity/.test(html), 'Product gallery image must not fade when changed');
  }
  assert(!/cdn\.tailwindcss\.com|unpkg\.com\/@phosphor-icons|fonts\.googleapis\.com/.test(html), `${page}: render-blocking CDN dependency`);
  for (const [, file] of html.matchAll(/(?:href|src)="(assets\/[^"?#]+)"/g)) {
    assert(fs.existsSync(file), `${page}: missing ${file}`);
  }
}

for (const [, file] of css.matchAll(/url\(["']?(?:\.\/)?([^)'"\s]+)/g)) {
  assert(fs.existsSync(path.join('assets', file)), `Missing font: ${file}`);
}

const textFonts = new Map(['Outfit', 'Fraunces', 'Caveat'].map(family => [family, []]));
postcss.parse(css).walkAtRules('font-face', face => {
  const family = face.nodes.find(node => node.prop === 'font-family')?.value.replace(/^['"]|['"]$/g, '');
  if (textFonts.has(family)) textFonts.get(family).push(face);
});
for (const [family, faces] of textFonts) {
  assert.equal(faces.length, 1, `${family}: expected one font face`);
  assert.equal(faces[0].nodes.find(node => node.prop === 'font-display')?.value, 'swap', `${family}: text must remain visible while the font loads`);
}
const caveatFace = textFonts.get('Caveat')[0];
assert.equal(caveatFace.nodes.find(node => node.prop === 'unicode-range')?.value.toUpperCase(), 'U+0026', 'Caveat must be limited to the ampersand glyph');
assert(caveatFace.nodes.find(node => node.prop === 'src')?.value.includes('caveat-ampersand.woff2'), 'Caveat must use its ampersand subset');

// Dynamic states must remain styled after replacing the runtime CSS generator.
for (const selector of ['.hidden', '.flex', '.opacity-0', '.opacity-100', '.scale-110', '.bg-brand-forest', '.text-brand-cream', '.border-red-500', '.border-green-600']) {
  assert(rules.has(selector), `Missing runtime utility: ${selector}`);
}
const sources = pages.map(page => fs.readFileSync(page, 'utf8')).join('\n') + fs.readFileSync('app.js', 'utf8');
const iconNames = new Set(sources.match(/\bph-(?!fill\b|bold\b)[a-z]+(?:-[a-z0-9]+)*/g));
for (const icon of iconNames) {
  for (const weight of ['ph', 'ph-bold', 'ph-fill']) {
    assert(rules.has(`.${weight}.${icon}:before`), `Missing icon: ${weight} ${icon}`);
  }
}
assert(/@view-transition\s*\{\s*navigation:\s*none;?\s*\}/.test(css), 'Cross-document transitions must remain disabled to prevent flicker');
assert(css.includes('prefers-reduced-motion'), 'Missing reduced motion support');
console.log(`OK: ${pages.length} pages, local fonts, ${iconNames.size} icons and dynamic styles.`);
