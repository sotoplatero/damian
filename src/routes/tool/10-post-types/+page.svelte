<script lang="ts">
	import PageMeta from '$lib/components/PageMeta.svelte';
	import InlineForm from '$lib/components/InlineForm.svelte';
	import TextareaForm from '$lib/components/TextareaForm.svelte';
	import ResultCard from '$lib/components/ResultCard.svelte';
	import GateBox from '$lib/components/GateBox.svelte';
	import { postTypes, freePostType } from '$lib/tools/10-post-types/types';
	import { toPlainText, type GeneratedPost } from '$lib/tools/10-post-types/format';
	import { postTool, revealResult } from '$lib/tools/client';

	/** The same limits the server validates. If they change there, they change here. */
	const IDEA_MIN = 20;
	const IDEA_MAX = 2000;

	/* The page's copy. The gate names what's missing: urgency comes from seeing
	   the list, not from adjectives. */
	const t = {
		ideaPlaceholder:
			'Escribe tu idea. Por ejemplo: llevo seis años montando cocinas industriales y la mayoría de los restaurantes que cierran lo hacen por cómo tienen puesta la cocina, no por la comida.',
		ideaButton: 'Enviar',
		ideaWorking: 'Escribiendo...',
		ideaHint: 'Cuéntame de qué va y para quién. Un par de frases bastan.',
		ideaShortcut: 'O pulsa Ctrl+Enter.',
		resultTitle: 'Tu tema, en diez posts distintos.',
		lowConfidence:
			'Tu idea es un poco corta, así que he supuesto bastante. Si los posts no te encajan, ese es el motivo: cuéntame algo más y vuelve a probar.',
		freeBadge: 'Gratis',
		copyAction: 'Copiar',
		copiedAction: 'Copiado',
		restart: 'Probar con otra idea',
		gateTitle: 'Esto era uno de diez',
		gateBody:
			'Te faltan la observación, la lista, el caso de éxito, la historia personal, el contracorriente y cuatro más, todos sobre tu mismo tema. Dime a dónde te los mando y te llegan los diez, listos para copiar y pegar.',
		gatePlaceholder: 'tu@email.com',
		gateButton: 'Enviar',
		gateUnlocking: 'Escribiendo y enviando...',
		sentTitle: 'Van para tu correo',
		sentBody: 'Los diez, escritos y enviados. Si en un par de minutos no lo ves, mira en spam.',
		errorUnreadable:
			'No he sacado nada en claro de eso. Cuéntame de qué va tu tema y para quién, aunque sea en dos frases.',
		errorIdeaShort: 'Con eso no tengo suficiente. Escribe un par de frases: de qué va y para quién.',
		errorInvalidEmail: 'Ese email no parece válido.',
		errorDisposable:
			'Eso es un buzón de usar y tirar. Dame uno de verdad, que es donde te mando los posts.',
		errorSendFailed: 'No he podido enviarte el correo. Inténtalo otra vez.',
		errorRateLimit: 'Has generado unos cuantos ya. Espera un rato y vuelve.',
		errorGeneric: 'Algo ha fallado por mi parte. Inténtalo otra vez.',
		errorOffline: 'No se pudo conectar. Revisa tu conexión.'
	};

	let busy = $state<'' | 'analyzing' | 'unlocking'>('');
	let error = $state('');

	/** The idea as the person wrote it. This used to be a scraped URL. */
	let idea = $state('');
	/** The topic the model inferred. Travels back to the server to write the other nine. */
	let topic = $state<Record<string, string> | null>(null);
	let lowConfidence = $state(false);

	let posts = $state<GeneratedPost[]>([]);
	let sent = $state(false);
	let email = $state('');

	const byId = $derived(new Map(posts.map((post) => [post.id, post])));
	const writtenTypes = $derived(postTypes.filter((type) => byId.has(type.id)));

	async function analyze() {
		busy = 'analyzing';
		error = '';
		try {
			const data = await postTool('/tool/10-post-types', { step: 'extract', idea }, t);
			topic = data.topic as Record<string, string>;
			posts = data.posts as GeneratedPost[];
			lowConfidence = data.confidence === 'baja';
			await revealResult();
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = '';
		}
	}

	/**
	 * The other nine posts are written server-side and only ever sent by email.
	 * The email is the only place they exist, which is why the address is worth
	 * something.
	 */
	async function unlock() {
		busy = 'unlocking';
		error = '';
		try {
			await postTool('/tool/10-post-types', { step: 'unlock', topic, email, free: posts }, t);
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
		idea = '';
		topic = null;
		lowConfidence = false;
		posts = [];
		sent = false;
		email = '';
	}
</script>

<PageMeta
	title="Saca 10 posts distintos de una sola idea — Damian Soto"
	description="Escribe un tema y recibe diez posts distintos listos para publicar. El primero es gratis."
/>

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

{#if !posts.length}
	<section class="screen-center">
		<article class="prose prose-xl prose-neutral max-w-none">
			<h1>Saca 10 posts <strong>distintos</strong> de una sola idea.</h1>
			<p>
				<strong>Escribe el tema.</strong> Te doy diez posts listos para publicar. Así no vuelves a
				mirar el cursor sin saber qué decir.
			</p>
		</article>

		{#if error}<p class="mt-6 text-sm text-error">{error}</p>{/if}

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

		<div class="mt-6">{@render credit()}</div>
	</section>
{:else}
	<section id="resultado" class="space-y-6">
		<button type="button" class="link-quiet" onclick={restart}>← {t.restart}</button>
		<header class="prose prose-xl prose-neutral max-w-none">
			<h1>{t.resultTitle}</h1>
		</header>
		{#if lowConfidence}<p class="muted">{t.lowConfidence}</p>{/if}
		{#if error}<p class="text-sm text-error">{error}</p>{/if}

		{#each writtenTypes as type (type.id)}
			{@const written = byId.get(type.id)}
			{#if written}
				<ResultCard
					title={type.name}
					badge={type.id === freePostType.id ? t.freeBadge : ''}
					note={type.bestFor}
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

		<footer class="section border-t border-line pt-6">
			{@render credit()}
		</footer>
	</section>
{/if}
