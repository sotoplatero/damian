<script lang="ts">
	import PageMeta from '$lib/components/PageMeta.svelte';
	import Heatmap from '$lib/components/author/Heatmap.svelte';
	import Bars from '$lib/components/author/Bars.svelte';
	import { parseCopy } from '$lib/content';
	import raw from '$lib/content/author.md?raw';
	import type { PageData } from './$types';

	/**
	 * The card.
	 *
	 * Everything arrives already computed from the server load, so there is no
	 * client-side fetching here at all.
	 *
	 * No slot is ever left empty: several metrics are conditional and simply are
	 * not painted when there is no figure. Never an "N/A", never a zero, never an
	 * empty box. The honest caveats sit next to the figures they qualify rather
	 * than hidden in a footer — they are part of the figure.
	 */
	let { data }: { data: PageData } = $props();

	const { t } = parseCopy(raw);
	const es = (n: number) => n.toLocaleString('es-ES');
	const fill = (key: string, n: number | string) => (t[key] ?? '').replace('{n}', String(n));

	const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
	const MONTHS = [
		'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
		'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
	];
	const monthName = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}`;
	const dateName = (iso: string) => `${Number(iso.slice(8, 10))} de ${monthName(iso)}`;

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

	/** The headline tic, if there is one. Only the dominant one is shown. */
	const signature = $derived.by(() => {
		const sig = card?.metrics.headlines.signature;
		if (!sig) return null;
		const key = { question: 'signatureQuestion', number: 'signatureNumber', colon: 'signatureColon' }[
			sig.kind
		];
		// Out of ten reads better than a percentage for a writing habit.
		return fill(key, Math.round(sig.share * 10));
	});

	const ceilings = $derived(
		card
			? [
					{ label: t.labelMostLiked, top: card.metrics.mostLiked, value: card.metrics.mostLiked?.post.reactions },
					{ label: t.labelMostCommented, top: card.metrics.mostCommented, value: card.metrics.mostCommented?.post.comments },
					{ label: t.labelLongest, top: card.metrics.longestPost, value: card.metrics.longestPost?.post.words }
				].filter((row) => row.top)
			: []
	);
</script>

<PageMeta
	title={card ? `${card.metrics.pub.name} en números` : t.title}
	description={card
		? `La historia pública de ${card.metrics.pub.name}, en una tarjeta.`
		: t.description}
	image={card ? `/author/${data.slug}/card.png` : undefined}
/>

<section class="section">
	{#if !card}
		<div class="screen-center gap-4">
			<p class="body-text">{errorText}</p>
			<a class="link-quiet" href="/author">{t.restart}</a>
		</div>
	{:else}
		<header class="flex flex-col gap-2">
			<h1 class="box-title">{card.metrics.pub.name}</h1>
			<p class="muted">
				{card.metrics.pub.authorName}
				{#if card.metrics.pub.createdAt}
					· {t.labelSince} {monthName(card.metrics.pub.createdAt.slice(0, 10))}
				{/if}
				<!-- Only if the publication shows it on its own homepage. If it doesn't,
				     nothing is said: no number, no vague label, no gap. -->
				{#if card.metrics.pub.subscriberCount}
					· {es(card.metrics.pub.subscriberCount)} {t.labelSubscribers}
				{/if}
			</p>
		</header>

		{#if card.source === 'feed'}
			<p class="box-locked mt-6">{fill('noteFeed', es(card.metrics.totalPosts))}</p>
		{/if}
		{#if card.truncated}
			<p class="box-locked mt-6">{fill('noteTruncated', es(card.metrics.totalPosts))}</p>
		{/if}

		<!-- The spine: what always exists -->
		<div class="mt-10 grid gap-10 sm:grid-cols-2">
			<div>
				<p class="figure">{es(card.metrics.totalPosts)}</p>
				<p class="figure-note">{t.labelPosts}</p>
			</div>
			<div>
				<p class="figure">{es(card.metrics.longestStreak)}</p>
				<p class="figure-note">
					{card.metrics.streakIsRecord ? t.labelStreakLive : t.labelStreak}
				</p>
				{#if card.lines.streak}<p class="body-text mt-2">{card.lines.streak}</p>{/if}
			</div>
			{#if card.metrics.aggregates.words > 0}
				<div>
					<p class="figure">{es(card.metrics.aggregates.words)}</p>
					<p class="figure-note">{t.labelWords}</p>
					{#if card.metrics.aggregates.novels}
						<p class="body-text mt-2">{fill('labelNovels', card.metrics.aggregates.novels)}</p>
					{/if}
				</div>
			{/if}
			{#if card.metrics.aggregates.reactions > 0}
				<div>
					<p class="figure">{es(card.metrics.aggregates.reactions)}</p>
					<p class="figure-note">{t.labelLikes}</p>
				</div>
			{/if}
			{#if card.metrics.aggregates.conversation > 0}
				<div>
					<p class="figure">{es(card.metrics.aggregates.conversation)}</p>
					<p class="figure-note">{t.labelConversation}</p>
				</div>
			{/if}
		</div>

		<!-- The ceilings -->
		{#if ceilings.length}
			<div class="mt-12 flex flex-col gap-6">
				{#each ceilings as row (row.label)}
					<div class="box">
						<p class="figure-note">{row.label}</p>
						<p class="body-text">«{row.top!.post.title}»</p>
						<p class="muted">
							{es(row.value ?? 0)}{#if row.top!.showDate} · {dateName(row.top!.post.date.slice(0, 10))}{/if}
						</p>
					</div>
				{/each}
				{#if card.lines.likes}<p class="body-text">{card.lines.likes}</p>{/if}
			</div>
		{/if}

		<!-- The heatmap -->
		{#if card.metrics.heatmap.length}
			<div class="mt-12">
				<p class="figure-note mb-3">{t.labelHeatmap}</p>
				<Heatmap rows={card.metrics.heatmap} />
			</div>
		{/if}

		<!-- Their words -->
		{#if card.metrics.words.length}
			<div class="mt-12">
				<p class="figure-note mb-3">{t.labelWordsTop}</p>
				<Bars items={card.metrics.words.map((w) => ({ label: w.word, value: w.posts }))} />
				{#if card.lines.words}<p class="body-text mt-3">{card.lines.words}</p>{/if}
			</div>
		{/if}

		<!-- Posts per year. The year in progress is labelled or the short bar lies. -->
		{#if card.metrics.years.length > 1}
			<div class="mt-12">
				<p class="figure-note mb-3">{t.labelYears}</p>
				<Bars
					items={card.metrics.years.map((y) => ({
						label: String(y.year),
						value: y.posts,
						note: y.inProgress ? `· ${t.labelInProgress}` : ''
					}))}
				/>
				{#if card.lines.cadence}<p class="body-text mt-3">{card.lines.cadence}</p>{/if}
			</div>
		{/if}

		<!-- The conditional ones: no figure, no slot -->
		<div class="mt-12 flex flex-col gap-4">
			{#if card.metrics.bestMonth}
				<p class="body-text">
					{t.labelBestMonth}: {monthName(`${card.metrics.bestMonth.month}-01`)},
					{es(card.metrics.bestMonth.posts)} posts.
				</p>
			{/if}
			{#if card.metrics.day}
				<p class="body-text">
					{t.labelDay}: {DAYS[card.metrics.day.weekday]}, {Math.round(card.metrics.day.share * 100)}%
					de sus posts.
				</p>
			{/if}
			{#if card.lines.hour}<p class="body-text">{card.lines.hour}</p>{/if}
			{#if signature}<p class="body-text">{signature}</p>{/if}
			{#if card.metrics.split}
				<p class="body-text">
					{t.labelSplit}: {es(card.metrics.split.free)} {t.labelFree} y
					{es(card.metrics.split.paid)} {t.labelPaid}.
				</p>
			{/if}
			<p class="muted">{fill('labelHeadlineLength', card.metrics.headlines.averageLength)}</p>
		</div>

		<!-- Caveats sit with the figures they qualify, not hidden in a footer -->
		<div class="mt-10 flex flex-col gap-2">
			{#if card.metrics.day || card.metrics.hour}<p class="muted">{t.noteUtc}</p>{/if}
			{#if card.importedCount > 0}
				<p class="muted">{fill('noteImported', es(card.importedCount))}</p>
			{/if}
		</div>

		<footer class="mt-12 flex flex-wrap items-center gap-6">
			<!-- No download in the degraded state: half a card is not a gift. -->
			{#if card.source === 'archive'}
				<a class="box-link" href="/author/{data.slug}/card.png" download="{data.slug}.png">
					<span class="box-title">{t.download}</span>
				</a>
			{/if}
			<a class="link-quiet" href="/">{t.signature}</a>
		</footer>
	{/if}
</section>
