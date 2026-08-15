<script lang="ts">
	import PageMeta from '$lib/components/PageMeta.svelte';
	import InlineForm from '$lib/components/InlineForm.svelte';
	import { postTool } from '$lib/tools/client';

	/* The page's copy.
	 *
	 * The note under the field carries what somebody has a right to know BEFORE
	 * handing over an address, not after: what tool this needs (any AI that takes
	 * a long text — unlike Cervantes, nothing to install) and that downloading it
	 * subscribes them. In the confirmation it would arrive once it no longer
	 * matters. */
	const t = {
		placeholder: 'tu@email.com',
		button: 'Enviármelo',
		busy: 'Preparando el correo...',
		sentTitle: 'Va para tu correo',
		sentBody:
			'Te he mandado el enlace de descarga. Si no aparece en unos minutos, mira en spam.',
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
			await postTool('/recursos/analisis-de-autor/api', { email }, t);
			sent = true;
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = false;
		}
	}
</script>

<PageMeta
	title="Cómo analizar el archivo de un autor — Damian Soto"
	description="El método, los prompts y dos análisis completos para reconstruir lo que un autor hizo de verdad, artículo por artículo."
/>

<section class="screen-center">
	<article class="prose prose-xl prose-neutral max-w-none">
		<h1>Olvida lo que dice que hay que hacer: <mark>¿qué hizo realmente?</mark></h1>
		<p>
			<strong>Un paquete para desmontar a un autor con su propio archivo.</strong> Dentro va el método
			en trece pasos, los prompts ya escritos, y dos casos hechos enteros: todo lo que publicaron Dan
			Koe y Hussain Ibarra, y el análisis que salió de cada uno.
		</p>
	</article>

	{#if sent}
		<div class="box border-ink mt-8">
			<p class="box-title">{t.sentTitle}</p>
			<p class="box-text mt-2">{t.sentBody}</p>
		</div>
	{:else}
		{#if error}<p class="mt-6 text-sm text-error">{error}</p>{/if}
		<div class="mt-8">
			<InlineForm
				bind:value={email}
				type="email"
				placeholder={t.placeholder}
				label={t.button}
				busyLabel={t.busy}
				{busy}
				inputmode="email"
				autocomplete="email"
				onsubmit={send}
			/>
		</div>
	{/if}

	<div class="mt-6">
		<p class="muted">
			Son cuatro ficheros de texto: se abren en cualquier sitio y los prompts valen para cualquier IA
			que trague un documento largo. El archivo del autor que elijas tú lo bajas con <a
				class="link"
				href="/tool/archive">esta otra herramienta</a
			>, que es el paso 2 del método. Y es para quien lee Objeto Brillante: al descargarlo te
			suscribes. Si te canso, te borras en un clic desde cualquier correo.
		</p>
	</div>
</section>
