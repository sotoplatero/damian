<script lang="ts">
	/**
	 * Bars on top of `.meter`, which already exists in `app.css` and knows nothing
	 * about what it measures: the fill is a child with its own width. It serves
	 * both the headline words and the posts per year.
	 */
	let { items }: { items: { label: string; value: number; note?: string }[] } = $props();

	const max = $derived(Math.max(1, ...items.map((i) => i.value)));
</script>

<ul class="flex flex-col gap-3">
	{#each items as item (item.label)}
		<li class="flex items-center gap-3">
			<span class="body-text w-28 shrink-0 truncate">{item.label}</span>
			<span class="meter grow">
				<span style="width: {(item.value / max) * 100}%"></span>
			</span>
			<span class="figure-note w-24 shrink-0 text-right tabular-nums">
				{item.value.toLocaleString('es-ES')}{item.note ? ` ${item.note}` : ''}
			</span>
		</li>
	{/each}
</ul>
