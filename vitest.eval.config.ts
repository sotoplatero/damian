/**
 * The evaluation harness runs apart from `pnpm test`.
 *
 * `pnpm test` is pure modules with the network mocked: fast, free, and safe to
 * run on every save. `pnpm eval:actionable` calls a model twenty times over the
 * real internet. Sharing a config would mean one careless `pnpm test` spending
 * money, so they are separated by config and not by a filename convention.
 *
 * It keeps the SvelteKit plugin because the code under evaluation is the code
 * that ships — `$lib` aliases and `$env/dynamic/private` included. An eval that
 * reimplements what it measures measures the reimplementation.
 */
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['evals/**/*.eval.ts'],
		// One model call is slow and twenty run four at a time. The default
		// five seconds fails before anything has come back.
		testTimeout: 15 * 60 * 1000,
		hookTimeout: 60 * 1000
	}
});
