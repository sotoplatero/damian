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
	class="site-shell min-h-screen w-full overflow-x-clip font-sans text-base text-ink antialiased"
>
	<!-- w-full + min-w-0: el ancho es explicito y ningun hijo puede estirarlo.
	     Sin esto, un elemento ancho arrastra la columna y el padding derecho
	     desaparece. -->
	<div class="site-column mx-auto w-full min-w-0 max-w-2xl px-5 pb-20 pt-7 sm:pt-10">
		<header class="site-header" aria-label="Cabecera">
			<a href="/" class="site-mark" aria-label="Damian Soto, inicio">
				<span class="site-mark-dot" aria-hidden="true"></span>
				<span>DAMIAN / OBJETO BRILLANTE</span>
			</a>
			<span class="site-status"><span aria-hidden="true">●</span> EN CONSTRUCCIÓN</span>
		</header>
		{@render children?.()}
	</div>
</main>
