<script lang="ts">
	import { Flame, FileText, PenLine, Heart, MessageCircle, Calendar, Trophy, Clock } from 'lucide-svelte';
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
	 * This page is a profile the author can show off, not a report: short
	 * labels, an icon and a colour per stat, and a hero-sized name up top. No
	 * slot is ever left empty — several metrics are conditional and simply are
	 * not painted when there is no figure.
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

	/**
	 * The headline stat row: icon, colour and figure together, so the template
	 * doesn't repeat the same five-line block once per metric. Colour rotates
	 * between the theme's ink/brand/signal so the row isn't a wall of black.
	 */
	const stats = $derived.by(() => {
		if (!card) return [];
		const m = card.metrics;
		const rows: { icon: typeof Flame; color: string; value: string; label: string; note?: string }[] = [
			{ icon: FileText, color: 'var(--color-ink)', value: es(m.totalPosts), label: t.labelPosts }
		];
		if (m.longestStreak >= 5) {
			rows.push({
				icon: Flame,
				color: 'var(--color-signal)',
				value: es(m.longestStreak),
				label: m.streakIsRecord ? t.labelStreakLive : t.labelStreak
			});
		}
		if (m.aggregates.words > 0) {
			rows.push({
				icon: PenLine,
				color: 'var(--color-brand)',
				value: es(m.aggregates.words),
				label: t.labelWords,
				note: m.aggregates.novels ? fill('labelNovels', m.aggregates.novels) : undefined
			});
		}
		if (m.aggregates.reactions > 0) {
			rows.push({
				icon: Heart,
				color: 'var(--color-signal)',
				value: es(m.aggregates.reactions),
				label: t.labelLikes
			});
		}
		if (m.aggregates.conversation > 0) {
			rows.push({
				icon: MessageCircle,
				color: 'var(--color-brand)',
				value: es(m.aggregates.conversation),
				label: t.labelConversation
			});
		}
		// Frequency: the most recent year's pace, posts divided by active months —
		// fair even mid-year, and it's the "how often do they show up" figure the
		// author never sees Substack surface on its own.
		const recentYear = m.years.at(-1);
		if (recentYear && recentYear.perMonth > 0) {
			rows.push({
				icon: Calendar,
				color: 'var(--color-ink)',
				value: recentYear.perMonth.toLocaleString('es-ES'),
				label: t.labelFrequency
			});
		}
		return rows;
	});

	const ceilings = $derived(
		card
			? [
					{ icon: Heart, color: 'var(--color-signal)', label: t.labelMostLiked, top: card.metrics.mostLiked, value: card.metrics.mostLiked?.post.reactions },
					{ icon: MessageCircle, color: 'var(--color-brand)', label: t.labelMostCommented, top: card.metrics.mostCommented, value: card.metrics.mostCommented?.post.comments },
					{ icon: Trophy, color: 'var(--color-ink)', label: t.labelLongest, top: card.metrics.longestPost, value: card.metrics.longestPost?.post.words }
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
		<!-- Hero: the name reads like a profile, not a report heading -->
		<header class="flex flex-wrap items-center gap-5">
			{#if card.metrics.pub.logoUrl}
				<img
					src={card.metrics.pub.logoUrl}
					alt=""
					class="h-20 w-20 shrink-0 rounded-full border-2 object-cover sm:h-24 sm:w-24"
					style="border-color: var(--color-signal); box-shadow: 0 8px 24px color-mix(in srgb, var(--color-signal) 25%, transparent)"
				/>
			{/if}
			<div class="flex flex-col gap-1">
				<h1 class="author-hero">{card.metrics.pub.name}</h1>
				<p class="body-text text-soft">
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
			</div>
		</header>

		{#if card.source === 'feed'}
			<p class="box-locked mt-6">{fill('noteFeed', es(card.metrics.totalPosts))}</p>
		{/if}
		{#if card.truncated}
			<p class="box-locked mt-6">{fill('noteTruncated', es(card.metrics.totalPosts))}</p>
		{/if}

		<!-- The spine: icon + colour + big number, one glance each -->
		<div class="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
			{#each stats as stat (stat.label)}
				<div
					class="box flex min-w-0 flex-col gap-3"
					style="box-shadow: 0 10px 28px color-mix(in srgb, {stat.color} 16%, transparent), 0 1px 0 rgba(23,23,23,.04)"
				>
					<span class="stat-icon" style="background: color-mix(in srgb, {stat.color} 14%, transparent)">
						<stat.icon size={20} color={stat.color} strokeWidth={2.25} />
					</span>
					<div class="min-w-0">
						<p class="figure text-2xl sm:text-3xl lg:text-4xl" style="color: {stat.color}">
							{stat.value}
						</p>
						<p class="figure-note">{stat.label}</p>
					</div>
					{#if stat.note}<p class="muted">{stat.note}</p>{/if}
				</div>
			{/each}
		</div>

		{#if card.lines.streak}<p class="body-text mt-6">{card.lines.streak}</p>{/if}

		<!-- The ceilings: their three best posts, one glance each -->
		{#if ceilings.length}
			<div class="mt-10 grid gap-4 sm:grid-cols-3">
				{#each ceilings as row (row.label)}
					<div class="box flex flex-col gap-2">
						<span class="flex items-center gap-2 figure-note">
							<row.icon size={16} color={row.color} strokeWidth={2.25} />
							{row.label}
						</span>
						<p class="body-text line-clamp-2">«{row.top!.post.title}»</p>
						<p class="muted">
							{es(row.value ?? 0) +
								(row.top!.showDate ? ` · ${dateName(row.top!.post.date.slice(0, 10))}` : '')}
						</p>
					</div>
				{/each}
			</div>
			{#if card.lines.likes}<p class="body-text mt-4">{card.lines.likes}</p>{/if}
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
		<div class="mt-10 flex flex-wrap gap-4">
			{#if card.metrics.bestMonth}
				<span class="chip bg-line text-ink normal-case">
					{monthName(`${card.metrics.bestMonth.month}-01`)}: {es(card.metrics.bestMonth.posts)} posts
				</span>
			{/if}
			{#if card.metrics.day}
				<span class="chip bg-line text-ink normal-case">
					<Calendar size={13} class="mr-1 inline-block" />
					{DAYS[card.metrics.day.weekday]}
				</span>
			{/if}
			{#if card.metrics.split}
				<span class="chip bg-line text-ink normal-case">
					{es(card.metrics.split.free)} {t.labelFree} / {es(card.metrics.split.paid)} {t.labelPaid}
				</span>
			{/if}
		</div>

		<div class="mt-6 flex flex-col gap-2">
			{#if card.lines.hour}
				<p class="body-text flex items-center gap-2">
					<Clock size={16} class="text-muted" />
					{card.lines.hour}
				</p>
			{/if}
			{#if signature}<p class="body-text">{signature}</p>{/if}
			<p class="muted">{fill('labelHeadlineLength', card.metrics.headlines.averageLength)}</p>
		</div>

		<!-- Caveats sit with the figures they qualify, not hidden in a footer -->
		<div class="mt-8 flex flex-col gap-2">
			{#if card.metrics.day || card.metrics.hour}<p class="muted">{t.noteUtc}</p>{/if}
			{#if card.importedCount > 0}
				<p class="muted">{fill('noteImported', es(card.importedCount))}</p>
			{/if}
		</div>

		<footer class="mt-12 flex flex-wrap items-center gap-6">
			<!-- No download in the degraded state: half a card is not a gift. -->
			{#if card.source === 'archive'}
				<a class="btn btn-primary" href="/author/{data.slug}/card.png" download="{data.slug}.png">
					{t.download}
				</a>
			{/if}
			<a class="link-quiet" href="/">{t.signature}</a>
		</footer>
	{/if}
</section>
