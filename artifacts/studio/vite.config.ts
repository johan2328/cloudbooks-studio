import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "node:fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// MIME por extensión para servir los assets del engine.
const ENGINE_MIME: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".json": "application/json", ".pdf": "application/pdf",
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2",
};

const ENGINE_URL_PREFIX = "/assets/cloudbooks-engine/";

/**
 * Sirve los assets del engine en DEV desde DOS raíces, en orden (Fase 3 de la migración de peso):
 *  1) WORKING ROOT (`<repo>/.data/engine`, fuera del árbol servido y de git): la salida COMPLETA del
 *     motor. Es lo que necesita el cockpit interno (previews, páginas intermedias, exports).
 *  2) `public/assets/cloudbooks-engine`: el subconjunto PUBLICADO (portadas, contratapas, muestras y
 *     los `_book-config`), que materializa `POST /engine/publish-assets` y es lo único que viaja al
 *     build de producción.
 * En producción este middleware no existe (es `configureServer`): allí sólo se sirve lo publicado,
 * que es exactamente lo que la tienda consume.
 */
function serveEngineAssets() {
  return {
    name: "serve-cloudbooks-engine-assets",
    configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (d?: unknown) => void }, next: () => void) => void) => void } }) {
      const publishedRoot = path.resolve(import.meta.dirname, "public", "assets", "cloudbooks-engine");
      const workingRoot = process.env.ENGINE_WORKING_ROOT
        ? path.resolve(process.env.ENGINE_WORKING_ROOT)
        : path.resolve(import.meta.dirname, "..", "..", ".data", "engine");
      const roots = [workingRoot, publishedRoot];

      server.middlewares.use((req, res, next) => {
        const urlPath = (req.url || "").split("?")[0];
        if (!urlPath.startsWith(ENGINE_URL_PREFIX)) return next();
        let rel: string;
        try { rel = decodeURIComponent(urlPath.slice(ENGINE_URL_PREFIX.length)); } catch { return next(); }
        if (!rel) return next();

        const candidates = roots
          .map((root) => ({ root, file: path.join(root, rel) }))
          .filter(({ root, file }) => file.startsWith(root));   // sin path traversal
        if (!candidates.length) return next();

        const tryNext = (i: number): void => {
          if (i >= candidates.length) return next();
          fs.readFile(candidates[i]!.file, (err, data) => {
            if (err) return tryNext(i + 1);
            res.setHeader("Content-Type", ENGINE_MIME[path.extname(candidates[i]!.file).toLowerCase()] || "application/octet-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.end(data);
          });
        };
        tryNext(0);
      });
    },
  };
}

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    serveEngineAssets(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: process.env.VITE_HOST ?? "localhost",   // por defecto SOLO localhost; VITE_HOST=0.0.0.0 para exponer a la LAN
    allowedHosts: true,
    // El engine ya NO escribe dentro de public/ (Fase 3: su working root vive en <repo>/.data/engine).
    // Sólo `POST /engine/publish-assets` toca public/assets/cloudbooks-engine, y es un evento puntual,
    // así que el parche de `watch.ignored` que evitaba el full-reload por cada imagen ya no hace falta.
    fs: {
      strict: true,
    },
    // Motor InDesign AI (studio-engine). Solo /engine — NO toca /api (Codex).
    proxy: {
      "/engine": {
        target: process.env.ENGINE_URL ?? "http://127.0.0.1:8790",   // IPv4 explícito: el engine bindea 127.0.0.1 (localhost podría resolver a ::1)
        changeOrigin: true,
        // Inyecta el token del engine (si está seteado) desde el server de Vite → NO viaja en el bundle.
        headers: process.env.ENGINE_TOKEN ? { "x-engine-token": process.env.ENGINE_TOKEN } : undefined,
      },
    },
  },
  preview: {
    port,
    host: process.env.VITE_HOST ?? "localhost",   // por defecto SOLO localhost; VITE_HOST=0.0.0.0 para exponer a la LAN
    allowedHosts: true,
  },
});
