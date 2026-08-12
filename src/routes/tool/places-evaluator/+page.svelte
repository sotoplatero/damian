<script lang="ts">
	import { CheckCircle, XCircle, AlertCircle } from 'lucide-svelte';
	import { enhance, deserialize } from '$app/forms';

	/* La copia de la página.
	 *
	 * Estaba en `messages/{en,es}.json` y la servía Paraglide, porque esta
	 * herramienta se escribió cuando el sitio iba a ser bilingüe. No lo es: todo lo
	 * demás lleva su copia donde se usa, y esta era la única página que quedaba
	 * atada al plugin. Al quitarlo, sus ocho cadenas se vienen aquí. */
	const t = {
		title: 'Evaluador de Google Places',
		description: 'Analiza la calidad de tu perfil de negocio',
		evaluate: 'Evaluar',
		evaluating: 'Evaluando...',
		results: 'Resultados de la evaluación',
		score: 'Puntuación',
		recommendation: 'Recomendación'
	};

	let { form } = $props();

	let loading = $state(false);
	let searchValue = $state('');
	let selectedPlaceId = $state('');
	let suggestions = $state<Array<{ description: string; place_id: string }>>([]);
	let showSuggestions = $state(false);
	let autocompleteLoading = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	function getStatusIcon(status: string) {
		switch (status) {
			case 'pass':
				return CheckCircle;
			case 'fail':
				return XCircle;
			case 'warning':
				return AlertCircle;
			default:
				return AlertCircle;
		}
	}

	function getStatusClass(status: string) {
		switch (status) {
			case 'pass':
				return 'text-success';
			case 'fail':
				return 'text-error';
			case 'warning':
				return 'text-warning';
			default:
				return '';
		}
	}

	async function handleInput(event: Event) {
		console.log('[CLIENT] handleInput called');
		const target = event.target as HTMLInputElement;
		searchValue = target.value;
		selectedPlaceId = ''; // Reset place_id cuando el usuario escribe
		console.log('[CLIENT] searchValue:', searchValue);

		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		if (searchValue.length < 2) {
			console.log('[CLIENT] searchValue too short');
			suggestions = [];
			showSuggestions = false;
			return;
		}

		console.log('[CLIENT] Setting timeout for fetch');
		debounceTimer = setTimeout(async () => {
			console.log('[CLIENT] Timeout fired, making fetch request');
			autocompleteLoading = true;
			const formData = new FormData();
			formData.append('query', searchValue);

			try {
				const response = await fetch('?/autocomplete', {
					method: 'POST',
					body: formData
				});

				// Usar deserialize de SvelteKit para manejar devalue correctamente
				const result = deserialize(await response.text());

				console.log('[CLIENT] Deserialized result:', result);

				if (result.type === 'success' && result.data) {
					// `deserialize` devuelve `Record<string, unknown>`: lo que venga de la
					// acción no está tipado, así que la forma se declara aquí. Sin esto,
					// `data.suggestions` es `{}` y asignarlo a `suggestions` era el único
					// error que daba `pnpm check` en todo el repo.
					const data = result.data as {
						suggestions?: Array<{ description: string; place_id: string }>;
					};
					const newSuggestions = Array.isArray(data.suggestions) ? data.suggestions : [];

					suggestions = newSuggestions;
					showSuggestions = newSuggestions.length > 0;
				} else {
					suggestions = [];
					showSuggestions = false;
				}
			} catch (error) {
				console.error('Autocomplete error:', error);
				suggestions = [];
				showSuggestions = false;
			} finally {
				autocompleteLoading = false;
			}
		}, 300);
	}

	function selectSuggestion(suggestion: { description: string; place_id: string }) {
		searchValue = suggestion.description;
		selectedPlaceId = suggestion.place_id;
		suggestions = [];
		showSuggestions = false;
		console.log('[CLIENT] Selected place_id:', selectedPlaceId);
	}

	function handleBlur() {
		// Delay to allow click on suggestion
		setTimeout(() => {
			showSuggestions = false;
		}, 200);
	}
</script>

