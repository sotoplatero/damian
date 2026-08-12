import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// Tests only cover the pure modules ($lib/authors, $lib/tools/archive) and the
	// archive walk with a simulated fetch. There are no component tests: the DOM
	// adds nothing here and would pull in jsdom for no reason.
	test: {
		include: ['src/**/*.test.ts']
	}
});
