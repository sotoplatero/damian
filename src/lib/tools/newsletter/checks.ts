import type { NewsletterSnapshot, NewsletterPost } from '$lib/server/newsletter';

/**
 * Lo que se puede medir sin opinar.
 *
 * Todo lo contable va aquí y no en el prompt: un título tiene 77 caracteres o no
 * los tiene, y eso no se le pregunta a un modelo que puede equivocarse contando.
 * El modelo se queda con lo que sí es juicio y recibe estos hechos ya medidos.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA SEVERIDAD ESTÁ CALIBRADA CONTRA NEWSLETTERS REALES. NO LA SUBAS SIN DATOS.
 *
 * Se midieron cinco publicaciones españolas, dos de ellas de las más leídas del
 * país (Kloshletter: 35.000 suscriptores y 63% de apertura; Nada importa:
 * 34.511 y 53%, cifras de fleetstreet.substack.com). Resultado:
 *
 *   - `search_engine_title` relleno: 0 de 5 publicaciones. Ninguna.
 *   - `search_engine_description`: 0 de 5 (una tenía 1 post de 20).
 *   - Imagen de portada de la publicación: 0 de 5 la tienen.
 *   - Títulos de más de 60 caracteres: las 5. Y LAS QUE MEJOR VAN, MÁS:
 *     Nada importa tiene un título de 152 caracteres con un 53% de apertura.
 *
 * De ahí que los campos SEO vacíos sean `oportunidad` y no defecto: si nadie
 * los rellena, marcarlo como grave convierte esto en un regañón genérico. Lo
 * que de verdad separa a unas de otras es el abandono.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Umbrales de SEO tomados de "Guía Completa para Optimizar tu Newsletter para
 * SEO" (liderar.substack.com).
 */

const STOPWORDS = new Set([
	'el','la','los','las','un','una','unos','unas','de','del','al','a','en','y','o','que','con',
	'por','para','su','sus','se','lo','mi','tu','es','the','of','to','in','and','or','for'
]);

const TITLE_MAX = 60;
const SLUG_WORDS_MAX = 5;
const SUBSTACK_ORANGE = '#FF6719';
/** Sin publicar más de esto, desde fuera parece abandonado. */
const ABANDONED_DAYS = 45;
/** Textos de botón que no prometen nada. */
const GENERIC_CTA = ['suscribirse', 'suscríbete', 'subscribe', 'sign up', 'registrarse'];

/**
 * Las cinco dimensiones. Cada hallazgo cae en una, y de ahí sale una nota por
 * dimensión: así se ve DÓNDE está mal y no solo QUE está mal.
 */
export const AREAS = {
	posicion: 'Posición',
	buscadores: 'Buscadores',
	constancia: 'Constancia',
	traccion: 'Tracción',
	conversion: 'Conversión'
} as const;

export type Area = keyof typeof AREAS;

/** `oportunidad` es lo que nadie hace y por eso está libre. No es un fallo. */
export type Severity = 'grave' | 'medio' | 'leve' | 'oportunidad';

export type Finding = {
	area: Area;
	severity: Severity;
	/** El hecho medido, en una frase. Sin adjetivos. */
	fact: string;
	/** Dato bruto o contexto. */
	detail?: string;
	/**
	 * El arreglo, ESCRITO. No "mejora tu subtítulo" sino dónde se toca y qué se
	 * pone. Va aquí y no en el prompt porque no es opinión: la ruta del ajuste en
	 * Substack es la que es, y un modelo se la inventaría.
	 */
	fix: string;
	/** Cuánto mueve la aguja arreglarlo, de 1 a 10. */
	impact: number;
	/** Cuánto cuesta arreglarlo, de 1 a 10. */
	effort: number;
};

/** Poco esfuerzo y bastante impacto: lo que se hace hoy mismo. */
export function isQuickWin(f: Finding): boolean {
	return f.effort <= 3 && f.impact >= 5;
}

function slugWords(slug: string): string[] {
	return slug.split('-').filter(Boolean);
}

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

function engagement(p: NewsletterPost): number {
	return p.reactions + p.comments;
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
};

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
			.map((p) => ({ title: p.title, slug: p.slug, engagement: engagement(p) }))
	};
}

