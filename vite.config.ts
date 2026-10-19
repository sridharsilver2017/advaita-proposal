import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import serverApp from './server/index';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: 'hono-api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api')) {
            try {
              const protocol = req.headers['x-forwarded-proto'] || 'http';
              const host = req.headers.host || 'localhost:5173';
              const url = new URL(req.url, `${protocol}://${host}`);

              const headers = new Headers();
              for (const [key, val] of Object.entries(req.headers)) {
                if (val !== undefined) {
                  if (Array.isArray(val)) {
                    val.forEach(v => headers.append(key, v));
                  } else {
                    headers.set(key, val);
                  }
                }
              }

              // Read body if method allows
              let body: any = null;
              if (req.method !== 'GET' && req.method !== 'HEAD') {
                const chunks: Buffer[] = [];
                for await (const chunk of req) {
                  chunks.push(chunk);
                }
                body = Buffer.concat(chunks);
              }

              const webReq = new Request(url.toString(), {
                method: req.method,
                headers,
                body: body && body.length > 0 ? body : undefined
              });

              const webRes = await serverApp.fetch(webReq);

              res.statusCode = webRes.status;
              webRes.headers.forEach((val, key) => {
                res.setHeader(key, val);
              });

              if (webRes.body) {
                const reader = webRes.body.getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  res.write(value);
                }
              }
              res.end();
              return;
            } catch (err) {
              console.error('API middleware error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
              return;
            }
          }
          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@server': resolve(__dirname, './server')
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
