<script lang="ts">
	import PageMeta from '$lib/components/PageMeta.svelte';
	import { copy } from '$lib/authors/copy';
	import type { PageData } from './$types';

	/**
	 * The frame of the card, not a report.
	 *
	 * What the visitor sees IS card.png — the file they download, pixel for
	 * pixel — so the page and the image can never disagree. Everything the old
	 * profile page rebuilt in HTML (stat bands, best post, latest posts, word
	 * bars, sentences) is gone: the figures live inside the image, chosen by
	 * `heroFor`/`chipsFor` in $lib/authors/card.ts.
	 *
	 * Below the poster, exactly two things: the download, and the contagion
	 * loop — whoever receives the gift is invited to make their own. That loop
	 * is how every wrapped spreads, and it used to be buried in an error state.
	 */
	let { data }: { data: PageData } = $props();

	const t: Record<string, string> = copy;
	const es = (n: number) => n.toLocaleString('es-ES');
	const fill = (key: string, n: number | string) => (t[key] ?? '').replace('{n}', String(n));

	const card = $derived(data.card);

	const errorText = $derived.by(() => {
		switch (data.failure) {
			case null:
				return '';
			case 'not_found':
				return t.errorNotFound;
			case 'blocked':
				return t.errorBlocked;
			case 'rate_limit':
				return t.errorRateLimit;
			case 'too_new':
				return fill('errorTooNew', es(data.tooNewPosts));
			default:
				return t.errorNotSubstack;
		}
	});

	let linkCopied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	async function copyLink() {
		await navigator.clipboard.writeText(location.href);
		linkCopied = true;
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (linkCopied = false), 2000);
	}
</script>

<PageMeta
	title={card ? `${card.metrics.pub.name} en números` : t.title}
	description={card
		? `La historia pública de ${card.metrics.pub.name}, en una tarjeta.`
		: t.description}
	image={card ? `/author/${data.slug}/og.png` : undefined}
/>

{#if !card}
	<section class="section">
		<div class="screen-center gap-4">
			<p class="body-text">{errorText}</p>
			<a class="link-quiet" href="/author">{t.restart}</a>
		</div>
	</section>
{:else}
	<article>
		<h1 class="sr-only">{card.metrics.pub.name}</h1>

		<!-- The poster: the downloadable image itself, staged. -->
		<img
			class="poster"
			src="/author/{data.slug}/card.png"
			alt={t.cardAlt.replace('{name}', card.metrics.pub.name)}
			width="1080"
			height="1080"
		/>

		<div class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
			<!-- No download in the degraded state: half a card is not a gift. -->
			{#if card.source === 'archive'}
				<a class="btn btn-primary btn-lg" href="/author/{data.slug}/card.png" download="{data.slug}.png">
					{t.download}
				</a>
			{/if}
			<button type="button" class="link-quiet" onclick={copyLink}>
				{linkCopied ? t.copiedLink : t.copyLink}
			</button>
			<a
				class="link-quiet"
				href={card.metrics.pub.origin}
				target="_blank"
				rel="noopener noreferrer"
			>
				{t.labelViewOnSubstack} ↗
			</a>
		</div>

		<!-- The contagion loop: the gift invites the next one. -->
		<section class="section box bg-line/40">
			<h2 class="section-title">{t.makeYoursTitle}</h2>
			<p class="section-intro">{t.makeYoursBody}</p>
			<form method="GET" action="/author" class="mt-4 flex gap-2">
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
		</section>

		<!-- Caveats stay visible: they qualify the image above them. -->
		<div class="mt-8 flex flex-col gap-2">
			{#if card.metrics.day || card.metrics.hour}<p class="muted">{t.noteUtc}</p>{/if}
			{#if card.importedCount > 0}
				<p class="muted">{fill('noteImported', es(card.importedCount))}</p>
			{/if}
			{#if card.truncated}
				<p class="muted">{fill('noteTruncated', es(card.metrics.totalPosts))}</p>
			{/if}
			{#if card.source === 'feed'}
				<p class="muted">{fill('noteFeed', es(card.metrics.totalPosts))}</p>
			{/if}
		</div>

		<footer class="mt-10">
			<a class="link-quiet" href="/">{t.signature}</a>
		</footer>
	</article>
{/if}
