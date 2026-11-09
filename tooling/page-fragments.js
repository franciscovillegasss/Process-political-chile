import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const sourceRoot = fileURLToPath(new URL('src/', root)).replaceAll('\\', '/');
const fragmentPattern = /<!-- include: (src\/[\w/-]+\.html) -->/g;

export function assembleHtml(html) {
  return html.replace(fragmentPattern, (_, path) => readFileSync(new URL(path, root), 'utf8').trimEnd());
}

export function pageFragments() {
  return {
    name: 'page-fragments',
    transformIndexHtml: { order: 'pre', handler: assembleHtml },
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.html') && file.replaceAll('\\', '/').startsWith(sourceRoot)) {
        server.ws.send({ type: 'full-reload', path: '*' });
        return [];
      }
    },
  };
}
