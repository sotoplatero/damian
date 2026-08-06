<script lang="ts">
	import PageMeta from '$lib/components/PageMeta.svelte';
	import { copy } from '$lib/authors/copy';
	import { POSTCARD_VARIANTS } from '$lib/authors/postcard';
	import type { PageData } from './$types';

	/**
	 * The frame of the postcards, not a report.
	 *
	 * What the visitor sees ARE the PNGs they can download — the four handoff
	 * designs in a snap rail. `scroll-snap` is the slider: native swipe on
	 * touch, no dependency; the arrows and the dots ride ON the image and share
	 * the same scroll position. Clicking a postcard opens the file itself.
	 */
	let { data }: { data: PageData } = $props();

	const t: Record<string, string> = copy;
	const es = (n: number) => n.toLocaleString('es-ES');
	const fill = (key: string, n: number | string) => (t[key] ?? '').replace('{n}', String(n));

	const card = $derived(data.card);
	const src = (variant: string) => `/postcard/${data.slug}/${variant}.png`;

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

	let rail = $state<HTMLElement | null>(null);
	let active = $state(0);

	/* The rail's scroll position IS the state: swipe, arrows and dots all end
	   up here, so they can't disagree. */
	function onScroll() {
		if (!rail) return;
		active = Math.min(
			POSTCARD_VARIANTS.length - 1,
			Math.max(0, Math.round(rail.scrollLeft / rail.clientWidth))
		);
	}

	function goTo(index: number) {
		rail?.scrollTo({ left: index * rail.clientWidth, behavior: 'smooth' });
	}

	let linkCopied = $state(false);
	let linkTimer: ReturnType<typeof setTimeout> | undefined;

	async function copyLink() {
		await navigator.clipboard.writeText(location.href);
		linkCopied = true;
		clearTimeout(linkTimer);
		linkTimer = setTimeout(() => (linkCopied = false), 2000);
	}

	/* '' | 'done' | 'failed' — copying an IMAGE needs a secure context and a
	   clipboard that accepts PNGs; where it can't, the button says so. */
	let imageCopied = $state<'' | 'done' | 'failed'>('');
	let imageTimer: ReturnType<typeof setTimeout> | undefined;

	async function copyImage() {
		try {
			const blob = await (await fetch(src(POSTCARD_VARIANTS[active]))).blob();
			await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
			imageCopied = 'done';
		} catch {
			imageCopied = 'failed';
		}
		clearTimeout(imageTimer);
		imageTimer = setTimeout(() => (imageCopied = ''), 2000);
	}
</script>

<PageMeta
	title={card ? `${card.metrics.pub.name} en números` : t.title}
	description={card
		? `La historia pública de ${card.metrics.pub.name}, en cuatro postales.`
		: t.description}
	image={card ? `/postcard/${data.slug}/og.png` : undefined}
/>

{#if !card}
	<section class="section">
		<div class="screen-center gap-4">
			<p class="body-text">{errorText}</p>
			<a class="link-quiet" href="/postcard">{t.restart}</a>
		</div>
	</section>
{:else}
	<article>
		<h1 class="sr-only">{card.metrics.pub.name}</h1>

		<!-- The slider: the downloadable images themselves, in a snap rail. The
		     arrows and dots sit ON the image; clicking a postcard opens the file. -->
		<div class="slider-frame">
			<div class="slider" bind:this={rail} onscroll={onScroll}>
				{#each POSTCARD_VARIANTS as variant, index (variant)}
					<div class="slide">
						<a href={src(variant)} target="_blank" rel="noopener" aria-label={t.openImage}>
							<img
								class="poster"
								src={src(variant)}
								alt={t.cardAlt.replace('{name}', card.metrics.pub.name)}
								width="1456"
								height="1048"
								loading={index === 0 ? 'eager' : 'lazy'}
							/>
						</a>
					</div>
				{/each}
			</div>

			<button
				type="button"
				class="slider-arrow slider-arrow-prev"
				aria-label={t.previous}
				disabled={active === 0}
				onclick={() => goTo(active - 1)}>‹</button
			>
			<button
				type="button"
				class="slider-arrow slider-arrow-next"
				aria-label={t.next}
				disabled={active === POSTCARD_VARIANTS.length - 1}
				onclick={() => goTo(active + 1)}>›</button
			>

			<div class="slider-dots">
				{#each POSTCARD_VARIANTS as variant, index (variant)}
					<button
						type="button"
						class="slider-dot"
						class:slider-dot-active={index === active}
						aria-label={t.goTo.replace('{n}', String(index + 1))}
						onclick={() => goTo(index)}
					></button>
				{/each}
			</div>
		</div>

		<!-- The actions, centred: download, copy the image, copy the link. -->
		<div class="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
			<!-- No download in the degraded state: half a postcard is not a gift. -->
			{#if card.source === 'archive'}
				<a
					class="btn btn-primary btn-lg"
					href={src(POSTCARD_VARIANTS[active])}
					download="{data.slug}-{POSTCARD_VARIANTS[active]}.png"
				>
					{t.download}
				</a>
			{/if}
			<button type="button" class="link-quiet" onclick={copyImage}>
				{imageCopied === 'done'
					? t.copiedImage
					: imageCopied === 'failed'
						? t.copyImageFailed
						: t.copyImage}
			</button>
			<button type="button" class="link-quiet" onclick={copyLink}>
				{linkCopied ? t.copiedLink : t.copyLink}
			</button>
		</div>

		<!-- The contagion loop: the gift invites the next one. -->
		<section class="section box bg-line/40">
			<h2 class="section-title">{t.makeYoursTitle}</h2>
			<p class="section-intro">{t.makeYoursBody}</p>
			<form method="GET" action="/postcard" class="mt-4 flex gap-2">
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

		<!-- Caveats stay visible: they qualify the images above them. -->
		<div class="mt-8 flex flex-col gap-2">
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
