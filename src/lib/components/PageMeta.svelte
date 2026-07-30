<script lang="ts">
	import { page } from '$app/state';
	import { slugForPath } from '$lib/og-cards';

	/**
	 * Los metadatos de una página: título, descripción y la tarjeta que se ve al
	 * compartir el enlace.
	 *
	 * Está aquí y no repetido en cada página porque son once etiquetas y es muy
	 * fácil olvidarse de una. Cada página pasa su título y su descripción; la
	 * imagen la deduce de la ruta, así que no hay que pasarla ni mantenerla:
	 *   `/`                  -> `/og/home.png`
	 *   `/tool/newsletter`   -> `/og/newsletter.png`
	 * Los textos de cada tarjeta salen de `$lib/og-cards.ts`.
	 *
	 * Las URLs de og:image tienen que ser absolutas: los rastreadores de las redes
	 * no resuelven rutas relativas. Se construyen con el origen de la petición.
	 */
	let {
		title,
		description,
		/** Por si alguna herramienta quiere su propia imagen en vez de la generada. */
		image
	}: { title: string; description: string; image?: string } = $props();

	const origin = $derived(page.url.origin);
	const slug = $derived(slugForPath(page.url.pathname));
	const ogImage = $derived(new URL(image ?? `/og/${slug}.png`, origin).toString());
	const canonical = $derived(new URL(page.url.pathname, origin).toString());
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />

	<meta property="og:type" content="website" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:url" content={canonical} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>
