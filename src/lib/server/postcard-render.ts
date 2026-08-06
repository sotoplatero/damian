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
 * What every postcard PNG route needs to render: the design's fonts and the
 * image fetcher. Shared by the four variants and the landscape og — the fonts
 * are heavy and must not be declared twice.
 */

function buffer(dataUri: string): ArrayBuffer {
	const base64 = dataUri.slice(dataUri.indexOf(',') + 1);
	const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
	return bytes.buffer;
}

export const POSTCARD_FONTS = [
	{ name: 'Space Grotesk', data: buffer(spaceGrotesk400), weight: 400 as const, style: 'normal' as const },
	{ name: 'Space Grotesk', data: buffer(spaceGrotesk500), weight: 500 as const, style: 'normal' as const },
	{ name: 'Space Grotesk', data: buffer(spaceGrotesk700), weight: 700 as const, style: 'normal' as const },
	{ name: 'Instrument Serif', data: buffer(instrumentSerif400), weight: 400 as const, style: 'normal' as const },
	{ name: 'Instrument Serif', data: buffer(instrumentSerifItalic), weight: 400 as const, style: 'italic' as const },
	{ name: 'JetBrains Mono', data: buffer(jetbrainsMono400), weight: 400 as const, style: 'normal' as const },
	{ name: 'JetBrains Mono', data: buffer(jetbrainsMono500), weight: 500 as const, style: 'normal' as const }
];

/**
 * A remote image fetched and embedded as a data URI: satori cannot be trusted
 * to fetch itself, and a postcard must never come out broken because a CDN was
 * slow. On any failure the trees draw their fallback (initials, diamond).
 */
export async function imageDataUri(url: string | null): Promise<string | null> {
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
