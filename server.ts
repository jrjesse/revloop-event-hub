import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createIdentity } from './src/server/identity.ts';
import { openHub } from './src/server/hub/index.ts';
import { createApiRouter } from './src/server/routes.ts';
import { createSources } from './src/server/sources.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  const sources = createSources();
  const hub = await openHub({
    ledgerPath: process.env.HUB_LEDGER_PATH || path.resolve(process.cwd(), 'data/hub-ledger.json'),
    legacyPath: path.resolve(process.cwd(), 'data/revloop_d1_database.json'),
    sources,
  });
  const identity = createIdentity({
    mode: 'local_dev',
    directory: hub.directory(),
    secretPath: process.env.HUB_SESSION_KEY_PATH || path.resolve(process.cwd(), 'data/hub-session.key'),
    allowInProduction: process.env.HUB_ALLOW_LOCAL_DEV === 'true',
  });
  app.use('/api', identity.router());
  app.use('/api', createApiRouter({ hub, identity, sources }));

  if (!isProd) {
    // In development mode, mount Vite middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve built files from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Revloop Event Hub] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
