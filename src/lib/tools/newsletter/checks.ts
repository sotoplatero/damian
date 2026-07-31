import type { NewsletterSnapshot, NewsletterPost } from '$lib/server/newsletter';
import { ABANDONED_DAYS } from './rules';

/**
 * Lo que se puede medir sin opinar. Nada más.
 *
 * Todo lo contable va aquí y no en el prompt: un título tiene 77 caracteres o no
 * los tiene, y eso no se le pregunta a un modelo que puede equivocarse contando.
 * El modelo recibe estos hechos ya medidos y se dedica a leer.
 *
 * Las reglas —qué se considera un hallazgo y con qué gravedad— viven en
 * `rules.ts`, junto con el bloque de calibración y el recuento (`tally`).
 *
 * **Aquí ya no hay nota.** `score()`, `PENALTY` y su calibración se borraron; el
 * motivo está escrito en el comentario de `tally` en `rules.ts` y en resumen es
 * que cualquier agregado sobre los hallazgos empeora cuando el descubrimiento
 * mejora.
 */

function median(values: number[]): number {
	if (!values.length) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function engagement(p: NewsletterPost): number {
	return p.reactions + p.comments;
}

export function gaps(posts: NewsletterPost[]): number[] {
	const dates = posts
		.map((p) => Date.parse(p.date))
		.filter((n) => Number.isFinite(n))
		.sort((a, b) => a - b);
	return dates.slice(1).map((d, i) => Math.round((d - dates[i]) / 86_400_000));
}

export type Measurements = {
	posts: number;
	freePosts: number;
	paidPosts: number;
	cadenceMedianDays: number;
	cadenceMinDays: number;
	cadenceMaxDays: number;
	daysSinceLast: number;
	wordsMin: number;
	wordsMedian: number;
	wordsMax: number;
	titlesOverLimit: number;
	longestTitle: number;
	seoTitlesFilled: number;
	seoDescriptionsFilled: number;
	postsWithCover: number;
	postsWithSubtitle: number;
	slugsTooLong: number;
	reactions: number;
	comments: number;
	/** Reacciones + comentarios por post. Comparable entre publicaciones. */
	engagementPerPost: number;
	/** La misma cifra en la mitad más antigua y en la más reciente: dice si sube o baja. */
	engagementFirstHalf: number;
	engagementSecondHalf: number;
	sections: string[];
	/** El post que más conectó, y el que menos. Con sus cifras. */
	bestPost: { title: string; engagement: number } | null;
	worstPost: { title: string; engagement: number } | null;
	/** Los tres con más interacción y sin título de buscador: los que más tráfico dejan. */
	seoOpportunities: { title: string; slug: string; engagement: number }[];
	/**
	 * Meses que lleva la publicación en pie, o 0 si no se sabe.
	 *
	 * Sale de `createdAt` y no de `firstPostDate`: quien importó su archivo de
	 * otra plataforma tiene primeros posts de antes de que Substack existiera
	 * (liderar.substack.com dice 2011) y saldría una antigüedad absurda.
	 */
	monthsLive: number;
};

const TITLE_MAX = 60;
const SLUG_WORDS_MAX = 5;

const STOPWORDS = new Set([
	'el','la','los','las','un','una','unos','unas','de','del','al','a','en','y','o','que','con',
	'por','para','su','sus','se','lo','mi','tu','es','the','of','to','in','and','or','for'
]);

function slugWords(slug: string): string[] {
	return slug.split('-').filter(Boolean);
}

export function measure(snapshot: NewsletterSnapshot, now: number): Measurements {
	const posts = snapshot.posts;
	const g = gaps(posts);
	const words = posts.map((p) => p.words).filter((n) => n > 0);
	const stamps = posts.map((p) => Date.parse(p.date)).filter(Number.isFinite);
	const newest = stamps.length ? Math.max(...stamps) : 0;
	const reactions = posts.reduce((sum, p) => sum + p.reactions, 0);
	const comments = posts.reduce((sum, p) => sum + p.comments, 0);

	// Del más antiguo al más nuevo, para poder partir por la mitad y comparar.
	const byDate = [...posts]
		.filter((p) => Number.isFinite(Date.parse(p.date)))
		.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
	const half = Math.floor(byDate.length / 2);
	const avg = (list: NewsletterPost[]) =>
		list.length ? Math.round((list.reduce((s, p) => s + engagement(p), 0) / list.length) * 10) / 10 : 0;

	const ranked = [...posts].sort((a, b) => engagement(b) - engagement(a));

	const created = Date.parse(snapshot.createdAt);
	const monthsLive = Number.isFinite(created)
		? Math.max(0, Math.round((now - created) / (30 * 86_400_000)))
		: 0;

	return {
		posts: posts.length,
		freePosts: posts.filter((p) => p.audience === 'everyone').length,
		paidPosts: posts.filter((p) => p.audience !== 'everyone').length,
		cadenceMedianDays: median(g),
		cadenceMinDays: g.length ? Math.min(...g) : 0,
		cadenceMaxDays: g.length ? Math.max(...g) : 0,
		daysSinceLast: newest ? Math.round((now - newest) / 86_400_000) : 0,
		wordsMin: words.length ? Math.min(...words) : 0,
		wordsMedian: median(words),
		wordsMax: words.length ? Math.max(...words) : 0,
		titlesOverLimit: posts.filter((p) => p.title.length > TITLE_MAX).length,
		longestTitle: posts.length ? Math.max(...posts.map((p) => p.title.length)) : 0,
		seoTitlesFilled: posts.filter((p) => p.seoTitle).length,
		seoDescriptionsFilled: posts.filter((p) => p.seoDescription).length,
		postsWithCover: posts.filter((p) => p.hasCover).length,
		postsWithSubtitle: posts.filter((p) => p.subtitle).length,
		slugsTooLong: posts.filter((p) => slugWords(p.slug).length > SLUG_WORDS_MAX).length,
		reactions,
		comments,
		engagementPerPost: posts.length
			? Math.round(((reactions + comments) / posts.length) * 10) / 10
			: 0,
		engagementFirstHalf: avg(byDate.slice(0, half)),
		engagementSecondHalf: avg(byDate.slice(half)),
		sections: [...new Set(posts.map((p) => p.section).filter((s): s is string => !!s))],
		bestPost: ranked[0] ? { title: ranked[0].title, engagement: engagement(ranked[0]) } : null,
		worstPost: ranked.length > 1
			? { title: ranked[ranked.length - 1].title, engagement: engagement(ranked[ranked.length - 1]) }
			: null,
		seoOpportunities: ranked
			.filter((p) => !p.seoTitle)
			.slice(0, 3)
			.map((p) => ({ title: p.title, slug: p.slug, engagement: engagement(p) })),
		monthsLive
	};
}

/**
 * Los slugs que más merece la pena mirar por dentro: los que más interacción
 * tienen. Es lo que se le pasa a `collectPostBodies`.
 */
export function slugsToSample(snapshot: NewsletterSnapshot, limit: number): string[] {
	return [...snapshot.posts]
		.sort((a, b) => engagement(b) - engagement(a))
		.slice(0, limit)
		.map((p) => p.slug)
		.filter(Boolean);
}

/**
 * Lo que ya está bien, medido igual que lo que está mal.
 *
 * Existe por una razón concreta: un informe que solo señala fallos se lee como
 * un regaño y se cierra. Y porque saber qué NO tocar vale tanto como saber qué
 * tocar. Cada línea sale de un dato, no de un cumplido: "tienes logo" no entra,
 * "publicas cada 7 días sin fallar" sí.
 */
export function strengths(snapshot: NewsletterSnapshot, m: Measurements): string[] {
	const out: string[] = [];

	if (m.posts >= 6 && m.daysSinceLast <= ABANDONED_DAYS && m.cadenceMaxDays <= m.cadenceMedianDays * 2) {
		out.push(
			`Publicas cada ${m.cadenceMedianDays} días y lo cumples: tus huecos van de ${m.cadenceMinDays} a ${m.cadenceMaxDays}. Es lo más difícil de la lista y ya lo tienes.`
		);
	}
	if (m.engagementFirstHalf > 0 && m.engagementSecondHalf > m.engagementFirstHalf) {
		out.push(
			`La interacción sube: de ${m.engagementFirstHalf} a ${m.engagementSecondHalf} por post entre tu mitad más antigua y la más reciente. Lo que estás haciendo últimamente funciona mejor que lo de antes.`
		);
	}
	if (m.bestPost && m.bestPost.engagement > m.engagementPerPost * 2) {
		out.push(
			`«${m.bestPost.title}» saca ${m.bestPost.engagement} reacciones y comentarios, más del doble de tu media (${m.engagementPerPost}). Ahí tienes el tema que pide tu gente.`
		);
	}
	if (snapshot.bestsellerTier > 0) {
		out.push(
			'Tienes insignia de bestseller de Substack. Eso lo ve todo el que llega a tu portada y no se puede comprar.'
		);
	}
	if (snapshot.welcomeBlurbs > 0) {
		out.push(
			`Tienes ${snapshot.welcomeBlurbs} ${snapshot.welcomeBlurbs === 1 ? 'testimonio' : 'testimonios'} en la página de bienvenida. De las 4 publicaciones medidas, una no los tiene: es de lo poco que sí hace la mayoría.`
		);
	}
	if (m.postsWithCover === m.posts && m.posts >= 3) {
		out.push('Todos tus posts llevan imagen de portada. Es lo que se ve cuando alguien comparte el enlace.');
	}
	if (m.postsWithSubtitle === m.posts && m.posts >= 3) {
		out.push('Todos tus posts llevan subtítulo. Es la línea que decide si se abre el correo, y no la estás desperdiciando.');
	}
	if (snapshot.customDomain) {
		out.push(`Tienes dominio propio (${snapshot.customDomain}). Si algún día te vas de Substack, te llevas el SEO.`);
	}
	if (m.sections.length >= 2) {
		out.push(`Tienes el archivo ordenado en secciones: ${m.sections.join(', ')}.`);
	}
	if (snapshot.paymentsEnabled && m.paidPosts > 0) {
		out.push(`Ya tienes el cobro montado y ${m.paidPosts} de ${m.posts} posts detrás del muro. La infraestructura está hecha.`);
	}
	return out;
}