export function check(snapshot: NewsletterSnapshot, m: Measurements): Finding[] {
	const out: Finding[] = [];
	const add = (
		area: Area,
		severity: Severity,
		impact: number,
		effort: number,
		fact: string,
		fix: string,
		detail?: string
	) => out.push({ area, severity, impact, effort, fact, fix, detail });

	// --- Constancia: lo único que de verdad mata ---
	if (m.posts === 0) {
		add(
			'constancia',
			'grave',
			10,
			5,
			'No hay ninguna publicación.',
			'Publica una. Cuenta cómo has llegado hasta aquí y qué vas a mandar cada semana: es el post que más se lee de cualquier newsletter y solo se puede escribir al principio.'
		);
	} else if (m.posts < 3) {
		add(
			'constancia',
			'medio',
			6,
			5,
			m.posts === 1
				? 'Solo hay una publicación: aún no hay historial que juzgar.'
				: `Solo hay ${m.posts} publicaciones: aún no hay historial que juzgar.`,
			'Llega a cinco antes de tocar nada más. Con menos no hay forma de saber qué funciona y qué fue casualidad.'
		);
	} else if (m.daysSinceLast > ABANDONED_DAYS) {
		add(
			'constancia',
			'grave',
			10,
			4,
			`Hace ${m.daysSinceLast} días que no se publica. Desde fuera esto parece abandonado.`,
			`Manda uno esta semana y reconoce el hueco en la primera línea: «Llevo ${m.daysSinceLast} días sin escribir. Te cuento por qué». Rinde más que volver como si no hubiera pasado nada.`,
			'Es lo único de esta lista que hace que un lector nuevo se vaya sin suscribirse.'
		);
	} else if (m.cadenceMaxDays >= m.cadenceMedianDays * 3 && m.cadenceMaxDays - m.cadenceMinDays > 7) {
		add(
			'constancia',
			'medio',
			7,
			4,
			'La cadencia es irregular: el lector no sabe cuándo esperarte.',
			`Elige un día fijo y escríbelo en el subtítulo (Settings → Publication details → Short description). Con tu ritmo actual, uno cada ${m.cadenceMedianDays} días es lo que ya estás cumpliendo. «Los martes» es una promesa que se puede cumplir; «cuando tenga algo» no.`,
			`huecos de ${m.cadenceMinDays} a ${m.cadenceMaxDays} días, mediana ${m.cadenceMedianDays}`
		);
	}
	if (m.posts >= 3 && m.wordsMin > 0 && m.wordsMax > m.wordsMin * 4) {
		add(
			'constancia',
			'leve',
			3,
			4,
			'La longitud baila mucho de un post a otro: cuesta saber a qué te comprometes.',
			`Ponte un suelo y un techo alrededor de tu mediana (${m.wordsMedian} palabras) y respétalo. Lo que se sale por arriba se parte en dos entregas.`,
			`de ${m.wordsMin} a ${m.wordsMax} palabras`
		);
	}

	// --- Posición: nombre, promesa, autor ---
	if (!snapshot.name.trim()) {
		add(
			'posicion',
			'grave',
			9,
			1,
			'La publicación no tiene nombre.',
			'Settings → Publication details → Name. Dos o tres palabras que se puedan repetir de memoria.'
		);
	} else if (snapshot.name !== snapshot.name.trim()) {
		add(
			'posicion',
			'medio',
			6,
			1,
			'El nombre lleva espacios sobrantes.',
			'Settings → Publication details → Name. Borra el espacio del principio o del final y guarda. Dos minutos.',
			`${JSON.stringify(snapshot.name)} — se cuela en el asunto de cada correo que envías`
		);
	}
	if (!snapshot.tagline.trim()) {
		add(
			'posicion',
			'grave',
			9,
			2,
			'No hay subtítulo: el nombre tiene que explicarse solo, y casi nunca puede.',
			'Settings → Publication details → Short description. En el apartado «La promesa» de este informe tienes uno escrito, listo para pegar.'
		);
	}
	if (!snapshot.authorBio.trim()) {
		add(
			'posicion',
			'medio',
			5,
			2,
			'El autor no tiene biografía. Nadie sabe por qué debería creerte.',
			'Settings → tu perfil → Bio. Tres frases: qué haces, por qué sabes de esto y qué manda esta newsletter. Sin currículum ni «apasionado de».'
		);
	}

	// --- Conversión: lo que decide que alguien deje su correo ---
	const cta = snapshot.buttons.map((b) => b.toLowerCase().trim());
	if (cta.length && cta.some((b) => GENERIC_CTA.includes(b))) {
		// Las 5 publicaciones medidas llevan el mismo botón, porque es el que pone
		// Substack de serie. Así que es terreno libre, no un fallo: donde sí se
		// puede cambiar el texto (los botones dentro de un post) nadie lo aprovecha.
		add(
			'conversion',
			'oportunidad',
			6,
			2,
			'El botón dice "Suscribirse" y no promete nada.',
			'El de la portada lo fija Substack, pero el que insertas dentro de un post sí lleva el texto que quieras (en el editor: Button → Button text). Ahí pon qué llega y cada cuánto. En el apartado «El botón» tienes uno escrito.',
			'Es el que Substack pone por defecto y lo llevan las 5 publicaciones medidas. Decir qué llega y cada cuánto convierte mejor que un trámite.'
		);
	}
	if (m.posts >= 3 && m.postsWithSubtitle < m.posts) {
		add(
			'conversion',
			'medio',
			6,
			2,
			'Hay posts sin subtítulo. Es la segunda línea que decide si se abre el correo.',
			'En el editor, el campo gris justo debajo del título. Si lo dejas vacío, Substack mete ahí las primeras palabras del texto, que casi nunca son las que venden.',
			`${m.postsWithSubtitle} de ${m.posts} lo tienen`
		);
	}
	if (!snapshot.hasLogo) {
		add(
			'conversion',
			'medio',
			4,
			2,
			'No hay logo.',
			'Settings → Publication details → Logo, cuadrado y de 256×256 como mínimo. Es lo que aparece junto a tu nombre en la bandeja de Gmail.'
		);
	}
	if (snapshot.brandColor?.toUpperCase() === SUBSTACK_ORANGE) {
		add(
			'conversion',
			'leve',
			2,
			1,
			'El color de acento es el naranja de fábrica de Substack.',
			'Settings → Publication details → Accent color. Un minuto.',
			'Lo llevan 3 de las 5 publicaciones medidas, así que no desentona. Es identidad, no urgencia.'
		);
	}
	if (!m.sections.length && m.posts >= 10) {
		add(
			'conversion',
			'oportunidad',
			5,
			3,
			'No hay secciones: con este volumen el archivo es una lista plana.',
			'Settings → Sections. Dos o tres, no diez, y que se distingan de un vistazo. Sirven para que alguien pueda suscribirse solo a una parte.',
			`${m.posts} posts sin agrupar`
		);
	}

	// --- Tracción ---
	if (m.posts >= 3 && m.reactions === 0 && m.comments === 0) {
		add(
			'traccion',
			'medio',
			6,
			6,
			'Ni una reacción ni un comentario en los últimos posts.',
			'Termina el próximo con una pregunta concreta —no «¿qué opinas?»— y responde a todo el que conteste el primer día. Los comentarios arrancan cuando se ve que hay alguien al otro lado.'
		);
	} else if (
		m.posts >= 6 &&
		m.engagementFirstHalf > 0 &&
		m.engagementSecondHalf < m.engagementFirstHalf * 0.6
	) {
		add(
			'traccion',
			'medio',
			8,
			6,
			'La interacción está cayendo.',
			m.bestPost
				? `Tu post con más respuesta es «${m.bestPost.title}» (${m.bestPost.engagement}). Escribe el siguiente sobre eso mismo, un paso más adentro. La caída suele ser que te has ido del tema que funcionaba.`
				: 'Vuelve al tema de tus posts con más respuesta. La caída suele ser que te has ido de lo que funcionaba.',
			`de ${m.engagementFirstHalf} a ${m.engagementSecondHalf} por post entre tu mitad más antigua y la más reciente`
		);
	}

	// La descripción de la portada: es literalmente lo que se lee en Google.
	//
	// NO se comprueba si lleva la plantilla de Substack ("Click to read...,
	// a Substack publication"). Se midió: la tienen las 5 publicaciones, y no
	// por dejadez. Substack construye la descripción como
	// `{tu subtítulo}. Click to read {nombre}, by {autor}, a Substack publication.`
	// y ese rabo no se puede quitar. Señalarlo sería inventar un fallo sin
	// arreglo posible. Lo que sí se hace es enseñárselo tal cual en la vista
	// previa de Google del informe: que lo vea, y que sepa que no es suyo.
	if (!snapshot.metaDescription.trim()) {
		add(
			'buscadores',
			'medio',
			6,
			2,
			'La portada no tiene descripción para buscadores.',
			'Settings → Publication details → Short description. Substack la usa también como descripción de la portada, así que la misma frase te sirve para las dos cosas.',
			'Sin ella, Google elige un trozo del texto a su gusto.'
		);
	}

	// --- Buscadores: casi todo oportunidad, ver la calibración de arriba ---
	if (m.posts) {
		const seoFix =
			'En cada post: ⋯ → Manage → SEO. Son dos campos aparte del título de verdad, así que el título del post no cambia. En el apartado «Escritos para buscadores» tienes los de tus mejores posts, listos para pegar.';
		if (m.seoTitlesFilled === 0 && m.seoDescriptionsFilled === 0) {
			add(
				'buscadores',
				'oportunidad',
				7,
				3,
				'Los campos de título y descripción para buscadores están vacíos en todos los posts.',
				seoFix,
				'Ninguna de las 5 publicaciones medidas los usa, incluidas dos de las más leídas de España. Por eso está libre: es tráfico de Google que nadie recoge.'
			);
		} else if (m.seoTitlesFilled < m.posts || m.seoDescriptionsFilled < m.posts) {
			add(
				'buscadores',
				'oportunidad',
				5,
				3,
				'Hay posts sin título o descripción para buscadores.',
				seoFix,
				`títulos ${m.seoTitlesFilled}/${m.posts}, descripciones ${m.seoDescriptionsFilled}/${m.posts}`
			);
		}
		if (m.titlesOverLimit) {
			add(
				'buscadores',
				'leve',
				3,
				2,
				m.titlesOverLimit === 1
				? `Un título pasa de ${TITLE_MAX} caracteres y Google lo corta.`
				: `${m.titlesOverLimit} títulos pasan de ${TITLE_MAX} caracteres y Google los corta.`,
				`No toques el título del post: el que Google enseña es el de ⋯ → Manage → SEO, y ahí pones una versión por debajo de ${TITLE_MAX} caracteres. Así te quedas con los dos.`,
				`el más largo mide ${m.longestTitle}. Solo importa si quieres tráfico de búsqueda: las newsletters que mejor van los tienen aún más largos y viven del correo.`
			);
		}
		const conStop = snapshot.posts.filter((p) =>
			slugWords(p.slug).some((w) => STOPWORDS.has(w.toLowerCase()))
		);
		if (m.slugsTooLong || conStop.length) {
			add(
				'buscadores',
				'oportunidad',
				4,
				2,
				'Las URLs son largas y llevan palabras vacías.',
				'En el próximo post, antes de publicar: ⋯ → Manage → URL slug. Tres o cuatro palabras sin artículos ni preposiciones. En los ya publicados NO lo cambies: rompes los enlaces que otros te han puesto.',
				`${m.slugsTooLong} de ${m.posts} pasan de ${SLUG_WORDS_MAX} palabras. Ejemplo: ${conStop[0]?.slug ?? snapshot.posts[0].slug}`
			);
		}
	}

	// De mayor a menor impacto: el informe se lee en ese orden.
	return out.sort((a, b) => b.impact - a.impact);
}

