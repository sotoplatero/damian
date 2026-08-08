<script lang="ts">
	import PageMeta from '$lib/components/PageMeta.svelte';
	import InlineForm from '$lib/components/InlineForm.svelte';
	import { postTool } from '$lib/tools/client';

	/* The page's copy.
	 *
	 * The note under the field carries the two things somebody has a right to know
	 * BEFORE handing over an address, not after: that this opens with Claude Code,
	 * and that downloading it subscribes them. Putting either of them in the
	 * confirmation would be telling them once it no longer matters. */
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
			await postTool('/recursos/cervantes/api', { email }, t);
			sent = true;
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = false;
		}
	}
</script>

<PageMeta
	title="Cervantes, tu redactor de newsletter — Damian Soto"
	description="Una carpeta que aprende cómo escribes leyendo lo que ya publicaste, y redacta contigo cada número de tu newsletter."
/>

<section class="screen-center">
	<article class="prose prose-xl prose-neutral max-w-none">
		<h1>Un redactor que ya ha leído <mark>todo lo que publicaste</mark>.</h1>
		<p>
			<strong>Cervantes es una carpeta.</strong> La abres, lee tu newsletter entera para aprender
			cómo escribes, y a partir de ahí saca los números contigo: el gancho, la estructura, la
			portada y el envío.
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
			Cervantes se abre con <a
				class="link"
				target="_blank"
				rel="noopener noreferrer"
				href="https://claude.com/claude-code">Claude Code</a
			>. No hace falta saber programar, pero sí tenerlo instalado. Y es para quien lee Objeto
			Brillante: al descargarlo te suscribes. Si te canso, te borras en un clic desde cualquier
			correo.
		</p>
	</div>
</section>
