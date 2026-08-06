<script lang="ts">
	import { page } from '$app/state';
	import { slugForPath } from '$lib/og-cards';

	/**
	 * A page's metadata: title, description and the card seen when the link is
	 * shared.
	 *
	 * It lives here rather than repeated on every page because it is a dozen
	 * tags and forgetting one is easy. Each page passes its title and
	 * description; the image is deduced from the route, so it needs no passing
	 * or maintaining:
	 *   `/`                  -> `/og/home.png`
	 *   `/tool/newsletter`   -> `/og/newsletter.png`
	 * The texts of each card come from `$lib/og-cards.ts`.
	 *
	 * og:image URLs must be absolute: social scrapers do not resolve relative
	 * paths. They are built from the request's origin. The width/height tags
	 * matter too: scrapers use them to pick the large-preview layout before
	 * downloading the image.
	 */
	let {
		title,
		description,
		/** For a tool that wants its own image instead of the generated card. */
		image,
		/** The image's pixel size. Every og image on the site is 1200×630. */
		imageWidth = 1200,
		imageHeight = 630
	}: {
		title: string;
		description: string;
		image?: string;
		imageWidth?: number;
		imageHeight?: number;
	} = $props();

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
	<meta property="og:image:width" content={String(imageWidth)} />
	<meta property="og:image:height" content={String(imageHeight)} />
	<meta property="og:image:alt" content={title} />
	<meta property="og:url" content={canonical} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>
