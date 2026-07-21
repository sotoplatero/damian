<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { CheckCircle, XCircle, AlertCircle } from 'lucide-svelte';
	import { enhance, deserialize } from '$app/forms';

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
					const data = result.data;
					console.log('[CLIENT] Data:', data);

					const newSuggestions = data.suggestions || [];
					console.log('[CLIENT] newSuggestions:', newSuggestions);

					suggestions = newSuggestions;
					showSuggestions = Array.isArray(newSuggestions) && newSuggestions.length > 0;

					console.log('[CLIENT] showSuggestions:', showSuggestions);
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

<div class="min-h-screen flex items-center justify-center p-4">
	<div class="w-full max-w-3xl space-y-6">
		<!-- Back link -->
		<a href="/" class="btn btn-ghost btn-sm">← {m.name()}</a>

		<!-- Header -->
		<div class="text-center space-y-2">
			<h1 class="text-3xl font-bold">{m.places_evaluator_title()}</h1>
			<p class="text-sm opacity-80">{m.places_evaluator_description()}</p>
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
						placeholder="Business name, Place ID, or Google Maps URL"
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
					<label class="label">
						<span class="label-text-alt opacity-70">
							e.g., "Starbucks Madrid" or paste Google Maps URL or Place ID
						</span>
					</label>
				</div>

				{#if form?.error}
					<div class="alert alert-error">
						<span>{form.error}</span>
					</div>
				{/if}

				<button type="submit" class="btn btn-primary" disabled={loading}>
					{loading ? m.evaluating() : m.evaluate()}
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
								View on Google Maps
							</a>
						{/if}
					</div>
				</div>

				<!-- Score -->
				<div class="card bg-primary text-primary-content">
					<div class="card-body items-center text-center">
						<h3 class="text-lg font-semibold">{m.score()}</h3>
						<div class="text-5xl font-bold">{form.evaluation.score}%</div>
					</div>
				</div>

				<!-- Evaluation Results -->
				<div class="card bg-base-200">
					<div class="card-body">
						<h3 class="card-title">{m.evaluation_results()}</h3>
						<div class="space-y-4">
							{#each form.evaluation.rules as { rule, result }}
								<div class="border-l-4 pl-4 py-2 {getStatusClass(result.status)}">
									<div class="flex items-start gap-3">
										<svelte:component
											this={getStatusIcon(result.status)}
											size={20}
											class="flex-shrink-0 mt-0.5"
										/>
										<div class="flex-1">
											<h4 class="font-semibold">{rule.name}</h4>
											<p class="text-sm opacity-90">{result.message}</p>
											{#if result.recommendation}
												<div class="mt-2 text-sm opacity-80">
													<strong>{m.recommendation()}:</strong>
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
