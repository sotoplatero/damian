<script lang="ts">
	import PageMeta from '$lib/components/PageMeta.svelte';
	import InlineForm from '$lib/components/InlineForm.svelte';
	import { postTool } from '$lib/tools/client';
	import { splitHeadline, SUBSCRIBE_NOTE, NEWSLETTER_NOTE } from '$lib/resources/list';
	import type { PageData } from './$types';

	/**
	 * The page every resource is painted on.
	 *
	 * ONE PAGE, ANY NUMBER OF DOWNLOADS. What differs between two resources is
	 * copy, and copy is data: it lives in `$lib/resources/list.ts`. There were two
	 * folders here before, 95 lines each, identical but for the strings — which is
	 * exactly how a third one gets a stale note under its field or a confirmation
	 * that forgets to say the address went on a list.
	 *
	 * The strings that are NOT per-resource are the two shared notes: the price of
	 * the download and what the newsletter is. Those are the sentences that have to
	 * read the same on every one of these pages, so neither is copyable.
	 */
	let { data }: { data: PageData } = $props();
	const resource = $derived(data.resource);
	const headline = $derived(splitHeadline(resource.headline, resource.mark));

	/*
	 * The copy the FORM speaks, as against the copy the resource speaks. These are
	 * the same for every download because they describe the mechanism — an address
	 * in, a link out — and `$lib/tools/client.ts` maps the server's error codes
	 * onto these key names, the same as every tool.
	 */
	const t = {
		placeholder: 'tu@email.com',
		/* The field's accessible name. `tu@email.com` is an example, not a name, and
		   it is what a screen reader fell back to announcing. */
		fieldLabel: 'Tu correo electrónico',
		button: 'Enviármelo',
		busy: 'Preparando el correo...',
		sentTitle: 'Va para tu correo',
		sentBody:
			'Te he mandado el enlace de descarga. Si no aparece en unos minutos, mira en spam. Y si te apetece, responde a ese correo y dime qué automatizarías: los leo yo.',
		errorInvalidEmail: 'Ese email no parece válido.',
		errorDisposable: 'Eso es un buzón de usar y tirar. Dame uno de verdad.',
		errorSendFailed: 'No he podido enviarte el correo. Inténtalo otra vez.',
		errorRateLimit: 'Has pedido esto unas cuantas veces. Espera un rato y vuelve.',
		errorGeneric: 'Algo ha fallado por mi parte. Inténtalo otra vez.',
		errorOffline: 'No se pudo conectar. Revisa tu conexión.'
	};

	let email = $state('');
	let busy = $state(false);
	let error = $state('');
	let sent = $state(false);

	async function send() {
		busy = true;
		error = '';
		try {
			await postTool(`/recursos/${resource.slug}/api`, { email }, t);
			sent = true;
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = false;
		}
	}
</script>

<PageMeta title={resource.title} description={resource.description} />

<section class="screen-center">
	<article class="prose prose-xl prose-neutral max-w-none">
		<h1>{headline[0]}{#if headline[1]}<mark>{headline[1]}</mark>{/if}{headline[2]}</h1>
		<p><strong>{resource.lead.opening}</strong> {resource.lead.rest}</p>
	</article>

	<!--
		WHAT IS IN THE FILE, BEFORE THE FIELD AND NOT AFTER IT.

		Both of these pages used to go headline → one paragraph → give me your
		address, and the thing being handed over was never described: no format, no
		contents, nothing. The visitor was asked to pay in the only currency they
		have on a page that hadn't shown them the goods.

		It is hairline-separated lines and not a grid of cards on purpose. Three
		items do not need three boxes, and this site's unit of content is a rule.
	-->
	<section class="section">
		<h2 class="letter-heading">Qué hay dentro del {resource.format}</h2>
		<ul class="contents-list">
			{#each resource.contents as item (item)}
				<li class="body-text text-soft">{item}</li>
			{/each}
		</ul>
	</section>

	{#if sent}
		<div class="box border-ink mt-8">
			<p class="box-title">{t.sentTitle}</p>
			<p class="box-text mt-2">{t.sentBody}</p>
		</div>
	{:else}
		<!--
			`aria-live` because the error appears without the page moving: a screen
			reader hears nothing about a message that is simply painted, and the
			person who typed a bad address is left with a button that did nothing.
		-->
		<div class="mt-8" aria-live="polite">
			{#if error}<p class="mb-4 text-sm text-error">{error}</p>{/if}
			<InlineForm
				bind:value={email}
				type="email"
				placeholder={t.placeholder}
				fieldLabel={t.fieldLabel}
				label={t.button}
				busyLabel={t.busy}
				{busy}
				inputmode="email"
				autocomplete="email"
				onsubmit={send}
			/>
		</div>
	{/if}

	<div class="mt-6 space-y-2">
		{#if resource.requirement}
			<p class="muted">
				{resource.requirement.before}<a
					class="link"
					href={resource.requirement.href}
					target={resource.requirement.href.startsWith('http') ? '_blank' : undefined}
					rel={resource.requirement.href.startsWith('http')
						? 'noopener noreferrer'
						: undefined}>{resource.requirement.linkLabel}</a
				>{resource.requirement.after}
			</p>
		{/if}
		<p class="muted">{NEWSLETTER_NOTE} {SUBSCRIBE_NOTE}</p>
	</div>
</section>

<style>
	/*
	 * The contents of the file: one line per thing, separated by the same hairline
	 * the rest of the site uses for an edge. No bullets — a bullet plus a rule is
	 * two marks doing one job — and no cards.
	 */
	.contents-list {
		margin-top: 1.25rem;
		border-top: 1px solid var(--color-line);
	}
	/* The size and colour come from `.body-text` and `text-soft` in the markup —
	   a raw `font-size` here would be a third type size nobody voted for. */
	.contents-list li {
		padding: 0.85rem 0;
		border-bottom: 1px solid var(--color-line);
	}
</style>
