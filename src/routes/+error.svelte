<script lang="ts">
	import { page } from '$app/state';
	import { tools } from '$lib/tools/list';
	import { resources, resourceHref } from '$lib/resources/list';
	import Arrow from '$lib/components/Arrow.svelte';

	/**
	 * The page for an address that isn't one.
	 *
	 * There was no `+error.svelte` at all before, which meant every miss rendered
	 * SvelteKit's default: black Helvetica on white, the status code, and no way
	 * out. That is not a rare screen on this site. `/recursos` and `/tool` are
	 * both 404s and both are the obvious thing to type after landing on
	 * `/recursos/cervantes` — people trim URLs — and every link that goes out in a
	 * newsletter or gets pasted into a chat is one truncation away from here.
	 *
	 * So it takes the site's shell, and instead of apologising it does the one
	 * thing this page can do: show what does exist. The lists are the same modules
	 * the home page reads, so a new tool or a new download appears here too
	 * without anybody remembering to come back.
	 *
	 * NO «404» IN THE HEADLINE. The number is in the small print under it, where
	 * it belongs — it is information for me, not for whoever mistyped.
	 */
	const isMissing = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{isMissing ? 'Esto no está aquí' : 'Algo ha fallado'} — Damian Soto</title>
	<!-- A missing page should not be indexed, and it should not be indexed under
	     the URL that was asked for either. -->
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="screen-center">
	<article class="prose prose-xl prose-neutral max-w-none">
		{#if isMissing}
			<h1>Esto no está <mark>aquí.</mark></h1>
			<p>
				O lo escribí mal yo, o lo he movido, o lo has recortado tú. Lo que sí existe está justo
				debajo.
			</p>
		{:else}
			<h1>Se ha roto <mark>por mi parte.</mark></h1>
			<p>No es cosa tuya. Vuelve a intentarlo en un rato, o escríbeme y lo arreglo.</p>
		{/if}
	</article>

	{#if isMissing}
		<!-- The same doors the home page opens, at the column's measure. -->
		<section class="section" aria-label="Lo que sí existe">
			<ul class="doors">
				{#each tools as tool (tool.href)}
					<li>
						<a href={tool.href} class="door is-compact">
							<h2 class="door-name">{tool.name}</h2>
							<Arrow class="door-go" />
						</a>
					</li>
				{/each}
				{#each resources as resource (resource.slug)}
					<li>
						<a href={resourceHref(resource)} class="door is-compact">
							<h2 class="door-name">{resource.name}</h2>
							<Arrow class="door-go" />
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!--
		THE NUMBER, WITHOUT SVELTEKIT'S MESSAGE BESIDE IT. Printing
		`page.error.message` put «Error 404: Not Found» at the bottom of a page
		written entirely in Spanish: a route that simply doesn't exist never passes
		through our `error()` call, so the string comes from the framework and comes
		in English. The number is the only part of it a visitor could use.
	-->
	<p class="muted mt-10">
		<a class="link-quiet" href="/">← Volver al inicio</a>
		<span class="ml-3">Error {page.status}</span>
	</p>
</section>
