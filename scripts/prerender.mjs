import {readFile, writeFile} from 'node:fs/promises';
import {createServer} from 'vite';

// The app reads window.location while rendering, so give Node a minimal stand-in.
globalThis.window = {location: {pathname: '/'}, matchMedia: () => ({matches: false, addEventListener() {}, removeEventListener() {}})};
globalThis.localStorage = {getItem: () => null, setItem() {}, removeItem() {}};

const server = await createServer({configFile: 'vite.config.js', appType: 'custom', server: {middlewareMode: true, hmr: false}});
try {
  const {renderHome} = await server.ssrLoadModule('/src/prerender.tsx');
  const markup = renderHome();
  const htmlPath = 'dist/index.html';
  const template = await readFile(htmlPath, 'utf8');
  if (!template.includes('<div id="root"></div>')) throw new Error('Root element not found in dist/index.html');
  await writeFile(htmlPath, template.replace('<div id="root"></div>', `<div id="root">${markup}</div>`));
  console.log(`Pre-rendered home page: ${markup.length} characters of markup`);
} finally {
  await server.close();
}
