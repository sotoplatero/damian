<script lang="ts">
	import PageMeta from '$lib/components/PageMeta.svelte';
	import InlineForm from '$lib/components/InlineForm.svelte';
	import ResultCard from '$lib/components/ResultCard.svelte';
	import GateBox from '$lib/components/GateBox.svelte';
	import { frameworks, freeFramework } from '$lib/tools/7-frameworks/frameworks';
	import { toPlainText, type GeneratedCopy } from '$lib/tools/7-frameworks/format';
	import { postTool, revealResult } from '$lib/tools/client';

	/* The page's copy. The gate names what's missing: urgency comes from seeing
	   the list, not from adjectives. */
	const t = {
		urlPlaceholder: 'tuweb.com',
		urlButton: 'Escribir mi copy',
		urlScanning: 'Leyendo tu web...',
		readLine: 'He leído {site}.',
		resultTitle: 'Tu oferta, escrita de siete formas.',
		lowConfidence:
			'Tu web no dice muy claro qué vendes, así que he supuesto. Si el texto no te encaja, ese es el motivo.',
		freeBadge: 'Gratis',
		copyAction: 'Copiar',
		copiedAction: 'Copiado',
		restart: 'Probar con otra web',
		gateTitle: 'PAS era el primero de siete',
		gateBody:
			"Te faltan BAB, AIDA, el storytelling de Pixar, PASTOR para una carta de ventas entera, Las 4 P's y PRUNE, todos escritos con tu oferta. Dime a dónde te los mando y te llegan los siete, listos para copiar y pegar.",
		gatePlaceholder: 'tu@email.com',
		gateButton: 'Mándamelos',
		gateUnlocking: 'Escribiendo y enviando...',
		sentTitle: 'Van para tu correo',
		sentBody: 'Los siete, escritos y enviados. Si en un par de minutos no lo ves, mira en spam.',
		errorUnreadable:
			'Esa página no me deja leerla. Prueba con otra: tu home, una página de producto, un artículo tuyo.',
		errorInvalidUrl: 'Esa dirección no parece válida.',
		errorInvalidEmail: 'Ese email no parece válido.',
		errorDisposable:
			'Eso es un buzón de usar y tirar. Dame uno de verdad, que es donde te mando los textos.',
		errorSendFailed: 'No he podido enviarte el correo. Inténtalo otra vez.',
		errorRateLimit: 'Has generado unos cuantos ya. Espera un rato y vuelve.',
		errorGeneric: 'Algo ha fallado por mi parte. Inténtalo otra vez.',
		errorOffline: 'No se pudo conectar. Revisa tu conexión.'
	};

	let busy = $state<'' | 'analyzing' | 'unlocking'>('');
	let error = $state('');

	let url = $state('');
	/** The offer the model inferred. Travels back to the server to write the other six. */
	let offer = $state<Record<string, string> | null>(null);
	let site = $state('');
	let lowConfidence = $state(false);

	let copies = $state<GeneratedCopy[]>([]);
	let sent = $state(false);
	let email = $state('');

	const byId = $derived(new Map(copies.map((copy) => [copy.id, copy])));
	const writtenFrameworks = $derived(frameworks.filter((f) => byId.has(f.id)));

	async function analyze() {
		busy = 'analyzing';
		error = '';
		try {
			const data = await postTool('/tool/7-frameworks', { step: 'analyze', url }, t);
			offer = data.offer as Record<string, string>;
			copies = data.copies as GeneratedCopy[];
			site = (data.site as string) ?? '';
			lowConfidence = data.confidence === 'baja';
			await revealResult();
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = '';
		}
	}

	/**
	 * The other six frameworks are written server-side and only ever sent by
	 * email. The email is the only place they exist, which is why the address is
	 * worth something.
	 */
	async function unlock() {
		busy = 'unlocking';
		error = '';
		try {
			await postTool('/tool/7-frameworks', { step: 'unlock', offer, email, free: copies }, t);
			sent = true;
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = '';
		}
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
	}
</script>

<PageMeta
	title="Reescribe tu oferta con 7 fórmulas de venta — Damian Soto"
	description="Pega tu web y recibe siete versiones de tu oferta listas para usar. La primera es gratis."
/>

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

{#if !copies.length}
	<section class="screen-center">
		<article class="prose prose-xl prose-neutral max-w-none">
			<h1>Reescribe tu oferta con 7 fórmulas de venta.</h1>
			<p>
				<strong>Pega tu web.</strong> Te doy siete versiones listas para usar. Así dejas de pelearte
				con la página en blanco.
			</p>
		</article>

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

		<div class="mt-6">{@render credit()}</div>
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

		{#each writtenFrameworks as framework (framework.id)}
			{@const copy = byId.get(framework.id)}
			{#if copy}
				<ResultCard
					title={framework.name}
					badge={framework.id === freeFramework.id ? t.freeBadge : ''}
					note={framework.bestFor}
					copyText={toPlainText(copy)}
					copyLabel={t.copyAction}
					copiedLabel={t.copiedAction}
				>
					<div class="space-y-3">
						{#each framework.steps as step (step.key)}
							{#if copy.blocks[step.key]}
								<div>
									<p class="eyebrow">{step.label}</p>
									<p class="body-text whitespace-pre-wrap">{copy.blocks[step.key]}</p>
								</div>
							{/if}
						{/each}
					</div>
				</ResultCard>
			{/if}
		{/each}

		<GateBox
			{sent}
			bind:email
			busy={busy === 'unlocking'}
			gateTitle={t.gateTitle}
			gateBody={t.gateBody}
			sentTitle={t.sentTitle}
			sentBody={t.sentBody}
			placeholder={t.gatePlaceholder}
			label={t.gateButton}
			busyLabel={t.gateUnlocking}
			onsubmit={unlock}
		/>

		<footer class="section border-t border-line pt-6">
			{@render credit()}
		</footer>
	</section>
{/if}
