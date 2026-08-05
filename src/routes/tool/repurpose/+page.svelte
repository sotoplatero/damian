<script lang="ts">
	import PageMeta from '$lib/components/PageMeta.svelte';
	import InlineForm from '$lib/components/InlineForm.svelte';
	import ResultCard from '$lib/components/ResultCard.svelte';
	import GateBox from '$lib/components/GateBox.svelte';
	import { formats, freeFormats } from '$lib/tools/repurpose/formats';
	import { postTool, revealResult } from '$lib/tools/client';
	import { toPlainText, type Piece } from '$lib/tools/repurpose/format';

	/* The page's copy. The gate names what's missing: urgency comes from seeing
	   the list, not from adjectives. */
	const t = {
		urlPlaceholder: 'https://tublog.com/tu-articulo',
		urlButton: 'Enviar',
		urlWorking: 'Leyendo tu artículo...',
		urlHint: 'El enlace de un artículo tuyo ya publicado.',
		readLine: 'He leído {site}.',
		resultTitle: 'Nueve notas para distribuir tu artículo',
		lowConfidence:
			'Eso no parece un artículo entero, así que he supuesto bastante. Prueba con el enlace del artículo, no con la portada.',
		freeBadge: 'Gratis',
		copyAction: 'Copiar',
		copiedAction: 'Copiado',
		restart: 'Probar con otro artículo',
		gateTitle: 'Te quedan las seis con más recorrido',
		gateBody:
			'El detalle revelador, la historia, la consecuencia, la pregunta, la cita comentada y la puerta que lleva lectores al artículo. Dime a dónde te las mando y te llegan las nueve, más el prompt para repetirlo por tu cuenta.',
		gatePlaceholder: 'tu@email.com',
		gateButton: 'Enviar',
		gateUnlocking: 'Escribiendo y enviando...',
		sentTitle: 'Van para tu correo',
		sentBody:
			'Las nueve notas van en el correo y el prompt manual, adjunto. Si en un par de minutos no lo ves, mira en spam.',
		errorUnreadable:
			'Esa página no me deja leerla. Prueba con otra, o pega el enlace del artículo en lugar de la portada.',
		errorBlocked:
			'Esa web me cierra la puerta cuando entro yo. Si el artículo está en un sitio con muro, prueba con otro.',
		errorNotFound: 'Ahí no hay nada. Revisa el enlace.',
		errorTimeout: 'Esa página ha tardado demasiado. Inténtalo otra vez.',
		errorEmpty:
			'He entrado, pero no he encontrado texto que leer. Pega el enlace del artículo, no el de la portada.',
		errorInvalidUrl: 'Esa dirección no parece válida.',
		errorInvalidEmail: 'Ese email no parece válido.',
		errorDisposable: 'Eso es un buzón de usar y tirar. Dame uno de verdad.',
		errorSendFailed: 'No he podido enviarte el correo. Inténtalo otra vez.',
		errorRateLimit: 'Has distribuido unos cuantos ya. Espera un rato y vuelve.',
		errorGeneric: 'Algo ha fallado por mi parte. Inténtalo otra vez.',
		errorOffline: 'No se pudo conectar. Revisa tu conexión.'
	};

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

	const byId = $derived(new Map(pieces.map((piece) => [piece.id, piece])));
	const writtenFormats = $derived(formats.filter((format) => byId.has(format.id)));

	async function read() {
		busy = 'reading';
		error = '';
		try {
			const data = await postTool('/tool/repurpose', { step: 'extract', url }, t);
			article = data.article as Record<string, string>;
			pieces = data.pieces as Piece[];
			finalUrl = (data.url as string) ?? '';
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
	 * The other six pieces are written server-side and only ever sent by email.
	 * The email is the only place they exist, which is why the address is worth
	 * something.
	 */
	async function unlock() {
		busy = 'unlocking';
		error = '';
		try {
			await postTool('/tool/repurpose', { step: 'unlock', article, url: finalUrl, email, free: pieces }, t);
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
		article = null;
		finalUrl = '';
		site = '';
		lowConfidence = false;
		pieces = [];
		sent = false;
		email = '';
	}
</script>

<PageMeta
	title="Distribuye tu artículo — Damian Soto"
	description="Convierte un artículo en nueve notas breves, con distintas ideas, ángulos y extensiones, para seguir llevándole lectores."
/>

{#if !pieces.length}
	<section class="screen-center">
		<article class="prose prose-xl prose-neutral max-w-none">
			<h1>Distribuye tu <strong>artículo</strong>.</h1>
			<p>
				<strong>Pega el enlace.</strong> Lo convierto en nueve notas breves, con distintas ideas,
				ángulos y extensiones, para seguir llevándole lectores.
			</p>
		</article>
		{#if error}<p class="mt-6 text-sm text-error">{error}</p>{/if}
		<div class="mt-8">
			<InlineForm
				bind:value={url}
				placeholder={t.urlPlaceholder}
				label={t.urlButton}
				busyLabel={t.urlWorking}
				busy={busy === 'reading'}
				inputmode="url"
				autocomplete="url"
				onsubmit={read}
			/>
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

		{#each writtenFormats as format (format.id)}
			{@const written = byId.get(format.id)}
			{#if written}
				<ResultCard
					title={format.name}
					badge={freeFormats.some((f) => f.id === format.id) ? t.freeBadge : ''}
					note={format.bestFor}
					copyText={toPlainText(written)}
					copyLabel={t.copyAction}
					copiedLabel={t.copiedAction}
				>
					<p class="body-text whitespace-pre-wrap">{written.text}</p>
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
	</section>
{/if}
