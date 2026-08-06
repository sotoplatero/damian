<script lang="ts">
	/**
	 * `/postcard` is a tool and has to look like one, so it takes the same shell as
	 * everything under `/tool/`.
	 *
	 * It needs its own layout file because the route deliberately sits OUTSIDE
	 * `/tool/`: the segment after it is a publication, not a tool name. That put it
	 * outside `src/routes/tool/+layout.svelte` too, which is why its front door read
	 * as a different site — the classes were right, the shell was missing.
	 *
	 * This covers `/postcard/[author]` as well, and it should: the slider is short
	 * enough to centre on a tall screen, and `.tool-stage` imposes no width of its
	 * own, so the rail still runs the full width of `.site-column`.
	 */
	import ToolShell from '$lib/components/ToolShell.svelte';

	let { children } = $props();
</script>

<ToolShell>{@render children?.()}</ToolShell>