/**
 * El esfuerzo, en tiempo. "Esfuerzo 3/10" no le dice nada a nadie; "diez
 * minutos" sí, y es lo que decide si se hace hoy o nunca.
 */
export function effortLabel(effort: number): string {
	if (effort <= 2) return 'dos minutos';
	if (effort <= 3) return 'diez minutos';
	if (effort <= 5) return 'una tarde';
	if (effort <= 7) return 'unas semanas';
	return 'constancia';
}

/**
 * Una nota por dimensión y una global.
 *
 * Se parte de 100 y se resta el peso de cada hallazgo. Es NUESTRA escala, no un
 * estándar del sector: sirve para ordenar y para ver de un vistazo dónde está el
 * problema, no para compararse con nadie. Eso va escrito en el informe.
 *
 * La global SUMA las penalizaciones, no promedia las cinco dimensiones. Se
 * probó promediando y una publicación abandonada 117 días sacaba 85: una
 * dimensión catastrófica se diluía entre cuatro sanas. Sumando, esa misma saca
 * 39, que es lo que merece.
 *
 * Calibrado contra las tres que se midieron:
 *   Kloshletter (35.000 subs, publica a diario)  -> 83
 *   Objeto Brillante (interacción cayendo)       -> 64
 *   Ensayos (117 días sin publicar)              -> 39
 *
 * Las oportunidades restan poco a propósito: no son fallos, y si restaran mucho
 * una publicación sana saldría suspendida.
 */
const PENALTY: Record<Severity, number> = {
	grave: 40,
	medio: 15,
	leve: 4,
	oportunidad: 3
};

export type Scores = { total: number; byArea: Record<Area, number> };

export function score(findings: Finding[]): Scores {
	const byArea = {} as Record<Area, number>;
	for (const area of Object.keys(AREAS) as Area[]) {
		const penalty = findings
			.filter((f) => f.area === area)
			.reduce((sum, f) => sum + PENALTY[f.severity], 0);
		byArea[area] = Math.max(0, 100 - penalty);
	}
	const total = findings.reduce((sum, f) => sum + PENALTY[f.severity], 0);
	return { total: Math.max(0, 100 - total), byArea };
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
