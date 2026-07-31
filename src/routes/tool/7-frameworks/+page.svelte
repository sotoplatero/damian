<script lang="ts">
	import { marked } from 'marked';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import { tick } from 'svelte';
	import raw from '$lib/content/tool-7-frameworks.md?raw';
	import { frameworks, freeFramework } from '$lib/tools/7-frameworks/frameworks';
	import { toPlainText, type GeneratedCopy } from '$lib/tools/7-frameworks/format';
	import { parseCopy } from '$lib/content';
	import InlineForm from '$lib/components/InlineForm.svelte';

	const { t, body } = parseCopy(raw);
	const intro = marked.parse(body) as string;

	type Busy = '' | 'analyzing' | 'unlocking';

	let busy = $state<Busy>('');
	let error = $state('');

	let url = $state('');
	/** La oferta que el modelo dedujo. Viaja al servidor otra vez para escribir los seis restantes. */
	let offer = $state<Record<string, string> | null>(null);
	let site = $state('');
	let lowConfidence = $state(false);

	let copies = $state<GeneratedCopy[]>([]);
	/** El correo con los siete ya ha salido. */
	let sent = $state(false);
	let email = $state('');
	let copiedId = $state('');

	const byId = $derived(new Map(copies.map((copy) => [copy.id, copy])));

	/** Los que ya están escritos primero; los bloqueados, detrás del muro. */
	const ordered = $derived([
		...frameworks.filter((f) => byId.has(f.id)),
		...frameworks.filter((f) => !byId.has(f.id))
	]);

	/** El muro se intercala justo detrás de lo último que ya puede leer. */
	const gateAfter = $derived(copies.length);

	function errorFor(code: unknown): string {
		if (code === 'unreadable') return t.errorUnreadable;
		if (code === 'invalid_email') return t.errorInvalidEmail;
		if (code === 'disposable') return t.errorDisposable;
		if (code === 'send_failed') return t.errorSendFailed;
		if (code === 'rate_limit') return t.errorRateLimit;
		return t.errorGeneric;
	}

	async function post(payload: Record<string, unknown>) {
		const response = await fetch('/tool/7-frameworks', {
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
			const data = await post({ step: 'analyze', url });
			offer = data.offer;
			copies = data.copies;
			site = data.site ?? '';
			lowConfidence = data.confidence === 'baja';
			await tick();
			document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = '';
		}
	}

	/**
	 * Los seis restantes se mandan por correo y no se enseñan nunca aquí.
	 * El correo es el único sitio donde están, y por eso el email vale algo.
	 */
	async function unlock() {
		busy = 'unlocking';
		error = '';
		try {
			await post({ step: 'unlock', offer, email, free: copies });
			sent = true;
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = '';
		}
	}

	async function copyToClipboard(copy: GeneratedCopy) {
		await navigator.clipboard.writeText(toPlainText(copy));
		copiedId = copy.id;
		setTimeout(() => {
			if (copiedId === copy.id) copiedId = '';
		}, 2000);
	}

	function restart() {
		busy = '';
		error = '';
		url = '';
		offer = null;
		site = '';
		lowConfidence = false;
		copies = [];
		sent = false;
		email = '';
		copiedId = '';
	}
</script>

<PageMeta
	title="Tu oferta, escrita de 7 formas distintas — Damian Soto"
	description="Pega la web de tu negocio y te devuelvo tu oferta escrita con los 7 frameworks de copywriting que más se usan para vender. El primero, gratis."
/>

<!--
	El crédito y la introducción se reutilizan con snippets: en el estado inicial
	el crédito va debajo del formulario, y con resultados va al final.
-->
{#snippet credit()}
	<p class="muted">
		Los frameworks están tomados de
		<a
			href="https://www.nealsnewsletter.com/p/7-copywriting-frameworks-that-sell"
			target="_blank"
			rel="noopener noreferrer"
			class="link">7 Copywriting Frameworks that Sell</a
		>, de Neal O'Grady.
	</p>
{/snippet}

{#snippet intro_()}
	<article class="rich-text">
		<!-- Markdown propio del repo (src/lib/content/tool-7-frameworks.md), igual
		     que la home. No hay nada del visitante aquí dentro. -->
		{@html intro}
	</article>
{/snippet}

{#if !copies.length}
	{@render intro_()}

	{#if error}
		<p class="error-text mt-6">{error}</p>
	{/if}

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

	<!-- El crédito, justo debajo del formulario. -->
	<div class="mt-6">{@render credit()}</div>
{:else}
	{@render intro_()}

	{#if error}
		<p class="error-text mt-6">{error}</p>
	{/if}
{/if}

<!-- Paso 2: los textos -->
{#if copies.length}
	<section id="resultado" class="mt-10 space-y-6">
		<div class="muted">
			{#if site}<p>{t.readLine.replace('{site}', site)}</p>{/if}
			{#if lowConfidence}<p class="mt-1">{t.lowConfidence}</p>{/if}
		</div>

		{#each ordered as framework, index (framework.id)}
			{@const copy = byId.get(framework.id)}

			<!-- El muro va justo después de lo que ya ha leído. Si lo dejamos al final,
			     queda detrás de seis tarjetas vacías y nadie baja tanto. -->
			{#if index === gateAfter}
				<section class="box bg-line/40">
					{#if sent}
						<h3 class="section-title">{t.sentTitle}</h3>
						<p class="section-intro">{t.sentBody}</p>
					{:else}
						<h3 class="section-title">{t.gateTitle}</h3>
						<p class="section-intro">{t.gateBody}</p>
						<!-- Input y botón en la misma línea. El input se encoge (min-w-0)
						     y el botón no, para que quepan juntos también en móvil. -->
						<div class="mt-4">
							<InlineForm
								type="email"
								bind:value={email}
								placeholder={t.gatePlaceholder}
								label={t.gateButton}
								busyLabel={t.gateUnlocking}
								busy={busy === 'unlocking'}
								inputmode="email"
								autocomplete="email"
								onsubmit={unlock}
							/>
						</div>
					{/if}
				</section>
			{/if}

			{#if copy}
				<article class="box">
					<header class="mb-4 flex items-start justify-between gap-3">
						<div>
							<h3 class="box-title">
								{framework.name}
								{#if framework.id === freeFramework.id}
									<span class="badge badge-sm badge-neutral align-middle">{t.freeBadge}</span>
								{/if}
							</h3>
							<p class="muted">{framework.bestFor}</p>
						</div>
						<button
							type="button"
							onclick={() => copyToClipboard(copy)}
							class="btn btn-ghost btn-xs shrink-0"
						>
							{copiedId === framework.id ? t.copiedAction : t.copyAction}
						</button>
					</header>

					<div class="space-y-3">
						{#each framework.steps as step (step.key)}
							{#if copy.blocks[step.key]}
								<div>
									<p class="eyebrow">
										{step.label}
									</p>
									<p class="body-text whitespace-pre-wrap">{copy.blocks[step.key]}</p>
								</div>
							{/if}
						{/each}
					</div>
				</article>
			{:else}
				<!-- Bloqueado: se ve la estructura, nunca el texto. Los seis restantes
				     no se generan hasta que entra el email, así que aquí no hay nada
				     que descubrir mirando el HTML. -->
				<article class="box-locked" aria-hidden="true">
					<h3 class="box-title text-muted">{framework.name}</h3>
					<p class="muted mb-4">{framework.bestFor}</p>
					<div class="space-y-3">
						{#each framework.steps as step (step.key)}
							<div>
								<p class="eyebrow opacity-60">
									{step.label}
								</p>
								<div class="mt-1 space-y-1.5">
									<div class="h-2.5 w-full rounded bg-line/60"></div>
									<div class="h-2.5 w-4/5 rounded bg-line/60"></div>
								</div>
							</div>
						{/each}
					</div>
				</article>
			{/if}
		{/each}

		<button type="button" onclick={restart} class="link-quiet">
			{t.restart}
		</button>
	</section>
{/if}

{#if copies.length}
	<footer class="section border-t border-line pt-6">
		{@render credit()}
	</footer>
{/if}
