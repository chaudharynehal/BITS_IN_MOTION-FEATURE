import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleApiRequest } from './server/handler.js';

function localApi() {
  return {
    name: 'bits-in-motion-local-api',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        handleApiRequest(req, res).catch((error) => {
          console.error(error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
          }
          if (!res.writableEnded) res.end(JSON.stringify({ error: 'Local API failure.' }));
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    plugins: [react(), localApi()],
    server: { port: 5173 },
    preview: { port: 4173 },
  };
});
