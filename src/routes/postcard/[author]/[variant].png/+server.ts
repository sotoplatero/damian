import { ImageResponse } from '@vercel/og';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidSlug } from '$lib/authors/slug';
import { buildCard, isFailure } from '$lib/server/author-card';
import {
	postcardTree,
	postcardData,
	POSTCARD_SIZE,
	POSTCARD_VARIANTS,
	type PostcardVariant
} from '$lib/authors/postcard';
// Vite hands each file back as a data URI and the buffer comes out of that. They
// are imported this way, rather than read from disk, so the bundler packs them
// with the function. Satori reads TTF, not the woff2 the web uses.
import spaceGrotesk400 from '$lib/server/fonts/space-grotesk-400.ttf?inline';
import spaceGrotesk500 from '$lib/server/fonts/space-grotesk-500.ttf?inline';
import spaceGrotesk700 from '$lib/server/fonts/space-grotesk-700.ttf?inline';
import instrumentSerif400 from '$lib/server/fonts/instrument-serif-400.ttf?inline';
import instrumentSerifItalic from '$lib/server/fonts/instrument-serif-400-italic.ttf?inline';
import jetbrainsMono400 from '$lib/server/fonts/jetbrains-mono-400.ttf?inline';
import jetbrainsMono500 from '$lib/server/fonts/jetbrains-mono-500.ttf?inline';

/**
 * One postcard as a PNG: `/postcard/<slug>/<variant>.png`. The slider shows
 * these exact files, so what the visitor sees is what they download. All four
 * variants (and the page) share `buildCard`'s cache — one archive walk serves
 * everything.
 */

function buffer(dataUri: string): ArrayBuffer {
	const base64 = dataUri.slice(dataUri.indexOf(',') + 1);
	const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
	return bytes.buffer;
}

const FONTS = [
	{ name: 'Space Grotesk', data: buffer(spaceGrotesk400), weight: 400 as const, style: 'normal' as const },
	{ name: 'Space Grotesk', data: buffer(spaceGrotesk500), weight: 500 as const, style: 'normal' as const },
	{ name: 'Space Grotesk', data: buffer(spaceGrotesk700), weight: 700 as const, style: 'normal' as const },
	{ name: 'Instrument Serif', data: buffer(instrumentSerif400), weight: 400 as const, style: 'normal' as const },
	{ name: 'Instrument Serif', data: buffer(instrumentSerifItalic), weight: 400 as const, style: 'italic' as const },
	{ name: 'JetBrains Mono', data: buffer(jetbrainsMono400), weight: 400 as const, style: 'normal' as const },
	{ name: 'JetBrains Mono', data: buffer(jetbrainsMono500), weight: 500 as const, style: 'normal' as const }
];

/**
 * The author's photo, fetched here and embedded as a data URI: satori cannot
 * be trusted to fetch remote images itself, and a postcard must never come out
 * broken because a CDN was slow. On any failure the tree draws the initials.
 */
async function avatarDataUri(url: string | null): Promise<string | null> {
	if (!url) return null;
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
		if (!response.ok) return null;
		const type = response.headers.get('content-type') ?? '';
		if (!type.startsWith('image/')) return null;
		const bytes = await response.arrayBuffer();
		if (bytes.byteLength > 2_000_000) return null;
		return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
	} catch {
		return null;
	}
}

export const GET: RequestHandler = async ({ params, url }) => {
	const slug = params.author.toLowerCase();
	if (!isValidSlug(slug)) error(404, 'No hay postal para esa dirección');
	const variant = params.variant as PostcardVariant;
	if (!POSTCARD_VARIANTS.includes(variant)) error(404, 'Esa postal no existe');

	const result = await buildCard(slug);
	if (isFailure(result)) {
		error(404, result.error === 'too_new' ? 'Todavía no hay historia que contar' : 'No hay postal para esa dirección');
	}

	const { metrics } = result.card;
	const [avatar, logo] = await Promise.all([
		avatarDataUri(metrics.pub.authorPhotoUrl),
		avatarDataUri(metrics.pub.logoUrl)
	]);

	return new ImageResponse(
		postcardTree(variant, postcardData(metrics, result.card.followers), {
			avatar,
			logo,
			toolUrl: `${url.host}/postcard/${slug}`
		}),
		{
			width: POSTCARD_SIZE,
			height: POSTCARD_SIZE,
			fonts: FONTS,
			headers: {
				// Someone's archive changes at most daily.
				'cache-control': 'public, max-age=3600, s-maxage=86400'
			}
		}
	);
};
