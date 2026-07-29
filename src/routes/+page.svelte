<script lang="ts">
	import { marked } from 'marked';
	import { onMount } from 'svelte';
	import homeRaw from '$lib/content/home.md?raw';
	import { tools } from '$lib/tools/list';

	/** Split home.md into UI strings (frontmatter) + the sales letter body. */
	function parseCopy(raw: string): { t: Record<string, string>; body: string } {
		let body = raw;
		const t: Record<string, string> = {};

		const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
		if (frontmatter) {
			body = raw.slice(frontmatter[0].length);
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

	const { t, body } = parseCopy(homeRaw);
	const html = marked.parse(body) as string;

	let email = $state('');
	let status = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let errorMessage = $state('');

	// #4 — the line that "knows" the time. Computed in the browser (local hour),
	// so it always matches the visitor. Empty on the server to avoid a wrong guess.
	let greeting = $state('');

	function timeGreeting(): string {
		const h = new Date().getHours();
		if (h < 6) return 'Las tantas de la madrugada y aquí sigues, dándole vueltas al negocio. Lo sé.';
		if (h < 13) return 'Es por la mañana y ya andas buscando cómo quitarte trabajo de encima. Bien.';
		if (h < 20) return 'Media tarde, y en vez de estar con el negocio, buscas cómo hacer que se lleve solo. Vas bien.';
		return 'Es de noche y sigues pensando en el negocio. Lo sé.';
	}

	// #1 — terminal log shown after a successful signup. The last line is t.success (#2).
	let logLines = $state<string[]>([]);

	async function revealLog() {
		const lines = ['> email recibido', '> añadido a la lista', '> enviando tu lista... ✓', `> ${t.success}`];
		logLines = [];
		for (const line of lines) {
			logLines = [...logLines, line];
			await new Promise((resolve) => setTimeout(resolve, 480));
		}
	}

	onMount(() => {
		greeting = timeGreeting();

		// #3 — a wink for whoever opens the console.
		console.log(
			'%cSi has abierto esto, tú y yo nos vamos a entender.%c\nResponde al primer correo que te mando y dime qué automatizarías.',
			'font-size:14px;font-weight:700;color:#171717',
			'font-size:13px;color:#737373'
		);
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!email.trim()) return;

		status = 'loading';
		errorMessage = '';

		try {
			const response = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			if (response.ok) {
				status = 'success';
				email = '';
				revealLog();
			} else {
				const data = await response.json().catch(() => ({}));
				status = 'error';
				errorMessage = data?.error === 'invalid_email' ? 'Ese email no parece válido.' : t.error;
			}
		} catch {
			status = 'error';
			errorMessage = t.errorOffline;
		}
	}
</script>

<svelte:head>
	<title>Objeto Brillante — Damian Soto</title>
	<meta
		name="description"
		content="Un email a la semana con algo que he hecho con IA en un negocio real y que funciona. Sin cursos, sin tutoriales. Yo te cuento lo que hago."
	/>
</svelte:head>

<!-- #4 — the line that knows the time. Reserves its height to avoid layout shift. -->
<p class="greeting text-sm text-neutral-500">{greeting}</p>

<article class="prose prose-xl prose-neutral max-w-none">
	<!-- Sales copy (editable in src/lib/content/home.md) -->
	{@html html}
</article>

<!-- CTA form -->
<section class="mt-10 space-y-3">
	{#if status === 'success'}
		<!-- #1 — terminal log; last line is the success message (#2) -->
		<div class="terminal" role="status">
			{#each logLines as line}
				<div class="terminal-line">{line}</div>
			{/each}
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="space-y-3">
			<input
				type="email"
				bind:value={email}
				required
				disabled={status === 'loading'}
				placeholder={t.placeholder}
				class="input input-bordered input-lg w-full"
				autocomplete="email"
			/>
			<button
				type="submit"
				disabled={status === 'loading'}
				class="btn btn-primary btn-lg btn-block"
			>
				{status === 'loading' ? t.sending : t.button}
			</button>
			{#if status === 'error'}
				<p class="text-sm text-error">{errorMessage}</p>
			{/if}
		</form>
	{/if}
</section>

<!--
	Las cositas. Segunda puerta del funnel: también captan emails, así que la
	sección tiene peso propio en vez de ir como nota al pie. Los tools se editan
	en src/lib/tools/list.ts; los textos de la sección, en home.md.
-->
<section class="mt-20 border-t border-neutral-200 pt-10">
	<h2 class="text-2xl font-bold">{t.toolsTitle}</h2>
	<p class="mt-2 text-neutral-600">{t.toolsIntro}</p>

	<ul class="mt-6 space-y-3">
		{#each tools as tool (tool.href)}
			<li>
				<a
					href={tool.href}
					class="group block rounded-lg border border-neutral-200 p-5 transition hover:border-neutral-900"
				>
					<span class="font-bold underline decoration-neutral-300 underline-offset-4 group-hover:decoration-neutral-900">
						{tool.name}
					</span>
					<span aria-hidden="true" class="text-neutral-400">&nbsp;→</span>
					<p class="mt-2 text-sm leading-relaxed text-neutral-600">{tool.blurb}</p>
				</a>
			</li>
		{/each}
	</ul>
</section>

<style>
	/* #4 — reserve one line so filling the greeting on mount doesn't shift the page */
	.greeting {
		min-height: 1.25rem;
		margin-bottom: 0.75rem;
	}

	/* #1 — terminal log */
	.terminal {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.95rem;
		line-height: 1.9;
		color: #404040;
	}
	.terminal-line {
		white-space: pre-wrap;
	}
</style>
