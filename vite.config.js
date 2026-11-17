import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({ base: './', server: { proxy: { '/api': { target: 'http://127.0.0.1:8787', ws: true } } }, build: { outDir: 'build', chunkSizeWarningLimit: 1600, rollupOptions: { input: { main: resolve(import.meta.dirname, 'index.html'), minigames: resolve(import.meta.dirname, 'minigames.html') } } } });
