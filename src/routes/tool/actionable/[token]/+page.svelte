<script lang="ts">
	import { page } from '$app/state';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import InlineForm from '$lib/components/InlineForm.svelte';
	import ResultCard from '$lib/components/ResultCard.svelte';
	import { postTool, revealResult } from '$lib/tools/client';
	import type { Result } from '$lib/tools/actionable/run-prompt';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const spec = data.spec;

	/*
	 * A generated tool has to stand on its own: whoever opens this link never
	 * read the source article and did not ask for any of this. So the page says
	 * what it does, asks for what it needs and gets out of the way — and it
	 * credits the source visibly, which is both the honest thing and the reason
	 * the author shared it.
	 */
	const t = {
		emailPlaceholder: 'tu@email.com',
		button: 'Dame los resultados',
		working: 'Escribiendo...',
		emailNote: 'Te pido el correo una vez. Al usarla te suscribes a mi newsletter, y te puedes borrar en un clic.',
		again: 'Otra vez, con otros datos',
		copyAction: 'Copiar',
		copiedAction: 'Copiado',
		source: 'Hecha a partir de',
		madeWith: 'Hecha con una herramienta que convierte artículos en herramientas.',
		errorInvalidEmail: 'Ese email no parece válido.',
		errorDisposable: 'Eso es un buzón de usar y tirar. Dame uno de verdad.',
		errorIncompleteForm: 'Rellena todos los campos: cada uno cambia lo que sale.',
		errorRateLimit: 'Has usado unas cuantas ya. Espera un rato y vuelve.',
		errorGeneric: 'Algo ha fallado por mi parte. Inténtalo otra vez.',
		errorOffline: 'No se pudo conectar. Revisa tu conexión.'
	};

	let busy = $state(false);
	let error = $state('');
	let email = $state('');
	let valores = $state<Record<string, string>>(
		Object.fromEntries(spec.campos.map((field) => [field.id, field.tipo === 'opcion' ? field.opciones[0] : '']))
	);
	let results = $state<Result[]>([]);

	const complete = $derived(spec.campos.every((field) => valores[field.id]?.trim()));

	async function run() {
		// Caught here as well as on the server, because the server's answer to a
		// half-filled form costs a round trip to say something the page already
		// knew.
		if (!complete) {
			error = t.errorIncompleteForm;
			return;
		}
		busy = true;
		error = '';
		try {
			// Posts to its own address: the endpoint reads the tool from the signed
			// token in the path, so the page never has to carry the spec around.
			const data = await postTool(page.url.pathname, { email, valores: $state.snapshot(valores) }, t);
			results = data.results as Result[];
			await revealResult();
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = false;
		}
	}

	function again() {
		results = [];
		error = '';
	}
</script>

<PageMeta title="{spec.nombre} — Damian Soto" description={spec.queHace} />

{#if !results.length}
	<section class="screen-center">
		<article class="prose prose-xl prose-neutral max-w-none">
			<h1>{spec.nombre}</h1>
			<p>{spec.queHace}</p>
		</article>

		{#if error}<p class="mt-6 text-sm text-error">{error}</p>{/if}

		<div class="mt-8 space-y-5">
			{#each spec.campos as field (field.id)}
				<div>
					<label class="box-title block" for={field.id}>{field.etiqueta}</label>
					{#if field.tipo === 'opcion'}
						<select id={field.id} class="mt-2 w-full rounded-lg border border-line bg-white p-3" bind:value={valores[field.id]}>
							{#each field.opciones as option (option)}
								<option value={option}>{option}</option>
							{/each}
						</select>
					{:else if field.tipo === 'parrafo'}
						<textarea
							id={field.id}
							class="mt-2 w-full rounded-lg border border-line bg-white p-3"
							rows="4"
							placeholder={field.ayuda}
							bind:value={valores[field.id]}
						></textarea>
					{:else}
						<input
							id={field.id}
							type="text"
							class="mt-2 w-full rounded-lg border border-line bg-white p-3"
							placeholder={field.ayuda}
							bind:value={valores[field.id]}
						/>
					{/if}
					<!-- What this field changes, said out loud. It is the promise the
					     plan step made and the visitor's way of knowing the field
					     isn't decoration. -->
					<p class="muted mt-1">{field.cambia}</p>
				</div>
			{/each}

			<div>
				<InlineForm
					bind:value={email}
					type="email"
					placeholder={t.emailPlaceholder}
					label={t.button}
					busyLabel={t.working}
					{busy}
					inputmode="email"
					autocomplete="email"
					onsubmit={run}
				/>
				<p class="muted mt-2">{t.emailNote}</p>
			</div>
		</div>

		<p class="muted mt-10">
			{t.source}
			<a class="link-quiet" href={spec.fuente.url} target="_blank" rel="noopener noreferrer">
				{spec.fuente.titulo || spec.fuente.url}
			</a>
		</p>
	</section>
{:else}
	<section id="resultado" class="space-y-6">
		<button type="button" class="link-quiet" onclick={again}>← {t.again}</button>
		<header class="prose prose-xl prose-neutral max-w-none">
			<h1>{spec.nombre}</h1>
		</header>
		{#if error}<p class="text-sm text-error">{error}</p>{/if}

		{#each results as result, index (index)}
			<ResultCard
				title={`${index + 1}`}
				note={result.nota}
				copyText={result.texto}
				copyLabel={t.copyAction}
				copiedLabel={t.copiedAction}
			>
				<p class="body-text whitespace-pre-wrap">{result.texto}</p>
			</ResultCard>
		{/each}

		<p class="muted">
			{t.source}
			<a class="link-quiet" href={spec.fuente.url} target="_blank" rel="noopener noreferrer">
				{spec.fuente.titulo || spec.fuente.url}
			</a>. <a class="link-quiet" href="/tool/actionable">{t.madeWith}</a>
		</p>
	</section>
{/if}
