import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist');
const htmlPath = join(distDir, 'index.html');

let html = readFileSync(htmlPath, 'utf-8');

// 1. Remove external meta tags (og:image, twitter:image pointing to bolt.new)
html = html.replace(/<meta property="og:image"[^>]*>\s*/g, '');
html = html.replace(/<meta name="twitter:card"[^>]*>\s*/g, '');
html = html.replace(/<meta name="twitter:image"[^>]*>\s*/g, '');

// 2. Remove modulepreload link tags (they reference external files and fail on file://)
html = html.replace(/<link rel="modulepreload"[^>]*>\s*/g, '');

// 3. Inline CSS and JS files
const assetsDir = join(distDir, 'assets');
const files = readdirSync(assetsDir);

for (const file of files) {
  const filePath = join(assetsDir, file);
  const content = readFileSync(filePath, 'utf-8');

  if (file.endsWith('.css')) {
    const linkTag = `<link rel="stylesheet" crossorigin href="./assets/${file}">`;
    const inlinedTag = `<style>\n${content}\n</style>`;
    // Use split/join instead of replace to avoid $-pattern corruption
    html = html.split(linkTag).join(inlinedTag);
  } else if (file.endsWith('.js')) {
    const scriptTag = `<script type="module" crossorigin src="./assets/${file}"></script>`;
    // Strip the modulepreload polyfill that Vite prepends to the bundle.
    // It uses fetch() which fails on file:// protocol. Since everything is
    // inlined, there are no modulepreload links to polyfill anyway.
    let jsContent = content;
    const polyfillPattern = /^\(function\(\)\{const t=document\.createElement\("link"\)\.relList[\s\S]*?\}\)\(\);/;
    jsContent = jsContent.replace(polyfillPattern, '');
    // Escape </script> sequences so they don't prematurely close the HTML tag
    jsContent = jsContent.replace(/<\/script>/g, '<\\/script>');
    const inlinedTag = `<script type="module">\n${jsContent}\n</script>`;
    // Use split/join instead of replace to avoid $-pattern corruption
    html = html.split(scriptTag).join(inlinedTag);
  }
}

writeFileSync(htmlPath, html, 'utf-8');
console.log('Inlined CSS and JS, removed external references from dist/index.html');
