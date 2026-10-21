<script lang="ts">
	/**
	 * Every tool shares the `ToolShell` shell, as do the pages that live outside
	 * `/tool/` (`/recursos`, `/skill`).
	 *
	 * The global header already links home, so that link isn't repeated here.
	 */
	import ToolShell from '$lib/components/ToolShell.svelte';

	let { children } = $props();
</script>

<ToolShell>{@render children?.()}</ToolShell>
