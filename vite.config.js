import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      plugins: [
        {
          name: 'copy-fbx-files',
          writeBundle() {
            // Copy FBX files to dist/assets
            mkdirSync('dist/assets', { recursive: true });
            copyFileSync('assets/hexa_03.fbx', 'dist/assets/hexa_03.fbx');
            copyFileSync('assets/Shelf_Base.fbx', 'dist/assets/Shelf_Base.fbx');
            copyFileSync('assets/Shelf_Circle.fbx', 'dist/assets/Shelf_Circle.fbx');
            copyFileSync('assets/Shelf_CirdlePart_04.fbx', 'dist/assets/Shelf_CirdlePart_04.fbx');
            console.log('FBX files copied to dist/assets');
          }
        }
      ]
    }
  },
  server: {
    port: 3000,
    open: true
  }
});