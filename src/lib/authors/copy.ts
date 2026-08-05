/**
 * The strings of /author and /author/[author], shared by both pages.
 *
 * THIS CARD REACHES SOMEONE WHO DID NOT ASK FOR IT. It flatters or it locates,
 * it never corrects. If a line reads as an audit, it is badly written: for
 * auditing there is /tool/newsletter.
 *
 * The page is deliberately the FRAME of the downloadable image, not a report:
 * what the visitor sees is card.png itself, so page and download can never
 * disagree. That is why there are no stat labels left in here — every figure
 * lives inside the image (chosen in $lib/authors/card.ts). The only figure
 * dropped on purpose is the longest gap without publishing: it is the one that
 * reads as a reproach, and the one imported archives corrupt most (measured:
 * 182 weeks of false silence on one publication, invented by imported dates).
 */
export const copy = {
	title: 'El Wrapped de tu Substack',
	description:
		'Pega la dirección de un newsletter de Substack y sal con la tarjeta de su historia.',
	urlPlaceholder: 'tunewsletter.substack.com',
	urlButton: 'Ver la tarjeta',
	restart: 'Probar con otra',

	/* The poster and its actions. */
	cardAlt: 'La tarjeta de {name}: su historia en Substack, en números',
	download: 'Descargar la tarjeta',
	copyLink: 'Copiar enlace',
	copiedLink: 'Copiado',
	labelViewOnSubstack: 'Ver en Substack',

	/* The contagion loop: whoever receives the gift makes the next one. */
	makeYoursTitle: '¿Tú también escribes en Substack?',
	makeYoursBody: 'Pega tu dirección y llévate la tuya. Gratis, y sin dejar tu correo.',

	/* Honest notices. Shown when due, never hidden: they are part of the data. */
	noteUtc: 'Las horas y los días de la tarjeta se calculan en UTC.',
	noteImported:
		'Tiene {n} posts más de un archivo importado, con fechas que no se pueden usar para medir tiempo.',
	noteTruncated:
		'Su archivo es más largo de lo que se ha podido leer de una vez. La tarjeta sale de los primeros {n} posts.',
	noteFeed:
		'Substack no ha dejado leer su archivo completo. La tarjeta sale de sus últimos {n} posts, y por eso faltan los likes y los comentarios.',

	/* Signature. */
	signature: 'Hecho por Damian Soto',

	/* Errors. */
	errorNotSubstack: 'Esto no parece un Substack. ¿Es la dirección correcta?',
	errorNotFound: 'No hay ninguna publicación en esa dirección.',
	errorBlocked: 'Substack no ha dejado leer esta publicación ahora mismo. Prueba en un rato.',
	errorRateLimit: 'Has mirado muchas por hoy. Vuelve en un rato.',
	errorTooNew: 'Esta publicación acaba de empezar. Con {n} posts todavía no hay historia que contar.'
};
