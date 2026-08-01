<script lang="ts">
	/**
	 * La cáscara común de todas las herramientas centra el contenido en el espacio
	 * que queda debajo de la cabecera mientras quepa.
	 *
	 * El centrado usa `my-auto` en el hijo y no `justify-center` en el padre, y la
	 * diferencia es la que hace que esto funcione sin trucos: los márgenes
	 * automáticos se reparten el hueco libre cuando el contenido es corto (la
	 * pantalla inicial de una herramienta) y valen cero cuando es largo (con
	 * resultados). Así el layout no necesita saber en qué estado está la página,
	 * que es algo que no puede saber.
	 *
	 * La cabecera global ya enlaza al inicio, así que aquí no se repite ese enlace.
	 */
	let { children } = $props();
</script>

<div class="tool-shell">
	<div class="tool-stage">
		{@render children?.()}
	</div>
</div>
