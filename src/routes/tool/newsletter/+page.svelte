<script lang="ts">
	import { marked } from 'marked';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import { tick } from 'svelte';
	import raw from '$lib/content/tool-newsletter.md?raw';
	import type { Measurements } from '$lib/tools/newsletter/checks';
	import { parseCopy } from '$lib/content';
	import InlineForm from '$lib/components/InlineForm.svelte';

	const { t, body } = parseCopy(raw);
	const intro = marked.parse(body) as string;

	type Preview = {
		site: string;
		name: string;
		measurements: Measurements;
		niche: { loQueSeEntiende?: string; claro?: boolean; porQue?: string } | null;
		pending: { defects: number; opportunities: number };
	};

	let url = $state('');
	let busy = $state<'' | 'analyzing' | 'sending'>('');
	let error = $state('');
	let preview = $state<Preview | null>(null);
	let email = $state('');
	/** El informe completo ya ha salido por correo. */
	let sent = $state(false);

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

	const gateBody = $derived(
		!preview
			? ''
			: (preview.pending.defects ? t.gateBody : t.gateBodyClean)
					.replace('{defects}', String(preview.pending.defects))
					.replace('{opportunities}', String(preview.pending.opportunities))
	);
</script>

<PageMeta
	title="Qué se ve de tu newsletter desde fuera — Damian Soto"
	description="Pega tu Substack y te digo si se entiende de qué va, si la promesa vende y qué tienes sin tocar. Sin pedirte métricas."
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

		<!-- El nicho: el único bloque de juicio que se regala. Es el que demuestra
		     que el análisis vale algo, y con eso se pide el correo. -->
		{#if preview.niche?.loQueSeEntiende}
			<article class="box">
				<p class="eyebrow">{t.labelNiche}</p>
				<p class="body-text mt-1">{preview.niche.loQueSeEntiende}</p>
				{#if preview.niche.porQue}<p class="muted mt-2">{preview.niche.porQue}</p>{/if}
			</article>
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
