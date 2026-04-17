import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'fs';

export default defineConfig({
  base: '',
  plugins: [
    react(),
    {
      name: 'fix-chrome-extension-build',
      writeBundle() {
        const distDir = resolve(__dirname, 'dist');

        // Copy manifest.json
        copyFileSync(
          resolve(__dirname, 'public/manifest.json'),
          resolve(distDir, 'manifest.json')
        );

        // Copy icons
        const iconsDir = resolve(distDir, 'icons');
        if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });
        for (const size of ['16', '32', '48', '128']) {
          copyFileSync(
            resolve(__dirname, `public/icons/icon${size}.png`),
            resolve(iconsDir, `icon${size}.png`)
          );
        }

        // Move HTML files from nested src/ dirs to root and fix paths
        const htmlFiles = [
          { src: 'src/popup/popup.html', dest: 'popup.html' },
          { src: 'src/sidepanel/sidepanel.html', dest: 'sidepanel.html' },
        ];

        for (const f of htmlFiles) {
          const srcPath = resolve(distDir, f.src);
          const destPath = resolve(distDir, f.dest);
          if (existsSync(srcPath)) {
            let html = readFileSync(srcPath, 'utf-8');
            html = html.replace(/\.\.\/\.\.\//g, './');
            writeFileSync(destPath, html);
          }
        }

        // Clean up leftover nested dist/src directory
        const nestedSrc = resolve(distDir, 'src');
        if (existsSync(nestedSrc)) {
          rmSync(nestedSrc, { recursive: true, force: true });
        }
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        'popup': resolve(__dirname, 'src/popup/popup.html'),
        'sidepanel': resolve(__dirname, 'src/sidepanel/sidepanel.html'),
        'background': resolve(__dirname, 'src/background/service-worker.ts'),
        'content': resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'chrome114',
    minify: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
