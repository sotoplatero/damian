<script lang="ts">
	/**
	 * La cáscara común de todas las herramientas: el enlace de vuelta arriba y el
	 * contenido centrado en la pantalla mientras quepa.
	 *
	 * El centrado usa `my-auto` en el hijo y no `justify-center` en el padre, y la
	 * diferencia es la que hace que esto funcione sin trucos: los márgenes
	 * automáticos se reparten el hueco libre cuando el contenido es corto (la
	 * pantalla inicial de una herramienta) y valen cero cuando es largo (con
	 * resultados). Así el layout no necesita saber en qué estado está la página,
	 * que es algo que no puede saber.
	 *
	 * El alto es min-h-fold, que sale del tema: la pantalla menos el aire del
	 * layout raíz, para que la suma sea 100dvh justos y no aparezca scroll en la
	 * pantalla inicial. Antes ese calc estaba escrito a mano aquí y en app.css.
	 */
	let { children } = $props();
</script>

<div class="flex min-h-fold flex-col">
	<a href="/" class="link-quiet">&larr; Damian Soto</a>
	<div class="my-auto w-full">
		{@render children?.()}
	</div>
</div>
