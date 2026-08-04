<script lang="ts">
	import { marked } from 'marked';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import { parseCopy } from '$lib/content';
	import raw from '$lib/content/author.md?raw';
	import type { PageData } from './$types';

	/**
	 * The tool's front door.
	 *
	 * A plain `<form method="GET">` rather than a `fetch`: that way the server
	 * redirects to the card's canonical URL and the visitor lands on an address
	 * they can share. A `fetch` would leave the card sitting on `/author` with no
	 * URL of its own.
	 */
	let { data }: { data: PageData } = $props();

	const { t, body } = parseCopy(raw);
	const intro = marked.parse(body) as string;
</script>

<PageMeta title={t.title} description={t.description} />

<section class="section">
	<h1 class="box-title">{t.title}</h1>
	<div class="body-text mt-4">{@html intro}</div>

	<form method="GET" action="/author" class="mt-8 flex flex-wrap items-center gap-3">
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
