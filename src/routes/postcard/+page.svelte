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
	 * `/postcard` with no URL of their own. That is also why it is NOT
	 * `InlineForm` — that component always `preventDefault`s and hands over to a
	 * callback, which is exactly the behaviour we don't want here. It borrows
	 * InlineForm's classes verbatim so the two look identical; if you restyle one,
	 * restyle the other.
	 */
	let { data }: { data: PageData } = $props();
</script>

<PageMeta title={t.title} description={t.description} />

<!--
	The site's tool-page header, the same as every other tool: `screen-center`
	around a `prose prose-xl` article whose `<h1>` picks up the fluid
	clamp(2.35rem, 9vw, 4.4rem) in app.css, with ONE lead sentence under it.

	It used to be `<h1 class="box-title">` — a card title, `text-lg`, which is the
	vocabulary for a box in a list, not for the headline of a page. It read as a
	list item. What is now the note under the field was a second paragraph of body
	text, and the lead itemised the three figures the postcards already show.
-->
<section class="screen-center">
	<article class="prose prose-xl prose-neutral max-w-none">
		<h1>La postal de tu <strong>Substack</strong>.</h1>
		<p>
			<strong>Pega tu dirección.</strong> Te llevas cuatro postales con toda tu historia
			pública, listas para compartir.
		</p>
	</article>

	{#if data.invalid}<p class="mt-6 text-sm text-error">{t.errorNotSubstack}</p>{/if}

	<div class="mt-8">
		<form method="GET" action="/postcard" class="flex gap-2">
			<input
				class="input input-bordered input-lg min-w-0 flex-1"
				type="text"
				name="url"
				required
				placeholder={t.urlPlaceholder}
				aria-label={t.urlPlaceholder}
			/>
			<button class="btn btn-primary btn-lg shrink-0" type="submit">{t.urlButton}</button>
		</form>
		<p class="muted mt-2">{t.urlHint}</p>
	</div>
</section>
