import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		})
	],
	// Tests only cover the pure modules ($lib/authors) and the archive walk
	// with a simulated fetch. There are no component tests: the DOM adds
	// nothing here and would pull in jsdom for no reason.
	test: {
		include: ['src/**/*.test.ts']
	}
});
