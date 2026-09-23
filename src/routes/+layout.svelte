<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import Mark from '$lib/components/Mark.svelte';
	import { PUBLICATION_URL } from '$lib/publication';

	let { children } = $props();
	let paletteOpen = $state(false);

	/*
	 * THE HOME PAGE IS A POSTER; EVERY OTHER PAGE IS A COLUMN. The home runs its
	 * bands edge to edge (the mango field, the ink close), so it gets no wrapper.
	 * A tool or a download is something you use, at a reading measure, so it sits
	 * in `.page-column` — which is also what lets `ToolShell` centre it in the
	 * height left under the header.
	 */
	const isHome = $derived(page.url.pathname === '/');

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
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
</svelte:head>

<!--
  THESIS: the site does the work, the newsletter tells the story. A Swiss poster —
  one grotesque set very large, a strict grid, one field of mango — that hands
  over working tools and points to the letter for how they were made. Refuses the
  creator landing built on borrowed authority (reader counts, testimonials, logos)
  and refuses copying the newsletter onto the site.
  OWN-WORLD: paper #f4f2ec, sheet #fffdf8, ink #161514, mango #ffc21a as a whole
  field and a highlighter (never text on paper; #7a5800 where it must be read), Substack blue (#006ae6, their #0076ff one step darker for 4.99:1) only on a
  button that subscribes. Schibsted Grotesk
  900 for display, 400 for reading. Rows on hairlines, no cards, no radius, the
  ink frame around every field.
  STORY: the visitor sees tools for their Substack, opens one on its own page, and
  subscribes to get the next one and how it was built.
  FIRST VIEWPORT: centred on the mango field — the headline at poster size, one
  lead line, the email frame under it with the terms. Nothing else.
  FORM: Swiss typographic poster (direction C, chosen by Damian over the drawing
  sheet and the receipt, then made personal and visitor-first). No seed key:
  concept-seed exited 0 with empty output on all three runs (bash, file redirect,
  PowerShell) — its catalog is not installed and the roll API returned nothing —
  so the three directions were derived by hand and shown to Damian as mockups.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
-->
<div class="site-shell font-sans antialiased">
	<header class="wide site-top label" aria-label="Cabecera">
		<a href="/" class="site-mark" aria-label="Damian Soto, inicio">
			<!-- The mark, «el hueco»: a square missing a piece (Mark.svelte). -->
			<span class="site-symbol" aria-hidden="true"><Mark /></span>
			<span>Damian Soto</span>
		</a>
		<nav class="site-nav" aria-label="Principal">
			<a href="/#herramientas">Herramientas</a>
			<a href="/#descargas">Descargas</a>
			<a href={PUBLICATION_URL} target="_blank" rel="noopener noreferrer">La carta</a>
			<a class="site-join" href="/#alta">Apúntame</a>
		</nav>
	</header>

	<!-- `overflow-x: clip`, not `hidden`: `hidden` makes a scroll container and
	     breaks `position: sticky`. Nothing on a one-direction page should move it
	     sideways. -->
	<main class="flex flex-1 flex-col overflow-x-clip">
		{#if isHome}
			{@render children?.()}
		{:else}
			<div class="page-column">{@render children?.()}</div>
		{/if}
	</main>

	<!-- The maker's signature. «Hecho a mano» is the quiet door to /colofon; ⌘K
	     opens the launcher and is its only visible hint. -->
	<footer class="site-foot label on-ink" aria-label="Pie">
		<div class="wide">
			<span><a href="/colofon">Hecho a mano</a> por Damian Soto</span>
			<span class="inline-flex items-center gap-4">
				<a href={PUBLICATION_URL} target="_blank" rel="noopener noreferrer">Objeto Brillante</a>
				<button
					type="button"
					class="key-hint"
					aria-label="Abrir el buscador"
					onclick={() => (paletteOpen = true)}>⌘K</button
				>
			</span>
		</div>
	</footer>
</div>

<CommandPalette bind:open={paletteOpen} />
