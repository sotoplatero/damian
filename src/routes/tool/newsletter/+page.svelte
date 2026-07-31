<script lang="ts">
	import { marked } from 'marked';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import { tick } from 'svelte';
	import raw from '$lib/content/tool-newsletter.md?raw';
	import type { Measurements } from '$lib/tools/newsletter/checks';
	import {
		DIMENSIONS,
		EFFORT_LABEL,
		type AuditItem,
		type Dimension,
		type Severity,
		type Tally
	} from '$lib/tools/newsletter/rules';
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
	 * y cómo de gordos, no qué dicen. Del servidor solo bajan gravedad, dimensión e
	 * impacto, así que no hay ni un hallazgo que sacar del HTML.
	 *
	 * El orden y las etiquetas de aquí son los del correo: `report.ts` lee las
	 * mismas claves de `tool-newsletter.md`. Antes esta pantalla y el correo
	 * llamaban de forma distinta a los mismos bloques y parecían dos informes.
	 */

	const { t, body } = parseCopy(raw);
	const intro = marked.parse(body) as string;

	type Preview = {
		site: string;
		name: string;
		card: { tagline: string; image: string | null; hasLogo: boolean };
		measurements: Measurements;
		tally: Tally;
		diagnosis: { veredicto: string; loQueSeEntiende: string; paraQuien: string } | null;
		first: AuditItem | null;
		locked: { severity: Severity; dimension: Dimension }[];
	};

	let url = $state('');
	let busy = $state<'' | 'analyzing' | 'sending'>('');
	let error = $state('');
	let preview = $state<Preview | null>(null);
	let email = $state('');
	/** El informe completo ya ha salido por correo. */
	let sent = $state(false);

	/**
	 * Una palabra, un color y un ancho por gravedad. Rojo solo para lo que de
	 * verdad sangra. El ancho es lo que rellena la barra de cada dimensión: dice
	 * cuánto pesa lo peor que hay ahí, no una nota — las notas se quitaron.
	 */
	const SEVERITY: Record<Severity, { label: string; chip: string; width: number }> = {
		grave: { label: 'Grave', chip: 'bg-error/15 text-error', width: 100 },
		medio: { label: 'Importante', chip: 'bg-ink/10 text-ink', width: 65 },
		leve: { label: 'Menor', chip: 'bg-line text-muted', width: 30 },
		oportunidad: { label: 'Libre', chip: 'bg-brand/10 text-brand', width: 45 }
	};

	/** El titular, de una regla de una línea. Ver `tally` en rules.ts. */
	const STATE_LINE: Record<Tally['state'], string> = {
		roto: 'Hay algo roto.',
		fugas: 'Funciona, y tiene fugas.',
		sano: 'Está sano.'
	};

	/** «3 hallazgos, 1 grave» — un recuento, que es un hecho y no un juicio. */
	function countLine(tally: Tally): string {
		if (!tally.total) return 'Ni un hallazgo';
		const parts = [`${tally.total} ${tally.total === 1 ? 'hallazgo' : 'hallazgos'}`];
		if (tally.grave) parts.push(`${tally.grave} grave${tally.grave === 1 ? '' : 's'}`);
		if (tally.medio) parts.push(`${tally.medio} importante${tally.medio === 1 ? '' : 's'}`);
		if (tally.oportunidad) parts.push(`${tally.oportunidad} de terreno libre`);
		return parts.join(', ');
	}

	const dimensions = Object.keys(DIMENSIONS) as Dimension[];

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
					.replace('{quickWins}', String(preview.tally.quickWins))
	);
</script>

<PageMeta
	title="Auditoría de tu newsletter — Damian Soto"
	description="Pega tu Substack y te digo qué está mal, con qué gravedad y cómo se arregla. Nota sobre 100 y el primer hallazgo con su arreglo escrito. Sin pedirte métricas."
/>

{#snippet introBlock()}
	<article class="rich-text">{@html intro}</article>
{/snippet}

{#if !preview}
	{@render introBlock()}
	{#if error}<p class="error-text mt-6">{error}</p>{/if}
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
	{#if error}<p class="error-text mt-6">{error}</p>{/if}

	<section id="informe" class="mt-10 space-y-6">
		<p class="muted">{t.readLine.replace('{site}', preview.site)}</p>

		<!-- El estado y el recuento. Va primero porque es lo único que se entiende
		     sin leer nada. Aquí había una nota sobre 100: se quitó porque cualquier
		     agregado sobre los hallazgos empeora cuando el tool encuentra más cosas.
		     El motivo largo está en `tally`, en rules.ts. -->
		<div class="box">
			<p class="section-title">{STATE_LINE[preview.tally.state]}</p>
			<p class="body-text mt-2">
				<strong>{countLine(preview.tally)}.</strong>
				{#if preview.tally.quickWins}
					{preview.tally.quickWins === 1
						? ' Uno se hace hoy mismo.'
						: ` ${preview.tally.quickWins} se hacen hoy mismo.`}
				{/if}
			</p>
			{#if preview.diagnosis?.veredicto}
				<p class="body-text mt-3">{preview.diagnosis.veredicto}</p>
			{/if}

			<div class="mt-5 grid gap-3 sm:grid-cols-5">
				{#each dimensions as dimension (dimension)}
					{@const d = preview.tally.byDimension[dimension]}
					<div>
						<div class="flex items-baseline justify-between gap-2">
							<p class="eyebrow">{DIMENSIONS[dimension]}</p>
							<p class="figure-note">{d.total || '—'}</p>
						</div>
						<!-- La barra dice cuánto pesa lo peor de esa dimensión, no una nota. -->
						<div class="meter mt-1">
							<span style="width: {d.worst ? SEVERITY[d.worst].width : 0}%"></span>
						</div>
					</div>
				{/each}
			</div>
			<p class="muted mt-4">{t.stateNote}</p>
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
					<p class="figure">{stat.v}</p>
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
		{#if preview.diagnosis?.paraQuien}
			<article class="box">
				<p class="eyebrow">{t.labelAudience}</p>
				<p class="body-text mt-1">{preview.diagnosis.paraQuien}</p>
				<p class="muted mt-3">{t.audienceNote}</p>
			</article>
		{/if}

		<!-- El nicho: el juicio que demuestra que la auditoría vale algo. -->
		{#if preview.diagnosis?.loQueSeEntiende}
			<article class="box">
				<p class="eyebrow">{t.labelNiche}</p>
				<p class="body-text mt-1">{preview.diagnosis.loQueSeEntiende}</p>
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
				<p class="box-title mt-2">{f.hecho}</p>
				{#if f.evidencia}
					<!-- Si lo encontró leyendo, la evidencia es una cita literal ya
					     verificada contra el original: se enseña como cita. -->
					{#if f.origen === 'abierto'}
						<blockquote class="mt-2 border-l-2 border-line pl-3 text-soft">{f.evidencia}</blockquote>
					{:else}
						<p class="mt-1 text-soft">{f.evidencia}</p>
					{/if}
				{/if}
				<p class="muted mt-3">{DIMENSIONS[f.dimension]} · {EFFORT_LABEL[f.effort]}</p>
				<div class="mt-4 border-t border-line pt-4">
					<p class="eyebrow">{t.labelFix}</p>
					<p class="body-text mt-1">{f.propuesta}</p>
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
							<p class="eyebrow shrink-0">{DIMENSIONS[item.dimension]}</p>
							<!-- El ancho es su gravedad: se ve el tamaño de lo que falta, no el texto. -->
							<div class="meter flex-1 opacity-40">
								<span style="width: {SEVERITY[item.severity].width}%"></span>
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
