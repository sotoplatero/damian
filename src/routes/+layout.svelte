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
	<!-- Favicon: tu cara recortada de la misma foto que sale en la home
	     (static/favicon.png, 180px). Es la misma imagen en la pestaña y en la
	     página, y a 32px se lee porque la cara llena el cuadro. -->
	<link rel="icon" href="/favicon.png" />
	<link rel="apple-touch-icon" href="/favicon.png" />
</svelte:head>

<!-- overflow-x-clip es el cierre final: el sitio es de una columna y nada
     deberia moverlo en horizontal. Se usa `clip` y no `hidden` porque `hidden`
     convierte el elemento en contenedor de scroll y rompe position: sticky. -->
<main
	class="min-h-screen w-full overflow-x-clip bg-white font-sans text-base text-ink antialiased"
>
	<div class="mx-auto max-w-2xl px-4 py-16">
		{@render children?.()}
	</div>
</main>