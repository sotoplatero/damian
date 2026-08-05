<script lang="ts">
	/**
	 * The email gate, and its "sent" confirmation. Every tool shows the same
	 * wall: the free pieces above it, the locked silhouettes behind it, and this
	 * box in between saying where the rest goes.
	 */
	import InlineForm from './InlineForm.svelte';

	let {
		sent = false,
		email = $bindable(''),
		busy = false,
		gateTitle,
		gateBody,
		sentTitle,
		sentBody,
		placeholder,
		label,
		busyLabel,
		onsubmit
	}: {
		sent?: boolean;
		email?: string;
		busy?: boolean;
		gateTitle: string;
		gateBody: string;
		sentTitle: string;
		sentBody: string;
		placeholder: string;
		label: string;
		busyLabel: string;
		onsubmit: () => void;
	} = $props();
</script>

<section class="box bg-line/40">
	{#if sent}
		<h3 class="section-title">{sentTitle}</h3>
		<p class="section-intro">{sentBody}</p>
	{:else}
		<h3 class="section-title">{gateTitle}</h3>
		<p class="section-intro">{gateBody}</p>
		<div class="mt-4">
			<InlineForm
				type="email"
				bind:value={email}
				{placeholder}
				{label}
				{busyLabel}
				{busy}
				inputmode="email"
				autocomplete="email"
				{onsubmit}
			/>
		</div>
	{/if}
</section>
