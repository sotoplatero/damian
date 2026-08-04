<script lang="ts">
	import { ArrowUpRight, Heart, MessageCircle, Repeat2, CalendarDays } from 'lucide-svelte';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import Heatmap from '$lib/components/author/Heatmap.svelte';
	import Bars from '$lib/components/author/Bars.svelte';
	import { parseCopy } from '$lib/content';
	import raw from '$lib/content/author.md?raw';
	import type { PageData } from './$types';

	/**
	 * The author profile.
	 *
	 * Built as a profile page and not as a report: banner, avatar, name, tagline,
	 * a row of headline numbers, then their best post and their latest ones with
	 * real cover art. The images are what stop it looking unfinished — a page of
	 * numbers on cards reads as a spreadsheet no matter how it's styled.
	 *
	 * Everything arrives already computed from the server load; there is no
	 * client-side fetching. Conditional metrics simply aren't painted when there
	 * is no figure — never an "N/A", never a zero, never an empty slot.
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
	const shortDate = (iso: string) =>
		`${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)} ${iso.slice(0, 4)}`;

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
	 * The headline number row. Four at most: past that they stop being headlines.
	 * Each one is dropped rather than shown as a zero — a profile with "0
	 * restacks" on it is worse than one that doesn't mention restacks.
	 */
	const stats = $derived.by(() => {
		if (!card) return [];
		const a = card.metrics.aggregates;
		const pace = card.metrics.years.at(-1)?.perMonth ?? 0;
		return [
			{ icon: Heart, value: a.reactions, label: t.labelLikes },
			{ icon: MessageCircle, value: a.conversation, label: t.labelConversation },
			{ icon: Repeat2, value: a.restacks, label: t.labelRestacks },
			{ icon: CalendarDays, value: pace, label: t.labelFrequency }
		].filter((s) => s.value > 0);
	});

	/** Their single best post, by likes. The profile's centrepiece. */
	const best = $derived(card?.metrics.mostLiked ?? null);

	/** The latest posts, minus the one already shown as the best. */
	const recent = $derived(
		card ? card.metrics.recent.filter((p) => p.slug !== best?.post.slug).slice(0, 4) : []
	);

	const postUrl = (slug: string) => `${card?.metrics.pub.origin}/p/${slug}`;
</script>

<PageMeta
	title={card ? `${card.metrics.pub.name} en números` : t.title}
	description={card
		? `La historia pública de ${card.metrics.pub.name}, en una tarjeta.`
		: t.description}
	image={card ? `/author/${data.slug}/card.png` : undefined}
/>

