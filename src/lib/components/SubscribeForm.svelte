<script lang="ts">
	/**
	 * Formulario de alta propio, con el log de terminal al enviar.
	 *
	 * AHORA MISMO NO SE USA EN NINGÚN SITIO. La home da de alta con el iframe
	 * de Substack. Esto se guarda aquí porque el diseño encaja con la página
	 * (el de Substack no) y porque el endpoint /api/subscribe sigue en pie:
	 * guarda el email en la audiencia de Resend y manda 00.md al momento.
	 *
	 * Para volver a usarlo:
	 *   import SubscribeForm from '$lib/components/SubscribeForm.svelte';
	 *   <SubscribeForm />
	 *
	 * Los textos vienen con valores por defecto para que funcione suelto. Si lo
	 * pones en la home y quieres tirar del frontmatter de home.md, pásaselos:
	 *   <SubscribeForm placeholder={t.placeholder} button={t.button} ... />
	 */
	let {
		placeholder = 'tu@email.com',
		button = 'Mándame el primero',
		sending = 'Enviando...',
		success = 'Míralo en tu correo. Ya está ahí.',
		error = 'Algo falló al enviar. Inténtalo de nuevo en un momento.',
		errorOffline = 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.'
	}: {
		placeholder?: string;
		button?: string;
		sending?: string;
		success?: string;
		error?: string;
		errorOffline?: string;
	} = $props();

	let email = $state('');
	let status = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let errorMessage = $state('');

	// Log de terminal que se revela línea a línea tras un alta correcta.
	// La última línea es el mensaje de éxito.
	let logLines = $state<string[]>([]);

	async function revealLog() {
		const lines = [
			'> email recibido',
			'> añadido a la lista',
			'> enviando tu lista... ✓',
			`> ${success}`
		];
		logLines = [];
		for (const line of lines) {
			logLines = [...logLines, line];
			await new Promise((resolve) => setTimeout(resolve, 480));
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!email.trim()) return;

		status = 'loading';
		errorMessage = '';

		try {
			const response = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			if (response.ok) {
				status = 'success';
				email = '';
				revealLog();
			} else {
				const data = await response.json().catch(() => ({}));
				status = 'error';
				errorMessage = data?.error === 'invalid_email' ? 'Ese email no parece válido.' : error;
			}
		} catch {
			status = 'error';
			errorMessage = errorOffline;
		}
	}
</script>

<section class="space-y-3">
	{#if status === 'success'}
		<div class="terminal" role="status">
			{#each logLines as line}
				<div class="terminal-line">{line}</div>
			{/each}
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="space-y-3">
			<input
				type="email"
				bind:value={email}
				required
				disabled={status === 'loading'}
				{placeholder}
				class="input input-bordered input-lg w-full"
				autocomplete="email"
			/>
			<button type="submit" disabled={status === 'loading'} class="btn btn-primary btn-lg btn-block">
				{status === 'loading' ? sending : button}
			</button>
			{#if status === 'error'}
				<p class="error-text">{errorMessage}</p>
			{/if}
		</form>
	{/if}
</section>

<style>
	.terminal {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.95rem;
		line-height: 1.9;
		color: var(--color-read);
	}
	.terminal-line {
		white-space: pre-wrap;
	}
</style>
