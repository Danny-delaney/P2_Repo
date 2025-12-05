import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			// (optional but keeps Vite + TS happy)
			'@c00286125/study-task-burndown': resolve('./packages/study-task-burndown/src')
		}
	},
	server: {
		fs: {
			// allow Vite to serve any file under the project root, including `packages/`
			allow: ['.']
		}
	}
});
