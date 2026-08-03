<script lang="ts">
	import type { HeatmapRow } from '$lib/authors/metrics';

	/**
	 * One row per year, one cell per ISO week.
	 *
	 * This is the Wrapped's visual: it turns a 276-week streak into something you
	 * see at a glance without reading a number. The classes live in `app.css`
	 * (`.heat`, `.heat-cell`, `.heat-on`).
	 */
	let { rows }: { rows: HeatmapRow[] } = $props();
</script>

<div class="flex flex-col gap-2">
	{#each rows as row (row.year)}
		<div class="flex items-center gap-3">
			<span class="figure-note w-10 shrink-0 tabular-nums">{row.year}</span>
			<div class="heat grow">
				{#each row.weeks as active, week (week)}
					<div class="heat-cell {active ? 'heat-on' : ''}"></div>
				{/each}
			</div>
		</div>
	{/each}
</div>
