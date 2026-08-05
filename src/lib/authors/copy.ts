/**
 * The strings of /author and /author/[author], shared by both pages. They used
 * to live in src/lib/content/author.md; strings in one module turned out
 * simpler than frontmatter parsing.
 *
 * THIS CARD REACHES SOMEONE WHO DID NOT ASK FOR IT. It flatters or it locates,
 * it never corrects. If a line reads as an audit, it is badly written: for
 * auditing there is /tool/newsletter.
 *
 * That is why there is NO key here for the longest gap without publishing. It
 * was dropped on purpose: it is the one figure that reads as a reproach, and
 * the one imported archives corrupt most (measured: 182 weeks of false
 * silence on one publication and 56 on another, both invented by imported
 * dates).
 *
 * Subscribers only show if the publication displays them on its homepage. If
 * it doesn't, nothing is said: no number, no vague label, no empty slot.
 */
export const copy = {
	title: 'El Wrapped de tu Substack',
	description:
		'Pega la dirección de un newsletter de Substack y sal con la tarjeta de su historia.',
	urlPlaceholder: 'tunewsletter.substack.com',
	urlButton: 'Ver la tarjeta',
	reading: 'Leyendo su archivo',
	download: 'Descargar la tarjeta',
	restart: 'Probar con otra',

	/*
	 * Figure labels. Short on purpose: they sit next to an icon and a big
	 * number, not next to a sentence. The icon gives the context, not the text.
	 */
	labelPosts: 'posts',
	labelStreak: 'semanas de racha',
	labelStreakLive: 'semanas, y sigue activa',
	labelWords: 'palabras',
	labelNovels: '≈ {n} novelas',
	labelLikes: 'likes',
	labelConversation: 'comentarios',
	labelRestacks: 'restacks',
	labelFrequency: 'posts al mes',
	labelBestPost: 'Su post más exitoso',
	labelRecent: 'Lo último que ha publicado',
	labelViewOnSubstack: 'Ver en Substack',
	labelMostLiked: 'Más gustado',
	labelMostCommented: 'Más comentado',
	labelLongest: 'Más largo',
	labelBestMonth: 'Su mejor mes',
	labelWordsTop: 'Sus palabras',
	labelYears: 'Por año',
	labelHeatmap: 'Constancia',
	labelDay: 'Su día',
	labelSplit: 'Gratis / pago',
	labelSubscribers: 'suscriptores',
	labelHeadlineLength: 'Titulares de {n} caracteres de media.',
	labelSince: 'desde',
	labelInProgress: 'en curso',
	labelFree: 'gratis',
	labelPaid: 'pago',

	/* Headline tics. */
	signatureQuestion: '{n} de cada 10 de sus titulares son una pregunta.',
	signatureNumber: '{n} de cada 10 de sus titulares llevan un número.',
	signatureColon: '{n} de cada 10 de sus titulares llevan dos puntos.',

	/* Honest notices. Shown when due, never hidden in a footnote: they are part
	   of the data. */
	noteUtc: 'Las horas y los días se calculan en UTC.',
	noteImported:
		'Tiene {n} posts más de un archivo importado, con fechas que no se pueden usar para medir tiempo.',
	noteTruncated:
		'Su archivo es más largo de lo que se ha podido leer de una vez. Esto sale de los primeros {n} posts.',
	noteFeed:
		'Substack no ha dejado leer su archivo completo. Esto sale de sus últimos {n} posts, y por eso faltan los likes, los comentarios y el reparto entre gratis y pago.',

	/* Signature. */
	signature: 'Hecho por Damian Soto',

	/* Errors. */
	errorNotSubstack: 'Esto no parece un Substack. ¿Es la dirección correcta?',
	errorNotFound: 'No hay ninguna publicación en esa dirección.',
	errorBlocked: 'Substack no ha dejado leer esta publicación ahora mismo. Prueba en un rato.',
	errorRateLimit: 'Has mirado muchas por hoy. Vuelve en un rato.',
	errorTooNew: 'Esta publicación acaba de empezar. Con {n} posts todavía no hay historia que contar.'
};
