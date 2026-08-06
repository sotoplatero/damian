<script lang="ts">
	/**
	 * Todas las herramientas comparten la cáscara de `ToolShell`, que también usa
	 * `/postcard` — vive fuera de `/tool/` y antes se quedaba sin ella.
	 *
	 * La cabecera global ya enlaza al inicio, así que aquí no se repite ese enlace.
	 */
	import ToolShell from '$lib/components/ToolShell.svelte';

	let { children } = $props();
</script>

<ToolShell>{@render children?.()}</ToolShell>
