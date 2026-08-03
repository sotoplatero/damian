<script lang="ts">
	import { marked } from 'marked';
	import { tick } from 'svelte';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import InlineForm from '$lib/components/InlineForm.svelte';
	import { parseCopy } from '$lib/content';
	import raw from '$lib/content/tool-substack-about.md?raw';
	import type { AboutFinding } from '$lib/tools/substack-about/prompt';

	const { t, body } = parseCopy(raw);
	const intro = marked.parse(body) as string;
	let url = $state('');
	let email = $state('');
	let busy = $state<'analyzing' | 'unlocking' | ''>('');
	let error = $state('');
	let sent = $state(false);
	let result = $state<{ site: string; diagnosis: { topic: string; reader: string; benefit: string; verdict: string }; first: AboutFinding; promise: string; lockedCount: number } | null>(null);

	function errorFor(code: unknown) {
		if (code === 'unreadable') return t.errorUnreadable;
		if (code === 'invalid_email') return t.errorInvalidEmail;
		if (code === 'disposable') return t.errorDisposable;
		if (code === 'send_failed') return t.errorSendFailed;
		if (code === 'rate_limit') return t.errorRateLimit;
		return t.errorGeneric;
	}

	async function post(payload: Record<string, unknown>) {
		const response = await fetch('/tool/substack-about/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
		const data = await response.json().catch(() => ({}));
		if (!response.ok) throw new Error(errorFor(data.error));
		return data;
	}

	async function analyze() {
		busy = 'analyzing'; error = '';
		try { result = await post({ step: 'analyze', url }); await tick(); document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth' }); }
		catch (caught) { error = caught instanceof Error ? caught.message : t.errorOffline; }
		finally { busy = ''; }
	}

	async function unlock() {
		busy = 'unlocking'; error = '';
		try { await post({ step: 'unlock', url, email }); sent = true; }
		catch (caught) { error = caught instanceof Error ? caught.message : t.errorOffline; }
		finally { busy = ''; }
	}

	function restart() { url = ''; email = ''; result = null; sent = false; error = ''; }
</script>

<PageMeta title="Reescribe el Acerca de de tu Substack — Damian Soto" description="Audita y reescribe la página Acerca de de tu newsletter en Substack." />

{#snippet credit()}
	<p class="muted">La estructura principal sigue la <a class="link" target="_blank" rel="noopener noreferrer" href="https://toniherrera.substack.com/p/creacrear-tu-pagina-acerca-de-en-substack">guía pública de Toni Herrera</a>. El diagnóstico incorpora criterios de <a class="link" target="_blank" rel="noopener noreferrer" href="https://ensayos.substack.com/p/como-lanzar-la-monetizacion-de-tu">Roberto y Veronica Llorca-Smith</a>, <a class="link" target="_blank" rel="noopener noreferrer" href="https://directorio.substack.com/p/empezar-aqui">David</a>, <a class="link" target="_blank" rel="noopener noreferrer" href="https://escribe.substack.com/p/como-substack-se-convirtio-en-mi">Alba García Marcos y Víctor Millán</a>.</p>
{/snippet}

{#if !result}
	<section class="screen-center">
		<article class="prose prose-xl prose-neutral max-w-none">{@html intro}</article>
		{#if error}<p class="mt-6 text-sm text-error">{error}</p>{/if}
		<div class="mt-8"><InlineForm bind:value={url} placeholder={t.urlPlaceholder} label={t.urlButton} busyLabel={t.urlScanning} busy={busy === 'analyzing'} inputmode="url" autocomplete="url" onsubmit={analyze} /></div>
		<div class="mt-6">{@render credit()}</div>
	</section>
{:else}
	<section id="resultado" class="space-y-6">
		<button type="button" class="link-quiet" onclick={restart}>← {t.restart}</button>
		<header class="prose prose-xl prose-neutral max-w-none">
			<h1>Diagnóstico del About de {result.site}.substack.com</h1>
		</header>
		<p class="muted">{t.readLine.replace('{site}', `${result.site}.substack.com`)}</p>
		{#if error}<p class="text-sm text-error">{error}</p>{/if}

		<article class="box">
			<p class="body-text">{result.diagnosis.verdict}</p>
			<div class="mt-6 space-y-4 border-t border-line pt-5">
				<div><p class="eyebrow">{t.labelTopic}</p><p class="body-text">{result.diagnosis.topic}</p></div>
				<div><p class="eyebrow">{t.labelReader}</p><p class="body-text">{result.diagnosis.reader}</p></div>
				<div><p class="eyebrow">{t.labelBenefit}</p><p class="body-text">{result.diagnosis.benefit}</p></div>
			</div>
		</article>

		<article class="box">
			<p class="eyebrow">{t.labelFirst}</p>
			<h2 class="box-title mt-1">{result.first.criterion}</h2>
			<div class="mt-5 space-y-4">
				<div><p class="eyebrow">{t.labelEvidence}</p><p class="body-text">{result.first.evidence}</p></div>
				<div><p class="eyebrow">{t.labelFix}</p><p class="body-text">{result.first.fix}</p></div>
			</div>
		</article>

		<article class="box border-ink">
			<p class="eyebrow">{t.labelPromise}</p>
			<p class="body-text mt-2 font-semibold">{result.promise}</p>
		</article>

		<section class="box bg-line/40">
			{#if sent}
				<h3 class="section-title">{t.sentTitle}</h3><p class="section-intro">{t.sentBody}</p>
			{:else}
				<h3 class="section-title">{t.gateTitle}</h3><p class="section-intro">{t.gateBody}</p>
				<div class="mt-4"><InlineForm type="email" bind:value={email} placeholder={t.gatePlaceholder} label={t.gateButton} busyLabel={t.gateUnlocking} busy={busy === 'unlocking'} inputmode="email" autocomplete="email" onsubmit={unlock} /></div>
			{/if}
		</section>

		<footer class="section border-t border-line pt-6">{@render credit()}</footer>
	</section>
{/if}
