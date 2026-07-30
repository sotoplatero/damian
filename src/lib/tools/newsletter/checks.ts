import type { NewsletterSnapshot, NewsletterPost } from '$lib/server/newsletter';

/**
 * Lo que se puede medir sin opinar.
 *
 * Todo lo contable va aquí y no en el prompt: un título tiene 77 caracteres o no
 * los tiene, y eso no se le pregunta a un modelo que puede equivocarse contando.
 * El modelo se queda con lo que sí es juicio —si el nicho se entiende, si la
 * promesa vende— y recibe estos hechos ya medidos.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA SEVERIDAD ESTÁ CALIBRADA CONTRA NEWSLETTERS REALES. NO LA SUBAS SIN DATOS.
 *
 * Se midieron cinco publicaciones españolas, dos de ellas de las más leídas
 * del país (Kloshletter: 35.000 suscriptores y 63% de apertura; Nada importa:
 * 34.511 y 53%, cifras de fleetstreet.substack.com). Resultado:
 *
 *   - `search_engine_title` relleno: 0 de 5 publicaciones. Ninguna.
 *   - `search_engine_description`: 0 de 5 (una tenía 1 post de 20).
 *   - Imagen de portada de la publicación: 0 de 5 la tienen.
 *   - Títulos de más de 60 caracteres: las 5. Y LAS QUE MEJOR VAN, MÁS:
 *     Nada importa tiene un título de 152 caracteres con un 53% de apertura;
 *     Dineros, 14 títulos largos y uno de 163.
 *
 * De ahí dos decisiones que parecen contraintuitivas y no lo son:
 *
 *   1. Los campos SEO vacíos NO son un defecto, son una oportunidad sin tocar.
 *      Si nadie los rellena, marcarlo como grave convierte esto en un regañón
 *      genérico y le quita credibilidad a todo lo demás.
 *   2. El límite de 60 caracteres es una regla de Google, y estas newsletters
 *      viven del correo, no de la búsqueda. Se informa, no se penaliza.
 *
 * Lo que de verdad separa a unas de otras es el abandono: dos de las cinco
 * llevaban 117 y 150 días sin publicar. Eso sí es grave.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Umbrales de SEO tomados de "Guía Completa para Optimizar tu Newsletter para
 * SEO" (liderar.substack.com).
 */

/** Palabras que la guía manda quitar de los slugs. */
const STOPWORDS = new Set([
	'el','la','los','las','un','una','unos','unas','de','del','al','a','en','y','o','que','con',
	'por','para','su','sus','se','lo','mi','tu','es','the','of','to','in','and','or','for'
]);

const TITLE_MAX = 60;
const SLUG_WORDS_MAX = 5;
/** El naranja que trae Substack de fábrica. */
const SUBSTACK_ORANGE = '#FF6719';
/** Sin publicar más de esto, la publicación se lee como abandonada. */
const ABANDONED_DAYS = 45;

/**
 * `oportunidad` es para lo que nadie hace y por eso mismo está libre. No es un
 * fallo: es ventaja disponible. Se muestra aparte de los defectos.
 */
export type Severity = 'grave' | 'medio' | 'leve' | 'oportunidad';

export type Finding = {
	area: string;
	severity: Severity;
	/** El hecho medido, en una frase. Sin adjetivos. */
	fact: string;
	/** Dato bruto o contexto. */
	detail?: string;
};

function slugWords(slug: string): string[] {
	return slug.split('-').filter(Boolean);
}

/** Días enteros entre posts consecutivos, del más antiguo al más nuevo. */
export function gaps(posts: NewsletterPost[]): number[] {
	const dates = posts
		.map((p) => Date.parse(p.date))
		.filter((n) => Number.isFinite(n))
		.sort((a, b) => a - b);
	return dates.slice(1).map((d, i) => Math.round((d - dates[i]) / 86_400_000));
}

function median(values: number[]): number {
	if (!values.length) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Resumen numérico que se le pasa al modelo y se enseña en pantalla. */
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
	/** Reacciones + comentarios por post: comparable entre publicaciones. */
	engagementPerPost: number;
	sections: string[];
};

export function measure(snapshot: NewsletterSnapshot, now: number): Measurements {
	const posts = snapshot.posts;
	const g = gaps(posts);
	const words = posts.map((p) => p.words).filter((n) => n > 0);
	const stamps = posts.map((p) => Date.parse(p.date)).filter(Number.isFinite);
	const newest = stamps.length ? Math.max(...stamps) : 0;
	const reactions = posts.reduce((sum, p) => sum + p.reactions, 0);
	const comments = posts.reduce((sum, p) => sum + p.comments, 0);

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
		sections: [...new Set(posts.map((p) => p.section).filter((s): s is string => !!s))]
	};
}

