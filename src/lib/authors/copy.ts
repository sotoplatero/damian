/**
 * The strings of /postcard and /postcard/[author], shared by both pages.
 *
 * THE POSTCARD REACHES SOMEONE WHO DID NOT ASK FOR IT. It flatters or it
 * locates, it never corrects. If a line reads as an audit, it is badly
 * written: for auditing there is /tool/newsletter.
 *
 * The page is deliberately the FRAME of the downloadable images, not a
 * report: what the visitor sees are the PNGs themselves in a slider, so page
 * and download can never disagree. Every figure lives inside the postcards
 * (chosen in $lib/authors/postcard.ts). The only figure dropped on purpose is
 * the longest gap without publishing: it is the one that reads as a reproach,
 * and the one imported archives corrupt most (measured: 182 weeks of false
 * silence on one publication, invented by imported dates).
 */
export const copy = {
	title: 'La postal de tu Substack',
	description:
		'Pega la dirección de un newsletter de Substack y llévate cuatro postales con su historia, listas para compartir.',
	urlPlaceholder: 'tunewsletter.substack.com',
	urlButton: 'Ver las postales',
	restart: 'Probar con otra',

	/* The slider and its actions. */
	cardAlt: 'La postal de {name}: su historia en Substack, en números',
	openImage: 'Abrir la postal a tamaño completo',
	download: 'Descargar',
	copyImage: 'Copiar imagen',
	copiedImage: 'Copiada',
	copyImageFailed: 'No se pudo copiar',
	copyLink: 'Copiar enlace',
	copiedLink: 'Copiado',
	previous: 'Postal anterior',
	next: 'Postal siguiente',
	goTo: 'Ir a la postal {n}',

	/* The contagion loop: whoever receives the gift makes the next one. */
	makeYoursTitle: '¿Tú también escribes en Substack?',
	makeYoursBody: 'Pega tu dirección y llévate las tuyas. Gratis, y sin dejar tu correo.',

	/* Honest notices. Shown when due, never hidden: they are part of the data. */
	noteImported:
		'Tiene {n} posts más de un archivo importado, con fechas que no se pueden usar para medir tiempo.',
	noteTruncated:
		'Su archivo es más largo de lo que se ha podido leer de una vez. Las postales salen de los primeros {n} posts.',
	noteFeed:
		'Substack no ha dejado leer su archivo completo. Las postales salen de sus últimos {n} posts, y por eso faltan los likes y los comentarios.',

	/* Signature. */
	signature: 'Hecho por Damian Soto',

	/* Errors. */
	errorNotSubstack: 'Esto no parece un Substack. ¿Es la dirección correcta?',
	errorNotFound: 'No hay ninguna publicación en esa dirección.',
	errorBlocked: 'Substack no ha dejado leer esta publicación ahora mismo. Prueba en un rato.',
	errorRateLimit: 'Has mirado muchas por hoy. Vuelve en un rato.',
	errorTooNew: 'Esta publicación acaba de empezar. Con {n} posts todavía no hay historia que contar.'
};