<div class="flex items-center justify-center">
	<div class="w-full max-w-3xl space-y-6">
		<!-- El enlace de vuelta lo pone src/routes/tool/+layout.svelte, comun a
		     todas las herramientas. -->

		<!-- Header -->
		<div class="text-center space-y-2">
			<h1 class="text-3xl font-bold">{t.title}</h1>
			<p class="text-sm opacity-80">{t.description}</p>
		</div>

		<!-- Search Form -->
		<form
			method="POST"
			action="?/evaluate"
			class="card bg-base-200"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
		>
			<div class="card-body space-y-4">
				<!-- Campo oculto para el place_id -->
				<input type="hidden" name="place_id" value={selectedPlaceId} />

				<div class="form-control relative">
					<input
						type="text"
						name="search"
						placeholder="Nombre del negocio, Place ID o URL de Google Maps"
						class="input input-bordered"
						required
						bind:value={searchValue}
						oninput={handleInput}
						onblur={handleBlur}
						onfocus={() => {
							if (suggestions.length > 0) showSuggestions = true;
						}}
						autocomplete="off"
					/>
					{#if autocompleteLoading}
						<span class="loading loading-spinner loading-sm absolute right-3 top-3"></span>
					{/if}
					{#if showSuggestions && suggestions.length > 0}
						<ul class="menu bg-base-200 border border-base-300 rounded-box absolute top-full mt-1 w-full z-10 shadow-lg max-h-60 overflow-y-auto">
							{#each suggestions as suggestion}
								<li>
									<button
										type="button"
										class="text-left"
										onclick={() => selectSuggestion(suggestion)}
									>
										{suggestion.description}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
					<!-- Nota, no <label>: no etiqueta ningún control (el campo ya tiene el
					     suyo), y como <label> era un aviso de accesibilidad. -->
					<p class="label-text-alt mt-1 opacity-70">
						Por ejemplo «Starbucks Madrid», o pega la URL de Google Maps o el Place ID.
					</p>
				</div>

				{#if form?.error}
					<div class="alert alert-error">
						<span>{form.error}</span>
					</div>
				{/if}

				<button type="submit" class="btn btn-primary" disabled={loading}>
					{loading ? t.evaluating : t.evaluate}
				</button>
			</div>
		</form>

		<!-- Results -->
		{#if form?.success && form?.evaluation}
			<div class="space-y-6">
				<!-- Place Info -->
				<div class="card bg-base-200">
					<div class="card-body">
						<h2 class="card-title">{form.place.name}</h2>
						<p class="text-sm opacity-70">{form.place.address}</p>
						{#if form.place.url}
							<a
								href={form.place.url}
								target="_blank"
								rel="noopener noreferrer"
								class="link link-primary text-sm"
							>
								Ver en Google Maps
							</a>
						{/if}
					</div>
				</div>

				<!-- Score -->
				<div class="card bg-primary text-primary-content">
					<div class="card-body items-center text-center">
						<h3 class="text-lg font-semibold">{t.score}</h3>
						<div class="text-5xl font-bold">{form.evaluation.score}%</div>
					</div>
				</div>

				<!-- Evaluation Results -->
				<div class="card bg-base-200">
					<div class="card-body">
						<h3 class="card-title">{t.results}</h3>
						<div class="space-y-4">
							{#each form.evaluation.rules as { rule, result }}
								{@const StatusIcon = getStatusIcon(result.status)}
								<div class="border-l-4 pl-4 py-2 {getStatusClass(result.status)}">
									<div class="flex items-start gap-3">
										<!-- En modo runes un componente en una variable se usa directamente:
										     <svelte:component> está obsoleto. -->
										<StatusIcon size={20} class="flex-shrink-0 mt-0.5" />
										<div class="flex-1">
											<h4 class="font-semibold">{rule.name}</h4>
											<p class="text-sm opacity-90">{result.message}</p>
											{#if result.recommendation}
												<div class="mt-2 text-sm opacity-80">
													<strong>{t.recommendation}:</strong>
													{result.recommendation}
												</div>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
