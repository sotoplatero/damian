<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';

	let { children } = $props();
	let theme = $state('light');

	onMount(() => {
		// Detect system preference
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		theme = prefersDark ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', theme);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