{#if !card}
	<section class="section">
		<div class="screen-center gap-4">
			<p class="body-text">{errorText}</p>
			<a class="link-quiet" href="/author">{t.restart}</a>
		</div>
	</section>
{:else}
	<article class="profile">
		<!-- Banner tinted with the publication's own accent colour. Deliberately
		     not their cover photo: that URL 403s (private bucket) and is square. -->
		<div
			class="profile-banner"
			style={card.metrics.pub.brandColor
				? `--tint: ${card.metrics.pub.brandColor}`
				: '--tint: var(--color-signal)'}
		></div>

		<!--
			The avatar sits alone on the banner and the name goes underneath at full
			width — the X/GitHub profile shape. Putting the name beside the avatar was
			tried and dropped: at this column width (632px measured) the avatar and the
			outbound link left so little room that "The Honest Broker" wrapped onto two
			lines.
		-->
		<header class="profile-head">
			<div class="flex items-end justify-between gap-4">
				{#if card.metrics.pub.logoUrl}
					<img class="profile-avatar" src={card.metrics.pub.logoUrl} alt="" />
				{/if}
				<a
					class="profile-link"
					href={card.metrics.pub.origin}
					target="_blank"
					rel="noopener noreferrer"
				>
					{t.labelViewOnSubstack}
					<ArrowUpRight size={15} />
				</a>
			</div>

			<div class="mt-4 flex flex-col gap-2">
				<h1 class="profile-name">{card.metrics.pub.name}</h1>
				{#if card.metrics.pub.tagline}
					<p class="profile-tagline">{card.metrics.pub.tagline}</p>
				{/if}
				<p class="muted">
					{card.metrics.pub.authorName}
					{#if card.metrics.pub.createdAt}
						· {t.labelSince} {monthName(card.metrics.pub.createdAt.slice(0, 10))}
					{/if}
					<!-- Only when the publication shows it on its own homepage. -->
					{#if card.metrics.pub.subscriberCount}
						· {es(card.metrics.pub.subscriberCount)} {t.labelSubscribers}
					{/if}
				</p>
			</div>
		</header>

		{#if card.source === 'feed'}
			<p class="box-locked mt-8">{fill('noteFeed', es(card.metrics.totalPosts))}</p>
		{/if}
		{#if card.truncated}
			<p class="box-locked mt-8">{fill('noteTruncated', es(card.metrics.totalPosts))}</p>
		{/if}

		<!-- The headline numbers: one band, dividers, no boxes -->
		<div class="profile-stats">
			<div class="stat-cell">
				<p class="stat-value">{es(card.metrics.totalPosts)}</p>
				<p class="figure-note">{t.labelPosts}</p>
			</div>
			<div class="stat-cell">
				<p class="stat-value" style="color: var(--color-signal)">
					{es(card.metrics.longestStreak)}
				</p>
				<p class="figure-note">
					{card.metrics.streakIsRecord ? t.labelStreakLive : t.labelStreak}
				</p>
			</div>
			{#each stats as stat (stat.label)}
				<div class="stat-cell">
					<p class="stat-value">{es(stat.value)}</p>
					<p class="figure-note flex items-center gap-1.5">
						<stat.icon size={13} />
						{stat.label}
					</p>
				</div>
			{/each}
		</div>

		{#if card.metrics.aggregates.words > 0}
			<!-- The one figure nobody ever sees summed, given its own band -->
			<div class="profile-words">
				<p class="stat-value">{es(card.metrics.aggregates.words)}</p>
				<p class="figure-note">
					{t.labelWords}{#if card.metrics.aggregates.novels}
						· {fill('labelNovels', card.metrics.aggregates.novels)}{/if}
				</p>
			</div>
		{/if}

		{#if card.lines.streak}<p class="body-text mt-8">{card.lines.streak}</p>{/if}

		<!-- Their best post: the centrepiece, with its cover art -->
		{#if best}
			<section class="mt-14">
				<h2 class="eyebrow mb-4">{t.labelBestPost}</h2>
				<a class="post-hero" href={postUrl(best.post.slug)} target="_blank" rel="noopener noreferrer">
					{#if best.post.coverImage}
						<img src={best.post.coverImage} alt="" />
					{/if}
					<div class="flex flex-col gap-3">
						<p class="post-hero-title">{best.post.title}</p>
						{#if best.post.subtitle}
							<p class="body-text line-clamp-2 text-soft">{best.post.subtitle}</p>
						{/if}
						<p class="muted flex flex-wrap items-center gap-4">
							<span class="flex items-center gap-1.5">
								<Heart size={14} style="color: var(--color-signal)" />
								{es(best.post.reactions)}
							</span>
							{#if best.post.comments > 0}
								<span class="flex items-center gap-1.5">
									<MessageCircle size={14} />
									{es(best.post.comments)}
								</span>
							{/if}
							{#if best.post.restacks > 0}
								<span class="flex items-center gap-1.5">
									<Repeat2 size={14} />
									{es(best.post.restacks)}
								</span>
							{/if}
							{#if best.showDate}
								<span>{dateName(best.post.date.slice(0, 10))}</span>
							{/if}
						</p>
					</div>
				</a>
			</section>
		{/if}

		<!-- Latest posts, with art -->
		{#if recent.length}
			<section class="mt-14">
				<h2 class="eyebrow mb-4">{t.labelRecent}</h2>
				<div class="post-grid">
					{#each recent as post (post.slug)}
						<a class="post-card" href={postUrl(post.slug)} target="_blank" rel="noopener noreferrer">
							<div class="post-thumb">
								{#if post.coverImage}
									<img src={post.coverImage} alt="" />
								{/if}
							</div>
							<p class="post-card-title">{post.title}</p>
							<p class="muted flex items-center gap-3">
								<span class="flex items-center gap-1">
									<Heart size={12} />
									{es(post.reactions)}
								</span>
								<span>{shortDate(post.date.slice(0, 10))}</span>
							</p>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Constancy -->
		{#if card.metrics.heatmap.length}
			<section class="mt-14">
				<h2 class="eyebrow mb-4">{t.labelHeatmap}</h2>
				<Heatmap rows={card.metrics.heatmap} />
			</section>
		{/if}

		<!-- Their words -->
		{#if card.metrics.words.length}
			<section class="mt-14">
				<h2 class="eyebrow mb-4">{t.labelWordsTop}</h2>
				<Bars items={card.metrics.words.map((w) => ({ label: w.word, value: w.posts }))} />
				{#if card.lines.words}<p class="body-text mt-4">{card.lines.words}</p>{/if}
			</section>
		{/if}

		<!-- Posts per year. The year in progress is labelled or the short bar lies. -->
		{#if card.metrics.years.length > 1}
			<section class="mt-14">
				<h2 class="eyebrow mb-4">{t.labelYears}</h2>
				<Bars
					items={card.metrics.years.map((y) => ({
						label: String(y.year),
						value: y.posts,
						note: y.inProgress ? `· ${t.labelInProgress}` : ''
					}))}
				/>
				{#if card.lines.cadence}<p class="body-text mt-4">{card.lines.cadence}</p>{/if}
			</section>
		{/if}

		<!-- Habits, as chips: short facts that don't deserve a heading each -->
		<div class="mt-12 flex flex-wrap gap-3">
			{#if card.metrics.bestMonth}
				<span class="chip-soft">
					{monthName(`${card.metrics.bestMonth.month}-01`)} · {es(card.metrics.bestMonth.posts)} posts
				</span>
			{/if}
			{#if card.metrics.day}
				<span class="chip-soft">{DAYS[card.metrics.day.weekday]}</span>
			{/if}
			{#if card.metrics.split}
				<span class="chip-soft">
					{es(card.metrics.split.free)} {t.labelFree} · {es(card.metrics.split.paid)} {t.labelPaid}
				</span>
			{/if}
		</div>

		<div class="mt-6 flex flex-col gap-2">
			{#if card.lines.hour}<p class="body-text">{card.lines.hour}</p>{/if}
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
	</article>
{/if}
