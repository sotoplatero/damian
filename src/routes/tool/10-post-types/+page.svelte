<script lang="ts">
	import { marked } from 'marked';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import { tick } from 'svelte';
	import raw from '$lib/content/tool-10-post-types.md?raw';
	import { postTypes, freePostType } from '$lib/tools/10-post-types/types';
	import { toPlainText, type GeneratedPost } from '$lib/tools/10-post-types/format';
	import { parseCopy } from '$lib/content';
	import InlineForm from '$lib/components/InlineForm.svelte';
	import TextareaForm from '$lib/components/TextareaForm.svelte';

	/** Los mismos limites que valida el servidor. Si cambian alli, cambian aqui. */
	const IDEA_MIN = 20;
	const IDEA_MAX = 2000;

	const { t, body } = parseCopy(raw);
	const intro = marked.parse(body) as string;

	type Busy = '' | 'analyzing' | 'unlocking';

	let busy = $state<Busy>('');
	let error = $state('');

	/** La idea escrita por la persona. Antes esto era una URL que se raspaba. */
	let idea = $state('');
	/** El tema que el modelo dedujo. Viaja al servidor otra vez para escribir los nueve restantes. */
	let topic = $state<Record<string, string> | null>(null);
	let lowConfidence = $state(false);

	let posts = $state<GeneratedPost[]>([]);
	/** El correo con los diez ya ha salido. */
	let sent = $state(false);
	let email = $state('');
	let copiedId = $state('');

	const byId = $derived(new Map(posts.map((post) => [post.id, post])));

	/** Los que ya están escritos primero; los bloqueados, detrás del muro. */
	const ordered = $derived([
		...postTypes.filter((type) => byId.has(type.id)),
		...postTypes.filter((type) => !byId.has(type.id))
	]);

	/** El muro se intercala justo detrás de lo último que ya puede leer. */
	const gateAfter = $derived(posts.length);

	function errorFor(code: unknown): string {
		if (code === 'unreadable') return t.errorUnreadable;
		if (code === 'idea_short') return t.errorIdeaShort;
		if (code === 'invalid_email') return t.errorInvalidEmail;
		if (code === 'disposable') return t.errorDisposable;
		if (code === 'send_failed') return t.errorSendFailed;
		if (code === 'rate_limit') return t.errorRateLimit;
		return t.errorGeneric;
	}

	async function post(payload: Record<string, unknown>) {
		const response = await fetch('/tool/10-post-types', {
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
			const data = await post({ step: 'extract', idea });
			topic = data.topic;
			posts = data.posts;
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
	 * Los nueve restantes se mandan por correo y no se enseñan nunca aquí.
	 * El correo es el único sitio donde están, y por eso el email vale algo.
	 */
	async function unlock() {
		busy = 'unlocking';
		error = '';
		try {
			await post({ step: 'unlock', topic, email, free: posts });
			sent = true;
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = '';
		}
	}

	async function copyToClipboard(post: GeneratedPost) {
		await navigator.clipboard.writeText(toPlainText(post));
		copiedId = post.id;
		setTimeout(() => {
			if (copiedId === post.id) copiedId = '';
		}, 2000);
	}

	function restart() {
		busy = '';
		error = '';
		idea = '';
		topic = null;
		lowConfidence = false;
		posts = [];
		sent = false;
		email = '';
		copiedId = '';
	}
</script>

<PageMeta
	title="Saca 10 posts distintos de una sola idea — Damian Soto"
	description="Escribe un tema y recibe diez posts distintos listos para publicar. El primero es gratis."
/>

<!--
	El crédito y la introducción se reutilizan con snippets: en el estado inicial
	el crédito va debajo del formulario, y con resultados va al final.
-->
{#snippet credit()}
	<p class="muted">
		Los diez tipos están tomados de
		<a
			href="https://www.nealsnewsletter.com/p/the-10-types-of-posts-with-examples"
			target="_blank"
			rel="noopener noreferrer"
			class="link">The 10 Types of Posts</a
		>, de Neal O'Grady.
	</p>
{/snippet}

{#snippet intro_()}
	<article class="prose prose-xl prose-neutral max-w-none">
		<!-- Markdown propio del repo (src/lib/content/tool-10-post-types.md), igual
		     que la home. No hay nada del visitante aquí dentro. -->
		{@html intro}
	</article>
{/snippet}

{#if !posts.length}
	<section class="screen-center">
		{@render intro_()}

		{#if error}
			<p class="mt-6 text-sm text-error">{error}</p>
		{/if}

		<div class="mt-8">
			<TextareaForm
				bind:value={idea}
				placeholder={t.ideaPlaceholder}
				label={t.ideaButton}
				busyLabel={t.ideaWorking}
				busy={busy === 'analyzing'}
				minLength={IDEA_MIN}
				maxLength={IDEA_MAX}
				hint={idea.trim().length >= IDEA_MIN ? t.ideaShortcut : t.ideaHint}
				onsubmit={analyze}
			/>
		</div>

		<!-- El crédito, justo debajo del formulario. -->
		<div class="mt-6">{@render credit()}</div>
	</section>
{:else}
	{@render intro_()}

	{#if error}
		<p class="mt-6 text-sm text-error">{error}</p>
	{/if}
{/if}

<!-- Paso 2: los posts -->
{#if posts.length}
	<section id="resultado" class="mt-10 space-y-6">
		{#if lowConfidence}<p class="muted">{t.lowConfidence}</p>{/if}

		{#each ordered as type, index (type.id)}
			{@const written = byId.get(type.id)}

			<!-- El muro va justo después de lo que ya ha leído. Si lo dejamos al final,
			     queda detrás de nueve tarjetas vacías y nadie baja tanto. -->
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

			{#if written}
				<article class="box">
					<header class="mb-4 flex items-start justify-between gap-3">
						<div>
							<h3 class="box-title">
								{type.name}
								{#if type.id === freePostType.id}
									<span class="badge badge-sm badge-neutral align-middle">{t.freeBadge}</span>
								{/if}
							</h3>
							<p class="muted">{type.bestFor}</p>
						</div>
						<button
							type="button"
							onclick={() => copyToClipboard(written)}
							class="btn btn-ghost btn-xs shrink-0"
						>
							{copiedId === type.id ? t.copiedAction : t.copyAction}
						</button>
					</header>

					<p class="body-text whitespace-pre-wrap">{written.text}</p>
				</article>
			{:else}
				<!-- Bloqueado: se ve el tipo y un ejemplo de la forma (otro tema), nunca
				     el texto sobre TU tema. Los nueve tuyos no se generan hasta que entra
				     el email, así que aquí no hay nada que descubrir mirando el HTML: el
				     ejemplo es fijo y sale de types.ts. -->
				<article class="box-locked">
					<h3 class="box-title text-muted">{type.name}</h3>
					<p class="muted mb-4">{type.bestFor}</p>
					<p class="eyebrow opacity-70">{t.exampleLabel}</p>
					<p class="body-text mt-1 whitespace-pre-wrap text-muted">{type.example}</p>
				</article>
			{/if}
		{/each}

		<button type="button" onclick={restart} class="link-quiet">
			{t.restart}
		</button>
	</section>
{/if}

{#if posts.length}
	<footer class="section border-t border-line pt-6">
		{@render credit()}
	</footer>
{/if}