/** Los hallazgos que no necesitan criterio: se cumplen o no. */
export function check(snapshot: NewsletterSnapshot, m: Measurements): Finding[] {
	const out: Finding[] = [];
	const add = (area: string, severity: Severity, fact: string, detail?: string) =>
		out.push({ area, severity, fact, detail });

	// --- Lo que de verdad mata: estar muerto ---
	if (m.posts === 0) {
		add('Cadencia', 'grave', 'No hay ninguna publicación.');
	} else if (m.posts < 3) {
		add('Cadencia', 'medio', `Solo hay ${m.posts} publicación(es): aún no hay historial que juzgar.`);
	} else if (m.daysSinceLast > ABANDONED_DAYS) {
		add(
			'Cadencia',
			'grave',
			`Hace ${m.daysSinceLast} días que no se publica. Desde fuera esto parece abandonado.`
		);
	} else if (m.cadenceMaxDays >= m.cadenceMedianDays * 3 && m.cadenceMaxDays - m.cadenceMinDays > 7) {
		add(
			'Cadencia',
			'medio',
			'La cadencia es irregular: el lector no sabe cuándo esperarte.',
			`huecos de ${m.cadenceMinDays} a ${m.cadenceMaxDays} días, mediana ${m.cadenceMedianDays}`
		);
	}

	// --- Nombre y promesa: lo primero que se lee ---
	if (!snapshot.name.trim()) {
		add('Nombre', 'grave', 'La publicación no tiene nombre.');
	} else if (snapshot.name !== snapshot.name.trim()) {
		add(
			'Nombre',
			'medio',
			'El nombre lleva espacios sobrantes. Se cuela en el asunto de cada correo.',
			JSON.stringify(snapshot.name)
		);
	}
	if (!snapshot.tagline.trim()) {
		add('Promesa', 'grave', 'No hay subtítulo: el nombre tiene que explicarse solo, y casi nunca puede.');
	}
	if (!snapshot.authorBio.trim()) {
		add('Promesa', 'medio', 'El autor no tiene biografía. Nadie sabe por qué deberían creerte.');
	}

	// --- Contenido ---
	if (m.posts >= 3) {
		if (m.postsWithSubtitle < m.posts) {
			add(
				'Contenido',
				'medio',
				'Hay posts sin subtítulo. Es la segunda línea que decide si se abre el correo.',
				`${m.postsWithSubtitle} de ${m.posts} lo tienen`
			);
		}
		if (m.wordsMin > 0 && m.wordsMax > m.wordsMin * 4) {
			add(
				'Contenido',
				'leve',
				'La longitud baila mucho de un post a otro: cuesta saber a qué te comprometes.',
				`de ${m.wordsMin} a ${m.wordsMax} palabras`
			);
		}
	}

	// --- Marca ---
	if (!snapshot.hasLogo) add('Marca', 'medio', 'No hay logo.');
	if (snapshot.brandColor?.toUpperCase() === SUBSTACK_ORANGE) {
		add(
			'Marca',
			'leve',
			'El color de acento es el naranja de fábrica de Substack.',
			'Lo llevan 3 de las 5 publicaciones medidas, así que no desentona. Cambiarlo es identidad, no urgencia.'
		);
	}

	// --- Oportunidades: lo que nadie hace ---
	if (m.posts) {
		if (m.seoTitlesFilled === 0 && m.seoDescriptionsFilled === 0) {
			add(
				'SEO',
				'oportunidad',
				'Los campos de título y descripción para buscadores están vacíos en todos los posts.',
				'Ninguna de las 5 publicaciones medidas los usa, incluidas dos de las más leídas de España. Por eso está libre: es tráfico de Google que nadie está recogiendo.'
			);
		} else if (m.seoTitlesFilled < m.posts || m.seoDescriptionsFilled < m.posts) {
			add(
				'SEO',
				'oportunidad',
				'Hay posts sin título o descripción para buscadores.',
				`títulos ${m.seoTitlesFilled}/${m.posts}, descripciones ${m.seoDescriptionsFilled}/${m.posts}`
			);
		}
		if (m.titlesOverLimit) {
			add(
				'SEO',
				'leve',
				`${m.titlesOverLimit} título(s) pasan de ${TITLE_MAX} caracteres, así que Google los corta.`,
				`el más largo mide ${m.longestTitle}. Ojo: las newsletters que mejor van los tienen aún más largos (una de 152 caracteres con 53% de apertura), porque viven del correo y no de la búsqueda. Solo importa si quieres tráfico de Google.`
			);
		}
		const conStop = snapshot.posts.filter((p) =>
			slugWords(p.slug).some((w) => STOPWORDS.has(w.toLowerCase()))
		);
		if (m.slugsTooLong || conStop.length) {
			add(
				'SEO',
				'oportunidad',
				'Las URLs son largas y llevan palabras vacías.',
				`${m.slugsTooLong} de ${m.posts} pasan de ${SLUG_WORDS_MAX} palabras. Ejemplo: ${conStop[0]?.slug ?? snapshot.posts[0].slug}`
			);
		}
	}
	if (!m.sections.length && m.posts >= 10) {
		add(
			'Contenido',
			'oportunidad',
			'No hay secciones. Con este volumen, el archivo es una lista plana.',
			`${m.posts} posts sin agrupar`
		);
	}

	return out;
}
