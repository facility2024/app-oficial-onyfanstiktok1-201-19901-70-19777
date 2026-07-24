import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) return 'react-vendor';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('@tanstack')) return 'tanstack';
          if (id.includes('framer-motion')) return 'framer';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('three') || id.includes('@react-three')) return 'three';
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('date-fns')) return 'date-fns';
          if (id.includes('zod') || id.includes('react-hook-form')) return 'forms';
          return 'vendor';
        },
      },
    },
  },
}));
