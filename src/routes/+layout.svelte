<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import CommandPalette from '$lib/components/CommandPalette.svelte';

	let { children } = $props();
	let paletteOpen = $state(false);

	onMount(() => {
		// Force light theme site-wide
		document.documentElement.setAttribute('data-theme', 'light');
	});

	// View transitions: navigating fades instead of cutting. Skipped where the
	// browser can't (Firefox, older Safari) and where the visitor asked for no
	// motion — same rule as every animation in app.css.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
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
				<!-- The mark: a four-pointed star — the shiny object itself. An inline
				     SVG and not a text glyph: fonts centre glyphs on a baseline, so a
				     rotated character wobbles; a path drawn around the exact centre
				     of its viewBox spins true on every platform. -->
				<span class="site-symbol" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 1 Q13.6 9.4 23 12 Q13.6 14.6 12 23 Q10.4 14.6 1 12 Q10.4 9.4 12 1 Z" />
					</svg>
				</span>
				<span>DAMIAN / OBJETO BRILLANTE</span>
			</a>
			<span class="site-status"><span class="site-build" aria-hidden="true">🛠️</span> CONSTRUYENDO</span>
		</header>
		{@render children?.()}
		<!-- The colophon line: the maker's signature. "Hecho a mano" is the quiet
		     door to /colofon; ⌘K opens the launcher (and is its only visible hint). -->
		<footer class="site-footer" aria-label="Pie">
			<span><a href="/colofon">HECHO A MANO</a> POR DAMIAN SOTO</span>
			<span class="inline-flex items-center gap-3">
				<a href="https://sotoplatero.substack.com" target="_blank" rel="noopener noreferrer"
					>OBJETO BRILLANTE</a
				>
				<button
					type="button"
					class="key-hint"
					aria-label="Abrir el buscador"
					onclick={() => (paletteOpen = true)}>⌘K</button
				>
			</span>
		</footer>
	</div>
</main>

<CommandPalette bind:open={paletteOpen} />
