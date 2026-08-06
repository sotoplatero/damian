<script lang="ts">
	import PageMeta from '$lib/components/PageMeta.svelte';
	import { copy as t } from '$lib/authors/copy';
	import type { PageData } from './$types';

	/**
	 * The tool's front door.
	 *
	 * A plain `<form method="GET">` rather than a `fetch`: that way the server
	 * redirects to the postcards' canonical URL and the visitor lands on an
	 * address they can share. A `fetch` would leave the postcards sitting on
	 * `/postcard` with no URL of their own.
	 */
	let { data }: { data: PageData } = $props();
</script>

<PageMeta title={t.title} description={t.description} />

<section class="section">
	<h1 class="box-title">{t.title}</h1>
	<div class="body-text mt-4">
		<p>
			Pega la dirección de un newsletter de Substack y salen cuatro postales con toda su
			historia pública: cuántos artículos lleva, cómo responde su gente y su ritmo del último
			año. Elige la que más te guste y descárgala.
		</p>
		<p class="mt-4">
			Solo lee lo que Substack ya enseña en público. No hace falta entrar en ninguna cuenta.
		</p>
	</div>

	<form method="GET" action="/postcard" class="mt-8 flex flex-wrap items-center gap-3">
		<input
			class="input input-bordered grow"
			type="text"
			name="url"
			required
			placeholder={t.urlPlaceholder}
			aria-label={t.urlPlaceholder}
		/>
		<button class="btn btn-primary" type="submit">{t.urlButton}</button>
	</form>

	{#if data.invalid}
		<p class="muted mt-3">{t.errorNotSubstack}</p>
	{/if}
</section>
