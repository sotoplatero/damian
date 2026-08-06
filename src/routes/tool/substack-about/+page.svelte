<script lang="ts">
	import PageMeta from '$lib/components/PageMeta.svelte';
	import InlineForm from '$lib/components/InlineForm.svelte';
	import GateBox from '$lib/components/GateBox.svelte';
	import { postTool, revealResult } from '$lib/tools/client';
	import type { AboutFinding } from '$lib/tools/substack-about/prompt';

	/* The page's copy. The gate names what's missing: urgency comes from seeing
	   the list, not from adjectives. */
	const t = {
		urlPlaceholder: 'tunewsletter.substack.com',
		urlButton: 'Enviar',
		urlScanning: 'Leyendo tu página...',
		readLine: 'He leído el Acerca de de {site}.',
		resultTitle: 'Diagnóstico del Acerca de de {site}',
		labelTopic: 'De qué parece que va',
		labelReader: 'Para quién parece escrito',
		labelBenefit: 'Qué se lleva el lector',
		labelFirst: 'El problema que arreglaría primero',
		labelEvidence: 'Lo que he visto',
		labelFix: 'Qué cambiar',
		labelPromise: 'Una promesa mejor',
		gateTitle: 'Has visto un hallazgo de cinco',
		gateBody:
			'Quedan cuatro —para quién escribes, qué gana el lector, por qué creerte y qué recibe quien se suscribe— y tu Acerca de reescrito entero, listo para pegar. Sin inventarme cifras, experiencia ni testimonios. Dime a dónde te lo mando.',
		gatePlaceholder: 'tu@email.com',
		gateButton: 'Enviar',
		gateUnlocking: 'Preparando el correo...',
		sentTitle: 'Va para tu correo',
		sentBody:
			'El diagnóstico y la versión completa ya están enviados. Si no aparecen en unos minutos, mira en spam.',
		restart: 'Probar con otro Substack',
		errorUnreadable:
			'No he podido leer esa publicación. Tiene que ser una dirección pública terminada en substack.com.',
		errorInvalidEmail: 'Ese email no parece válido.',
		errorDisposable: 'Eso es un buzón de usar y tirar. Dame uno de verdad.',
		errorSendFailed: 'No he podido enviarte el correo. Inténtalo otra vez.',
		errorRateLimit: 'Has hecho unas cuantas pruebas. Espera un rato y vuelve.',
		errorGeneric: 'Algo ha fallado por mi parte. Inténtalo otra vez.',
		errorOffline: 'No se pudo conectar. Revisa tu conexión.'
	};

	let url = $state('');
	let email = $state('');
	let busy = $state<'analyzing' | 'unlocking' | ''>('');
	let error = $state('');
	let sent = $state(false);
	let result = $state<{
		site: string;
		diagnosis: { topic: string; reader: string; benefit: string; verdict: string };
		first: AboutFinding;
		promise: string;
		lockedCount: number;
	} | null>(null);

	async function analyze() {
		busy = 'analyzing';
		error = '';
		try {
			result = await postTool('/tool/substack-about/api', { step: 'analyze', url }, t);
			await revealResult();
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = '';
		}
	}

	async function unlock() {
		busy = 'unlocking';
		error = '';
		try {
			await postTool('/tool/substack-about/api', { step: 'unlock', url, email }, t);
			sent = true;
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = '';
		}
	}

	function restart() {
		url = '';
		email = '';
		result = null;
		sent = false;
		error = '';
	}
</script>

<PageMeta
	title="Reescribe el Acerca de de tu Substack — Damian Soto"
	description="Audita y reescribe la página Acerca de de tu newsletter en Substack."
/>

{#snippet credit()}
	<p class="muted">
		La estructura principal sigue la
		<a
			class="link"
			target="_blank"
			rel="noopener noreferrer"
			href="https://toniherrera.substack.com/p/creacrear-tu-pagina-acerca-de-en-substack"
			>guía pública de Toni Herrera</a
		>. El diagnóstico incorpora criterios de
		<a
			class="link"
			target="_blank"
			rel="noopener noreferrer"
			href="https://ensayos.substack.com/p/como-lanzar-la-monetizacion-de-tu">Roberto y Veronica Llorca-Smith</a
		>,
		<a class="link" target="_blank" rel="noopener noreferrer" href="https://directorio.substack.com/p/empezar-aqui"
			>David</a
		>,
		<a
			class="link"
			target="_blank"
			rel="noopener noreferrer"
			href="https://escribe.substack.com/p/como-substack-se-convirtio-en-mi">Alba García Marcos y Víctor Millán</a
		>.
	</p>
{/snippet}

{#if !result}
	<section class="screen-center">
		<article class="prose prose-xl prose-neutral max-w-none">
			<h1>Reescribe el <mark>“Acerca de”</mark> de tu Substack.</h1>
			<p>
				<strong>Pega la dirección de tu publicación.</strong> Te digo si se entiende qué escribes,
				para quién y por qué merece un sitio en su correo. Después te propongo una versión mejor.
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
			<h1>{t.resultTitle.replace('{site}', `${result.site}.substack.com`)}</h1>
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

		<footer class="section border-t border-line pt-6">{@render credit()}</footer>
	</section>
{/if}
