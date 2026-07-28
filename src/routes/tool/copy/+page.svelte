<script lang="ts">
	import { marked } from 'marked';
	import { tick } from 'svelte';
	import raw from '$lib/content/tool-copy.md?raw';
	import { frameworks, freeFramework } from '$lib/tools/copy/frameworks';
	import { toPlainText, type GeneratedCopy } from '$lib/tools/copy/format';

	/** Mismo formato que home.md: frontmatter con los textos, cuerpo con el argumentario. */
	function parseCopy(source: string): { t: Record<string, string>; body: string } {
		let body = source;
		const t: Record<string, string> = {};

		const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
		if (frontmatter) {
			body = source.slice(frontmatter[0].length);
			for (const line of frontmatter[1].split('\n')) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith('#')) continue;
				const separator = trimmed.indexOf(':');
				if (separator === -1) continue;
				t[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
			}
		}
		return { t, body };
	}

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
		const response = await fetch('/tool/copy', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const data = await response.json().catch(() => ({}));
		if (!response.ok) throw new Error(errorFor(data?.error));
		return data;
	}

	async function analyze(event: SubmitEvent) {
		event.preventDefault();
		if (!url.trim() || busy) return;

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
	async function unlock(event: SubmitEvent) {
		event.preventDefault();
		if (!email.trim() || busy) return;

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

<svelte:head>
	<title>Tu oferta, escrita de 7 formas distintas — Damian Soto</title>
	<meta
		name="description"
		content="Pega la web de tu negocio y te devuelvo tu oferta escrita con los 7 frameworks de copywriting que más se usan para vender. El primero, gratis."
	/>
</svelte:head>

<article class="prose prose-lg prose-neutral max-w-none">
	<!-- Markdown propio del repo (src/lib/content/tool-copy.md), igual que la home.
	     No hay nada del visitante aquí dentro. -->
	{@html intro}
</article>

{#if error}
	<p class="mt-6 text-sm text-error">{error}</p>
{/if}

<!-- Paso 1: la URL. Única entrada: sin web no hay nada que reescribir. -->
{#if !copies.length}
	<section class="mt-8">
		<form onsubmit={analyze} class="space-y-3">
			<input
				type="text"
				bind:value={url}
				disabled={busy === 'analyzing'}
				placeholder={t.urlPlaceholder}
				inputmode="url"
				autocomplete="url"
				class="input input-bordered input-lg w-full"
			/>
			<button
				type="submit"
				disabled={busy === 'analyzing' || !url.trim()}
				class="btn btn-primary btn-lg btn-block"
			>
				{busy === 'analyzing' ? t.urlScanning : t.urlButton}
			</button>
		</form>
	</section>
{/if}

<!-- Paso 2: los textos -->
{#if copies.length}
	<section id="resultado" class="mt-10 space-y-6">
		<div class="text-sm text-neutral-500">
			{#if site}<p>{t.readLine.replace('{site}', site)}</p>{/if}
			{#if lowConfidence}<p class="mt-1">{t.lowConfidence}</p>{/if}
		</div>

		{#each ordered as framework, index (framework.id)}
			{@const copy = byId.get(framework.id)}

			<!-- El muro va justo después de lo que ya ha leído. Si lo dejamos al final,
			     queda detrás de seis tarjetas vacías y nadie baja tanto. -->
			{#if index === gateAfter}
				<section class="rounded-lg bg-neutral-100 p-6">
					{#if sent}
						<h3 class="text-xl font-bold">{t.sentTitle}</h3>
						<p class="mt-1 text-neutral-600">{t.sentBody}</p>
					{:else}
						<h3 class="text-xl font-bold">{t.gateTitle}</h3>
						<p class="mt-1 text-neutral-600">{t.gateBody}</p>
						<form onsubmit={unlock} class="mt-4 space-y-3">
							<input
								type="email"
								bind:value={email}
								required
								disabled={busy === 'unlocking'}
								placeholder={t.gatePlaceholder}
								autocomplete="email"
								class="input input-bordered input-lg w-full"
							/>
							<button
								type="submit"
								disabled={busy === 'unlocking'}
								class="btn btn-primary btn-lg btn-block"
							>
								{busy === 'unlocking' ? t.gateUnlocking : t.gateButton}
							</button>
						</form>
					{/if}
				</section>
			{/if}

			{#if copy}
				<article class="rounded-lg border border-neutral-200 p-5">
					<header class="mb-4 flex items-start justify-between gap-3">
						<div>
							<h3 class="text-lg font-bold">
								{framework.name}
								{#if framework.id === freeFramework.id}
									<span class="badge badge-sm badge-neutral align-middle">{t.freeBadge}</span>
								{/if}
							</h3>
							<p class="text-sm text-neutral-500">{framework.bestFor}</p>
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
									<p class="text-xs font-semibold uppercase tracking-wide text-neutral-400">
										{step.label}
									</p>
									<p class="whitespace-pre-wrap">{copy.blocks[step.key]}</p>
								</div>
							{/if}
						{/each}
					</div>
				</article>
			{:else}
				<!-- Bloqueado: se ve la estructura, nunca el texto. Los seis restantes
				     no se generan hasta que entra el email, así que aquí no hay nada
				     que descubrir mirando el HTML. -->
				<article class="rounded-lg border border-dashed border-neutral-200 p-5" aria-hidden="true">
					<h3 class="text-lg font-bold text-neutral-400">{framework.name}</h3>
					<p class="mb-4 text-sm text-neutral-400">{framework.bestFor}</p>
					<div class="space-y-3">
						{#each framework.steps as step (step.key)}
							<div>
								<p class="text-xs font-semibold uppercase tracking-wide text-neutral-300">
									{step.label}
								</p>
								<div class="mt-1 space-y-1.5">
									<div class="h-2.5 w-full rounded bg-neutral-100"></div>
									<div class="h-2.5 w-4/5 rounded bg-neutral-100"></div>
								</div>
							</div>
						{/each}
					</div>
				</article>
			{/if}
		{/each}

		<button type="button" onclick={restart} class="link text-sm text-neutral-500">
			{t.restart}
		</button>
	</section>
{/if}

<footer class="mt-16 border-t border-neutral-200 pt-6 text-sm text-neutral-500">
	<p>
		Los frameworks están tomados de
		<a
			href="https://www.nealsnewsletter.com/p/7-copywriting-frameworks-that-sell"
			target="_blank"
			rel="noopener noreferrer"
			class="link">7 Copywriting Frameworks that Sell</a
		>, de Neal O'Grady.
	</p>
	<p class="mt-2"><a href="/" class="link">Damian Soto</a></p>
</footer>
