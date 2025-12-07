import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [sveltekit()],

  server: {
    fs: {
      allow: [
        root,
        resolve(root, 'packages')
      ]
    }
  }
});
