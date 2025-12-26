import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  root: '.',
  base: './',
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'engine/*', dest: 'engine' },
        { src: 'systems/*', dest: 'systems' },
        { src: 'multiplayer/*', dest: 'multiplayer' },
        { src: 'maps/*', dest: 'maps' }
      ]
    })
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
