import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-vendor': ['jspdf', 'jspdf-autotable', 'html2pdf.js'],
          'excel-vendor': ['xlsx'],
          'icons-vendor': ['lucide-react', 'react-icons'],
          'react-vendor': ['react', 'react-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/v1/payments/paystack/charge': {
        target: 'http://127.0.0.1:8001',
        rewrite: () => '/charge',
        secure: false,
        changeOrigin: true,
      },
      '/api/v1/payments/paystack/webhook': {
        target: 'http://127.0.0.1:8001',
        rewrite: () => '/webhook',
        secure: false,
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8000',
        secure: false,
        changeOrigin: true,
      },
    },
  },
});
