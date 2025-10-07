<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	let uuid = $state('');
	let copied = $state(false);

	function generateUUID() {
		uuid = crypto.randomUUID();
		copied = false;
	}

	async function copyToClipboard() {
		if (!uuid) return;
		await navigator.clipboard.writeText(uuid);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}

	// Generate on mount
	$effect(() => {
		generateUUID();
	});
</script>

<div class="min-h-screen flex items-center justify-center p-4">
	<div class="w-full max-w-md space-y-6">
		<!-- Back link -->
		<a href="/" class="btn btn-ghost btn-sm">← {m.name()}</a>

		<!-- Header -->
		<div class="text-center space-y-2">
			<h1 class="text-3xl font-bold">{m.uuid_generator_title()}</h1>
			<p class="text-sm opacity-80">{m.uuid_generator_description()}</p>
		</div>

		<!-- UUID Display -->
		<div class="card bg-base-200">
			<div class="card-body">
				<div class="font-mono text-sm break-all text-center py-4">
					{uuid || '...'}
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex gap-2">
			<button onclick={generateUUID} class="btn btn-primary flex-1">
				{m.generate()}
			</button>
			<button
				onclick={copyToClipboard}
				class="btn btn-outline flex-1"
				disabled={!uuid}
			>
				{copied ? m.copied() : m.copy()}
			</button>
		</div>
	</div>
</div>
