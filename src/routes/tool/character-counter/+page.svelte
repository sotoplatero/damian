<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	let text = $state('');

	let stats = $derived({
		characters: text.length,
		words: text.trim() === '' ? 0 : text.trim().split(/\s+/).length,
		lines: text === '' ? 0 : text.split('\n').length
	});
</script>

<div class="min-h-screen flex items-center justify-center p-4">
	<div class="w-full max-w-2xl space-y-6">
		<!-- Back link -->
		<a href="/" class="btn btn-ghost btn-sm">← {m.name()}</a>

		<!-- Header -->
		<div class="text-center space-y-2">
			<h1 class="text-3xl font-bold">{m.character_counter_title()}</h1>
			<p class="text-sm opacity-80">{m.character_counter_description()}</p>
		</div>

		<!-- Stats -->
		<div class="grid grid-cols-3 gap-4">
			<div class="card bg-base-200">
				<div class="card-body items-center text-center p-4">
					<div class="text-3xl font-bold">{stats.characters}</div>
					<div class="text-xs opacity-70">{m.characters()}</div>
				</div>
			</div>
			<div class="card bg-base-200">
				<div class="card-body items-center text-center p-4">
					<div class="text-3xl font-bold">{stats.words}</div>
					<div class="text-xs opacity-70">{m.words()}</div>
				</div>
			</div>
			<div class="card bg-base-200">
				<div class="card-body items-center text-center p-4">
					<div class="text-3xl font-bold">{stats.lines}</div>
					<div class="text-xs opacity-70">{m.lines()}</div>
				</div>
			</div>
		</div>

		<!-- Text Input -->
		<div class="card bg-base-200">
			<div class="card-body p-4">
				<textarea
					bind:value={text}
					placeholder={m.paste_text()}
					class="textarea textarea-ghost w-full min-h-64 font-mono text-sm"
				></textarea>
			</div>
		</div>
	</div>
</div>
