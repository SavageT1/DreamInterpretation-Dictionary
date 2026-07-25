import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT ?? process.env.APP_PORT ?? 3000);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(currentDirectory, 'dist');
    if (!fs.existsSync(distPath)) {
      throw new Error('Production build is missing. Run the build command first.');
    }

    app.use(express.static(distPath));
    app.get('*', (_request, response) => {
      response.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '127.0.0.1', () => {
    console.log(`Local server running on http://127.0.0.1:${port}`);
  });
}

startServer().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Server startup failed.');
  process.exit(1);
});
