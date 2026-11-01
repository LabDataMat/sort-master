import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 项目站点子路径，必须与仓库名一致
  base: '/sort-master/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2020',
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
