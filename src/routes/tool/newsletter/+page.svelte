<script lang="ts">
	import { marked } from 'marked';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import { tick } from 'svelte';
	import raw from '$lib/content/tool-newsletter.md?raw';
	import { AREAS, effortLabel, type Area, type Finding, type Measurements, type Scores } from '$lib/tools/newsletter/checks';
	import { parseCopy } from '$lib/content';
	import InlineForm from '$lib/components/InlineForm.svelte';

	/**
	 * Lo que se enseña sin pedir nada, y por qué justo esto.
	 *
	 * La nota y las cinco dimensiones dan el diagnóstico de un vistazo. La tarjeta
	 * reconstruida es el bloque que produce el "esto es verdad": no es un juicio,
	 * es lo que ya tiene puesto, visto por primera vez desde fuera. Y el primer
	 * hallazgo va COMPLETO, con su arreglo, porque sin verlo hay que creerse de
	 * palabra que lo de detrás del muro vale algo.
	 *
	 * Lo que queda tapado son barras a la anchura de su impacto: se ve cuántos son
	 * y cómo de gordos, no qué dicen. Del servidor solo bajan gravedad, área e
	 * impacto, así que no hay ni un hallazgo que sacar del HTML.
	 */

	const { t, body } = parseCopy(raw);
	const intro = marked.parse(body) as string;

	type Preview = {
		site: string;
		name: string;
		card: { tagline: string; image: string | null; hasLogo: boolean };
		measurements: Measurements;
		scores: Scores;
		niche: {
			veredicto?: string;
			loQueSeEntiende?: string;
			claro?: boolean;
			porQue?: string;
			paraQuien?: string;
		} | null;
		first: Finding | null;
		locked: { severity: Finding['severity']; area: Area; impact: number }[];
		quickWins: number;
	};

	let url = $state('');
	let busy = $state<'' | 'analyzing' | 'sending'>('');
	let error = $state('');
	let preview = $state<Preview | null>(null);
	let email = $state('');
	/** El informe completo ya ha salido por correo. */
	let sent = $state(false);

	/** Una palabra y un color por gravedad. Rojo solo para lo que de verdad sangra. */
	const SEVERITY: Record<Finding['severity'], { label: string; chip: string }> = {
		grave: { label: 'Grave', chip: 'bg-error/15 text-error' },
		medio: { label: 'Importante', chip: 'bg-ink/10 text-ink' },
		leve: { label: 'Menor', chip: 'bg-line text-muted' },
		oportunidad: { label: 'Libre', chip: 'bg-brand/10 text-brand' }
	};

	const areas = Object.keys(AREAS) as Area[];

	function errorFor(code: unknown): string {
		if (code === 'unreadable') return t.errorUnreadable;
		if (code === 'disposable') return t.errorDisposable;
		if (code === 'invalid_email') return t.errorInvalidEmail;
		if (code === 'send_failed') return t.errorSendFailed;
		if (code === 'rate_limit') return t.errorRateLimit;
		return t.errorGeneric;
	}

	async function post(payload: Record<string, unknown>) {
		const response = await fetch('/tool/newsletter', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const data = await response.json().catch(() => ({}));
		if (!response.ok) throw new Error(errorFor(data?.error));
		return data;
	}

	async function analyze() {
		busy = 'analyzing';
		error = '';
		try {
			preview = await post({ step: 'analyze', url });
			await tick();
			document.getElementById('informe')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = '';
		}
	}

	/** El informe completo no baja al navegador: se genera y se envía en el servidor. */
	async function send() {
		busy = 'sending';
		error = '';
		try {
			await post({ step: 'unlock', url, email });
			sent = true;
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = '';
		}
	}

	function restart() {
		url = '';
		preview = null;
		email = '';
		sent = false;
		error = '';
		busy = '';
	}

	const total = $derived(preview ? 1 + preview.locked.length : 0);

	const gateBody = $derived(
		!preview
			? ''
			: (preview.locked.length ? t.gateBody : t.gateBodyClean)
					.replace('{rest}', String(preview.locked.length))
					.replace('{quickWins}', String(preview.quickWins))
	);
</script>

<PageMeta
	title="Qué se ve de tu newsletter desde fuera — Damian Soto"
	description="Pega tu Substack y te doy una nota sobre 100, lo que ve quien comparte tu enlace, y el primer fallo con su arreglo. Sin pedirte métricas."
/>

{#snippet introBlock()}
	<article class="prose prose-xl prose-neutral max-w-none">{@html intro}</article>
{/snippet}

{#if !preview}
	{@render introBlock()}
	{#if error}<p class="mt-6 text-sm text-error">{error}</p>{/if}
	<div class="mt-8">
		<InlineForm
			bind:value={url}
			placeholder={t.urlPlaceholder}
			label={t.urlButton}
			busyLabel={t.urlScanning}
			busy={busy === 'analyzing'}
			inputmode="url"
			autocomplete="url"
			onsubmit={analyze}
		/>
	</div>
{:else}
	{@render introBlock()}
	{#if error}<p class="mt-6 text-sm text-error">{error}</p>{/if}

	<section id="informe" class="mt-10 space-y-6">
		<p class="muted">{t.readLine.replace('{site}', preview.site)}</p>

		<!-- La nota. Va primero porque es lo único que se entiende sin leer nada. -->
		<div class="box">
			<div class="flex items-baseline gap-3">
				<p class="text-6xl font-bold leading-none">{preview.scores.total}</p>
				<p class="muted">{t.scoreOutOf}</p>
			</div>
			{#if preview.niche?.veredicto}
				<p class="body-text mt-3">{preview.niche.veredicto}</p>
			{/if}

			<div class="mt-5 grid gap-3 sm:grid-cols-5">
				{#each areas as area (area)}
					<div>
						<div class="flex items-baseline justify-between gap-2">
							<p class="eyebrow">{AREAS[area]}</p>
							<p class="text-sm font-bold">{preview.scores.byArea[area]}</p>
						</div>
						<div class="meter mt-1"><span style="width: {preview.scores.byArea[area]}%"></span></div>
					</div>
				{/each}
			</div>
			<p class="muted mt-4">{t.scoreNote}</p>
		</div>

		<!-- Las cifras: lo único que nadie puede discutir. -->
		<div class="box grid grid-cols-2 gap-4 sm:grid-cols-4">
			{#each [
				{ k: t.labelPosts, v: String(preview.measurements.posts) },
				{ k: t.labelEvery, v: `${preview.measurements.cadenceMedianDays} días` },
				{ k: t.labelLast, v: `hace ${preview.measurements.daysSinceLast} d` },
				{ k: t.labelEngagement, v: `${preview.measurements.engagementPerPost}/post` }
			] as stat (stat.k)}
				<div>
					<p class="eyebrow">{stat.k}</p>
					<p class="text-xl font-bold">{stat.v}</p>
				</div>
			{/each}
		</div>

		<!-- La tarjeta reconstruida. No es un juicio: es lo que ya tiene puesto,
		     visto desde fuera. De todo el informe es lo que más convence. -->
		<div class="box">
			<p class="eyebrow">{t.labelCard}</p>
			<div class="mt-3 rounded-lg border border-line">
				{#if preview.card.image}
					<!-- Su imagen de verdad, servida por Substack. Sin referrer y con
					     proporción fija: si tarda o falla, la tarjeta no salta. -->
					<img
						src={preview.card.image}
						alt=""
						loading="lazy"
						referrerpolicy="no-referrer"
						class="aspect-[1.91/1] w-full rounded-t-lg border-b border-line object-cover"
					/>
				{:else}
					<div
						class="flex aspect-[1.91/1] items-center justify-center rounded-t-lg border-b border-line bg-line/40"
					>
						<p class="muted px-4 text-center">{t.cardNoImage}</p>
					</div>
				{/if}
				<div class="p-4">
					<p class="muted">{preview.site}</p>
					<p class="box-title mt-1">{preview.name || t.cardNoName}</p>
					{#if preview.card.tagline}
						<p class="mt-1 text-soft">{preview.card.tagline}</p>
					{:else}
						<p class="muted mt-1 italic">{t.cardNoTagline}</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Para quién escribe. Nadie se lo dice nunca, y es lo que más sorprende. -->
		{#if preview.niche?.paraQuien}
			<article class="box">
				<p class="eyebrow">{t.labelAudience}</p>
				<p class="body-text mt-1">{preview.niche.paraQuien}</p>
				<p class="muted mt-3">{t.audienceNote}</p>
			</article>
		{/if}

		<!-- El nicho: el juicio que demuestra que el análisis vale algo. -->
		{#if preview.niche?.loQueSeEntiende}
			<article class="box">
				<p class="eyebrow">{t.labelNiche}</p>
				<p class="body-text mt-1">{preview.niche.loQueSeEntiende}</p>
				{#if preview.niche.porQue}<p class="muted mt-2">{preview.niche.porQue}</p>{/if}
			</article>
		{/if}

		<!-- El primero, completo y con su arreglo. Es la prueba. -->
		{#if preview.first}
			{@const f = preview.first}
			<article class="box">
				<div class="flex items-center justify-between gap-3">
					<p class="eyebrow">{t.labelFirst.replace('{total}', String(total))}</p>
					<span class="chip {SEVERITY[f.severity].chip}">{SEVERITY[f.severity].label}</span>
				</div>
				<p class="box-title mt-2">{f.fact}</p>
				{#if f.detail}<p class="mt-1 text-soft">{f.detail}</p>{/if}
				<p class="muted mt-3">
					{t.labelImpact.replace('{impact}', String(f.impact))} · {effortLabel(f.effort)}
				</p>
				<div class="mt-4 border-t border-line pt-4">
					<p class="eyebrow">{t.labelFix}</p>
					<p class="body-text mt-1">{f.fix}</p>
				</div>
			</article>
		{/if}

		<!-- Lo que queda: se ve cuántos y cómo de gordos, no qué dicen. -->
		{#if preview.locked.length}
			<div class="box-locked">
				<p class="eyebrow">{t.labelLocked.replace('{rest}', String(preview.locked.length))}</p>
				<div class="mt-3 space-y-3">
					{#each preview.locked as item, i (i)}
						<div class="flex items-center gap-3">
							<span class="chip {SEVERITY[item.severity].chip} shrink-0">
								{SEVERITY[item.severity].label}
							</span>
							<!-- El ancho es su impacto: se ve el tamaño de lo que falta, no el texto. -->
							<div class="meter flex-1 opacity-40">
								<span style="width: {item.impact * 10}%"></span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- El muro -->
		<section class="box bg-line/40">
			{#if sent}
				<h2 class="section-title">{t.sentTitle}</h2>
				<p class="section-intro">{t.sentBody}</p>
			{:else}
				<h2 class="section-title">{t.gateTitle}</h2>
				<p class="section-intro">{gateBody}</p>
				<div class="mt-4">
					<InlineForm
						type="email"
						bind:value={email}
						placeholder={t.gatePlaceholder}
						label={t.gateButton}
						busyLabel={t.gateSending}
						busy={busy === 'sending'}
						inputmode="email"
						autocomplete="email"
						onsubmit={send}
					/>
				</div>
			{/if}
		</section>

		<button type="button" onclick={restart} class="link-quiet">{t.restart}</button>
	</section>
{/if}
