<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		// Force light theme site-wide
		document.documentElement.setAttribute('data-theme', 'light');
	});
</script>

<svelte:head>
	<!-- La cara como favicon: en una pestaña con veinte iconos, una cara se
	     distingue mejor que cualquier logo. -->
	<link rel="icon" href="/damian.jpg" />
	<link rel="apple-touch-icon" href="/damian.jpg" />
</svelte:head>

<main class="min-h-screen w-full antialiased font-sans text-base text-neutral-900 bg-white">
	<div class="mx-auto max-w-2xl px-4 py-16">
		{@render children?.()}
	</div>
</main>