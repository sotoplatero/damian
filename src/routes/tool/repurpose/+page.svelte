<script lang="ts">
	import { marked } from 'marked';
	import { tick } from 'svelte';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import InlineForm from '$lib/components/InlineForm.svelte';
	import raw from '$lib/content/tool-repurpose.md?raw';
	import { parseCopy } from '$lib/content';
	import { byChannel, formats, freeFormats } from '$lib/tools/repurpose/formats';
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
	const freeGroups = $derived(byChannel(formats.filter((format) => byId.has(format.id))));
	const lockedGroups = $derived(byChannel(formats.filter((format) => !byId.has(format.id))));

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
	title="Reparte un artículo entre Substack, X y LinkedIn — Damian Soto"
	description="Pega un artículo y recibe nueve publicaciones listas para Substack, X y LinkedIn."
/>

{#snippet credit()}
	<p class="muted">
		Lecturas detrás de esto:
		<a class="link" href="https://vilmanunez.com/como-crear-mucho-contenido-partiendo-de-una-idea/">Vilma Núñez</a>
		y <a class="link" href="https://nataliapapiol.substack.com/">Natalia Papiol</a>. Los nueve formatos son míos.
	</p>
{/snippet}

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
		<div class="mt-6">{@render credit()}</div>
	</section>
{:else}
	{@render intro_()}
	{#if error}<p class="mt-6 text-sm text-error">{error}</p>{/if}
	<section id="resultado" class="mt-10 space-y-6">
		{#if site}<p class="muted">{t.readLine.replace('{site}', site)}</p>{/if}
		{#if lowConfidence}<p class="muted">{t.lowConfidence}</p>{/if}
		{#each freeGroups as group (group.channel)}
			<h2 class="eyebrow">{group.name}</h2>
			{#each group.items as format (format.id)}
				{@const written = byId.get(format.id)}
				{#if written}<article class="box"><header class="mb-4 flex items-start justify-between gap-3"><div><h3 class="box-title">{format.name} {#if freeFormats.some((f) => f.id === format.id)}<span class="badge badge-sm badge-neutral">{t.freeBadge}</span>{/if}</h3><p class="muted">{format.bestFor}</p></div><button type="button" onclick={() => copy(written)} class="btn btn-ghost btn-xs">{copiedId === format.id ? t.copiedAction : t.copyAction}</button></header><p class="body-text whitespace-pre-wrap">{written.text}</p></article>{/if}
			{/each}
		{/each}
		<section class="box bg-line/40">{#if sent}<h3 class="section-title">{t.sentTitle}</h3><p class="section-intro">{t.sentBody}</p>{:else}<h3 class="section-title">{t.gateTitle}</h3><p class="section-intro">{t.gateBody}</p><div class="mt-4"><InlineForm type="email" bind:value={email} placeholder={t.gatePlaceholder} label={t.gateButton} busyLabel={t.gateUnlocking} busy={busy === 'unlocking'} inputmode="email" autocomplete="email" onsubmit={unlock} /></div>{/if}</section>
		{#each lockedGroups as group (group.channel)}<h2 class="eyebrow">{group.name}</h2>{#each group.items as format (format.id)}<article class="box-locked"><h3 class="box-title text-muted">{format.name}</h3><p class="muted mb-4">{format.bestFor}</p><p class="eyebrow opacity-70">{t.exampleLabel}</p><p class="body-text mt-1 whitespace-pre-wrap text-muted">{format.example}</p></article>{/each}{/each}
		<button type="button" onclick={restart} class="link-quiet">{t.restart}</button>
	</section>
	<footer class="section border-t border-line pt-6">{@render credit()}</footer>
{/if}
