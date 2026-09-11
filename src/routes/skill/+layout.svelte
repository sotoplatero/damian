<script lang="ts">
	/**
	 * `/skill` sits outside `/tool/` and outside `/recursos/`, so it inherits
	 * neither of their layouts and needs its own.
	 *
	 * It is not a tool —nothing is pasted in and nothing comes back— and it is not
	 * quite a resource either: a resource asks for an address, and this one hands
	 * the file over without asking. It is the same site and the same column, so it
	 * takes the same shell; only its list on the home page is still to be decided.
	 */
	import ToolShell from '$lib/components/ToolShell.svelte';

	let { children } = $props();
</script>

<ToolShell>{@render children?.()}</ToolShell>
