import { ImageResponse } from '@vercel/og';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cardFor } from '$lib/og-cards';
// Vite devuelve el fichero como data URI y de ahí se saca el búfer. Se importa
// así, y no leyendo del disco, para que el bundler lo empaquete con la función.
import inter400 from '$lib/server/fonts/inter-400.woff?inline';
import inter700 from '$lib/server/fonts/inter-700.woff?inline';

/**
 * La imagen que se ve al compartir un enlace, generada al vuelo.
 *
 * `/og/newsletter.png` saca la tarjeta de la herramienta cuyo `href` acabe en
 * `/newsletter`, y `/og/home.png` la de la portada. Los textos salen de
 * `$lib/og-cards.ts`, así que una herramienta nueva tiene tarjeta en cuanto se
 * añade a `src/lib/tools/list.ts`.
 *
 * Va rasterizada a PNG y no servida como SVG a propósito: Facebook, X, LinkedIn
 * y WhatsApp ignoran los SVG en `og:image` y no enseñan nada. Por eso está aquí
 * @vercel/og, que trae el rasterizador y una fuente dentro.
 *
 * Los colores son los del tema (ver `src/app.css`). Si cambias la paleta allí,
 * cámbiala aquí: este código no puede leer el CSS.
 */

/**
 * La fuente que trae @vercel/og de serie tiene mal las métricas del espacio y
 * deja huecos irregulares entre palabras. Con una fuente propia desaparece, y
 * de paso la tarjeta no depende de lo que decida el rasterizador.
 */
function buffer(dataUri: string): ArrayBuffer {
	const base64 = dataUri.slice(dataUri.indexOf(',') + 1);
	const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
	return bytes.buffer;
}

const FONTS = [
	{ name: 'Inter', data: buffer(inter400), weight: 400 as const, style: 'normal' as const },
	{ name: 'Inter', data: buffer(inter700), weight: 700 as const, style: 'normal' as const }
];

const INK = '#171717';
const SOFT = '#525252';
const MUTED = '#737373';
const BRAND = '#0076ff';

/** 1200x630 es lo que esperan todas las plataformas. */
const WIDTH = 1200;
const HEIGHT = 630;

export const GET: RequestHandler = async ({ params, url }) => {
	const card = cardFor(params.slug);
	if (!card?.title) error(404, 'No hay tarjeta para esa ruta');

	return new ImageResponse(
		{
			type: 'div',
			props: {
				style: {
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					backgroundColor: '#ffffff',
					padding: '72px 80px',
					fontFamily: 'Inter'
				},
				children: [
					{
						type: 'div',
						props: {
							style: { display: 'flex', flexDirection: 'column' },
							children: [
								{
									type: 'div',
									props: {
										style: {
											fontSize: 68,
											fontWeight: 700,
											color: INK,
											lineHeight: 1.1,
											letterSpacing: '-0.02em'
										},
										children: card.title
									}
								},
								{
									type: 'div',
									props: {
										style: {
											marginTop: 28,
											fontSize: 32,
											color: SOFT,
											lineHeight: 1.4,
											// La tarjeta no puede crecer, así que el texto se corta.
											display: 'block',
											lineClamp: 3
										},
										children: card.subtitle
									}
								}
							]
						}
					},
					{
						type: 'div',
						props: {
							style: { display: 'flex', alignItems: 'center', gap: 20 },
							children: [
								{
									type: 'img',
									props: {
										src: new URL('/favicon.png', url.origin).toString(),
										width: 64,
										height: 64,
										style: { borderRadius: 999 }
									}
								},
								{
									type: 'div',
									props: {
										style: { fontSize: 28, color: MUTED },
										children: `${url.host} · ${card.tag}`
									}
								},
								// Un punto del color de marca, para que la tarjeta no sea solo gris.
								{
									type: 'div',
									props: {
										style: {
											marginLeft: 'auto',
											width: 20,
											height: 20,
											borderRadius: 999,
											backgroundColor: BRAND
										}
									}
								}
							]
						}
					}
				]
			}
		},
		{
			width: WIDTH,
			height: HEIGHT,
			fonts: FONTS,
			headers: {
				// La imagen solo cambia si cambia list.ts, así que se puede cachear fuerte.
				'cache-control': 'public, max-age=3600, s-maxage=86400, immutable'
			}
		}
	);
};
