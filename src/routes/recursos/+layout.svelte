<script lang="ts">
	/**
	 * A resource page takes the same shell as a tool: it is the same site, the
	 * same column and the same vertical centring.
	 *
	 * It needs its own layout file because `/recursos/` sits outside `/tool/` —
	 * what these pages hand over is a file, not a result. `/postcard` learned this
	 * the hard way: outside `src/routes/tool/+layout.svelte`, the classes were
	 * right and the shell was missing, so its front door read as a different site.
	 */
	import ToolShell from '$lib/components/ToolShell.svelte';

	let { children } = $props();
</script>

<ToolShell>{@render children?.()}</ToolShell>
