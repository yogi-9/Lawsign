import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 500, // warns if a chunk exceeds 500KB
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate vendor libraries from application code for better caching
          if (id.includes('node_modules')) {
            if (id.includes('pdfjs-dist')) {
              return 'pdfjs';
            }
            if (id.includes('socket.io-client')) {
              return 'socketio';
            }
            return 'vendor';
          }
        }
      }
    }
  }
});
