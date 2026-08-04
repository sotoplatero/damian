<script lang="ts">
	import { marked } from 'marked';
	import { tick } from 'svelte';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import InlineForm from '$lib/components/InlineForm.svelte';
	import raw from '$lib/content/tool-repurpose.md?raw';
	import { parseCopy } from '$lib/content';
	import { formats, freeFormats } from '$lib/tools/repurpose/formats';
	import { toPlainText, type Piece } from '$lib/tools/repurpose/format';

	const { t, body } = parseCopy(raw);
	const intro = marked.parse(body) as string;
	let busy = $state<'' | 'reading' | 'unlocking'>('');
	let error = $state('');
	let url = $state('');
	let article = $state<Record<string, string> | null>(null);
	let finalUrl = $state('');
	let site = $state('');
	let lowConfidence = $state(false);
	let pieces = $state<Piece[]>([]);
	let sent = $state(false);
	let email = $state('');
	let copiedId = $state('');
	const byId = $derived(new Map(pieces.map((piece) => [piece.id, piece])));
	const writtenFormats = $derived(formats.filter((format) => byId.has(format.id)));
	const lockedFormats = $derived(formats.filter((format) => !byId.has(format.id)));

	function errorFor(code: unknown, reason?: unknown): string {
		if (code === 'unreadable') return reason === 'blocked' ? t.errorBlocked : reason === 'not_found' ? t.errorNotFound : reason === 'timeout' ? t.errorTimeout : reason === 'empty' ? t.errorEmpty : reason === 'invalid_url' ? t.errorInvalidUrl : t.errorUnreadable;
		if (code === 'invalid_email') return t.errorInvalidEmail;
		if (code === 'disposable') return t.errorDisposable;
		if (code === 'send_failed') return t.errorSendFailed;
		if (code === 'rate_limit') return t.errorRateLimit;
		return t.errorGeneric;
	}
	async function post(payload: Record<string, unknown>) {
		const response = await fetch('/tool/repurpose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
		const data = await response.json().catch(() => ({}));
		if (!response.ok) throw new Error(errorFor(data?.error, data?.reason));
		return data;
	}
	async function read() {
		busy = 'reading'; error = '';
		try { const data = await post({ step: 'extract', url }); article = data.article; pieces = data.pieces; finalUrl = data.url ?? ''; site = data.site ?? ''; lowConfidence = data.confidence === 'baja'; await tick(); document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth' }); }
		catch (caught) { error = caught instanceof Error ? caught.message : t.errorOffline; } finally { busy = ''; }
	}
	async function unlock() {
		busy = 'unlocking'; error = '';
		try { await post({ step: 'unlock', article, url: finalUrl, email, free: pieces }); sent = true; }
		catch (caught) { error = caught instanceof Error ? caught.message : t.errorOffline; } finally { busy = ''; }
	}
	async function copy(piece: Piece) { await navigator.clipboard.writeText(toPlainText(piece)); copiedId = piece.id; setTimeout(() => { if (copiedId === piece.id) copiedId = ''; }, 2000); }
	function restart() { busy = ''; error = ''; url = ''; article = null; finalUrl = ''; site = ''; lowConfidence = false; pieces = []; sent = false; email = ''; copiedId = ''; }
</script>

<PageMeta
	title="Distribuye tu artículo — Damian Soto"
	description="Convierte un artículo en nueve notas breves, con distintas ideas, ángulos y extensiones, para seguir llevándole lectores."
/>

{#snippet intro_()}
	<article class="prose prose-xl prose-neutral max-w-none">{@html intro}</article>
{/snippet}

{#if !pieces.length}
	<section class="screen-center">
		{@render intro_()}
		{#if error}<p class="mt-6 text-sm text-error">{error}</p>{/if}
		<div class="mt-8">
			<InlineForm bind:value={url} placeholder={t.urlPlaceholder} label={t.urlButton} busyLabel={t.urlWorking} busy={busy === 'reading'} inputmode="url" autocomplete="url" onsubmit={read} />
			<p class="muted mt-2">{t.urlHint}</p>
		</div>
	</section>
{:else}
	<section id="resultado" class="space-y-6">
		<button type="button" class="link-quiet" onclick={restart}>← {t.restart}</button>
		<header class="prose prose-xl prose-neutral max-w-none">
			<h1>{t.resultTitle}</h1>
		</header>
		{#if site}<p class="muted">{t.readLine.replace('{site}', site)}</p>{/if}
		{#if lowConfidence}<p class="muted">{t.lowConfidence}</p>{/if}
		{#if error}<p class="text-sm text-error">{error}</p>{/if}
		<h2 class="eyebrow">Tus primeras notas</h2>
		{#each writtenFormats as format (format.id)}
				{@const written = byId.get(format.id)}
				{#if written}<article class="box"><header class="mb-4 flex items-start justify-between gap-3"><div><h3 class="box-title">{format.name} {#if freeFormats.some((f) => f.id === format.id)}<span class="badge badge-sm badge-neutral">{t.freeBadge}</span>{/if}</h3><p class="muted">{format.bestFor}</p></div><button type="button" onclick={() => copy(written)} class="btn btn-ghost btn-xs">{copiedId === format.id ? t.copiedAction : t.copyAction}</button></header><p class="body-text whitespace-pre-wrap">{written.text}</p></article>{/if}
		{/each}
		<section class="box bg-line/40">{#if sent}<h3 class="section-title">{t.sentTitle}</h3><p class="section-intro">{t.sentBody}</p>{:else}<h3 class="section-title">{t.gateTitle}</h3><p class="section-intro">{t.gateBody}</p><div class="mt-4"><InlineForm type="email" bind:value={email} placeholder={t.gatePlaceholder} label={t.gateButton} busyLabel={t.gateUnlocking} busy={busy === 'unlocking'} inputmode="email" autocomplete="email" onsubmit={unlock} /></div>{/if}</section>
		<h2 class="eyebrow">Las otras seis</h2>
		{#each lockedFormats as format (format.id)}<article class="box-locked"><h3 class="box-title text-muted">{format.name}</h3><p class="muted mb-4">{format.bestFor}</p><p class="eyebrow opacity-70">{t.exampleLabel}</p><p class="body-text mt-1 whitespace-pre-wrap text-muted">{format.example}</p></article>{/each}
	</section>
{/if}
