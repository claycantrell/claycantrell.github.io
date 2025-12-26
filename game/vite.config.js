import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { rename } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Plugin to serve index-dev.html during development
function serveDevHtml() {
  return {
    name: 'serve-dev-html',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/' || req.url === '/index.html') {
          req.url = '/index-dev.html';
        }
        next();
      });
    }
  };
}

// Plugin to rename index-dev.html to index.html after build
function renameHtmlOutput() {
  return {
    name: 'rename-html-output',
    closeBundle: async () => {
      try {
        await rename(
          resolve(__dirname, 'dist/index-dev.html'),
          resolve(__dirname, 'dist/index.html')
        );
      } catch (e) {
        // File might not exist or already renamed
      }
    }
  };
}

export default defineConfig({
  root: '.',
  base: './',
  plugins: [
    serveDevHtml(),
    viteStaticCopy({
      targets: [
        { src: 'engine/*', dest: 'engine' },
        { src: 'systems/*', dest: 'systems' },
        { src: 'multiplayer/*', dest: 'multiplayer' },
        { src: 'maps/*', dest: 'maps' }
      ]
    }),
    renameHtmlOutput()
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Production optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.logs in production
        drop_debugger: true
      }
    },
    sourcemap: false,  // Don't expose source in production
    rollupOptions: {
      input: 'index-dev.html',
      output: {
        manualChunks: {
          three: ['three']  // Split Three.js into separate chunk for caching
        }
      }
    },
    // Target modern browsers for smaller bundle
    target: 'es2020',
    // Increase chunk size warning limit (Three.js is large)
    chunkSizeWarningLimit: 700
  },
  server: {
    port: 3001,
    open: true
  },
  // Enable gzip compression hints
  preview: {
    headers: {
      'Cache-Control': 'public, max-age=31536000'
    }
  }
});
