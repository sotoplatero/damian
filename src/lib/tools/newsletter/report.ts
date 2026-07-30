import { AREAS, isQuickWin, effortLabel, strengths, type Area, type Finding, type Measurements, type Scores } from './checks';
import type { NewsletterSnapshot } from '$lib/server/newsletter';

/**
 * El informe completo, en markdown, para el correo.
 *
 * Dos reglas que aguantan cualquier cambio aquí:
 *
 * 1. **Cada sección lleva un dato o una acción, o no existe.** Salió de auditar
 *    un informe SEO de referencia que tenía dos páginas repetidas literalmente y
 *    recomendaciones del tipo "mejora la experiencia de usuario". Se paga con la
 *    confianza de quien deja su correo, así que aquí no entra relleno.
 * 2. **El arreglo va escrito, no descrito.** "Pega esto: «...»" y no "mejora tu
 *    subtítulo". Los arreglos deterministas vienen en `Finding.fix`; los que hay
 *    que redactar los escribe el modelo.
 *
 * El orden no es decorativo: primero la nota (para que se sepa dónde está), luego
 * lo que se ve desde fuera (para que se reconozca), luego el índice de hallazgos
 * (para que se pueda escanear) y solo después el detalle. Termina por dónde
 * empezar, que es lo único que se recuerda al cerrarlo.
 *
 * NO se usan tablas markdown a propósito: el shell de correo no las estiliza y en
 * un móvil de 320px se salen. Un índice numerado escanea igual y no se rompe.
 *
 * El texto del modelo se escapa antes de meterlo en el markdown por el mismo
 * motivo que en el otro tool: una línea que empiece por "#" o "-" la pintaría el
 * cliente de correo como titular o lista.
 */

export type Niche = {
	veredicto?: string;
	loQueSeEntiende?: string;
	claro?: boolean;
	porQue?: string;
	paraQuien?: string;
};
export type Block = { veredicto?: string; reescritura?: string };
export type Titles = { veredicto?: string; mejorTitulo?: string; peorTitulo?: string };
export type SeoTitle = { slug?: string; titulo?: string; descripcion?: string };
export type FullVerdict = {
	promesa?: Block;
	cta?: Block;
	titulares?: Titles;
	seoTitles?: SeoTitle[];
	acciones?: string[];
};

/** Ver el comentario de $lib/tools/7-frameworks/format.ts: mismo problema, misma cura. */
function escapeMarkdown(text: string): string {
	return text
		.split('\n')
		.map((line) => {
			if (/^\s*(-{2,}|={2,}|_{3,})\s*$/.test(line)) return line.replace(/(.)/g, '$1 ').trimEnd();
			if (/^\s*\d+[.)]/.test(line)) return line.replace(/^(\s*\d+)([.)])/, '$1\\$2');
			return line.replace(/^(\s*)([#>+\-*=|])/, '$1\\$2');
		})
		.join('\n');
}

function clean(value: unknown): string {
	return typeof value === 'string' && value.trim() ? escapeMarkdown(value.trim()) : '';
}

function section(title: string, body: string): string {
	return body ? `## ${title}\n\n${body}` : '';
}

function sub(title: string, body: string): string {
	return body ? `**${title}**\n\n${body}` : '';
}

/** Como lo corta Google: por caracteres, sin cortar una palabra por la mitad. */
function cut(text: string, max: number): string {
	if (text.length <= max) return text;
	const trimmed = text.slice(0, max);
	const space = trimmed.lastIndexOf(' ');
	return `${(space > max * 0.6 ? trimmed.slice(0, space) : trimmed).trimEnd()}…`;
}

/**
 * El rabo que Substack pega detrás del subtítulo de todo el mundo en la meta
 * descripción. Ver el comentario de checks.ts: no es un hallazgo porque no tiene
 * arreglo, pero enseñarlo explica por qué el subtítulo tiene que ir al grano.
 */
const SUBSTACK_TAIL = /click to read|a substack publication/i;

/** Una palabra para la gravedad, que es lo que se lee en el índice. */
const LABEL: Record<Finding['severity'], string> = {
	grave: 'GRAVE',
	medio: 'Importante',
	leve: 'Menor',
	oportunidad: 'Libre'
};

function verdictLine(total: number): string {
	if (total >= 85) return 'Está sano. Lo que queda es terreno que nadie pisa.';
	if (total >= 70) return 'Funciona, y hay dos o tres cosas que lo subirían sin tocar lo que escribes.';
	if (total >= 50) return 'La base está, pero hay fugas que cuestan suscriptores.';
	return 'Hay algo roto que hace que un lector nuevo se vaya sin dejar el correo.';
}

export function toMarkdown(
	site: string,
	snapshot: NewsletterSnapshot,
	m: Measurements,
	findings: Finding[],
	scores: Scores,
	niche: Niche | null,
	verdict: FullVerdict | null
): string {
	const defects = findings.filter((f) => f.severity !== 'oportunidad');
	const quickWins = findings.filter(isQuickWin);
	// El más reciente por fecha, no el primero del archivo: el orden lo pone Substack.
	const latest = [...snapshot.posts].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
	const good = strengths(snapshot, m);

	/** Una línea del índice: gravedad, hecho, cuánto mueve y cuánto cuesta. */
	const indexLine = (f: Finding, i: number) =>
		`${i + 1}\\. **${LABEL[f.severity]}** — ${clean(f.fact)}  \n` +
		`Impacto ${f.impact}/10 · ${effortLabel(f.effort)}${isQuickWin(f) ? ' · **se hace hoy**' : ''}`;

	/** El detalle: el hecho, el dato y el arreglo escrito. */
	const detailBlock = (f: Finding, i: number) =>
		[
			`**${i + 1}. ${clean(f.fact)}**`,
			f.detail ? clean(f.detail) : '',
			`*Cómo se arregla:* ${clean(f.fix)}`
		]
			.filter(Boolean)
			.join('\n\n');

	const parts = [
		`# ${scores.total} sobre 100`,

		clean(niche?.veredicto) || verdictLine(scores.total),

		[
			...(Object.keys(AREAS) as Area[]).map((a) => `- **${AREAS[a]}** ${scores.byArea[a]}`),
			'',
			'*Es mi escala, no un estándar del sector: sirve para ver de un vistazo dónde está el problema, no para compararte con nadie. Parto de 100 y resto el peso de cada hallazgo.*'
		].join('\n'),

		// --- Las cifras: lo único que no se puede discutir ---
		section(
			'Las cifras',
			[
				`- **${m.posts}** posts leídos (${m.freePosts} gratis, ${m.paidPosts} de pago)`,
				`- Un post cada **${m.cadenceMedianDays} días** de mediana, con huecos de ${m.cadenceMinDays} a ${m.cadenceMaxDays}`,
				`- El último, hace **${m.daysSinceLast} días**`,
				`- De ${m.wordsMin} a ${m.wordsMax} palabras por post (mediana ${m.wordsMedian})`,
				`- **${m.engagementPerPost}** reacciones y comentarios por post — ${m.engagementFirstHalf} en tu mitad más antigua, ${m.engagementSecondHalf} en la más reciente`,
				m.bestPost ? `- El que más conectó: «${clean(m.bestPost.title)}» (${m.bestPost.engagement})` : '',
				m.sections.length ? `- Secciones: ${m.sections.join(', ')}` : '- Sin secciones'
			]
				.filter(Boolean)
				.join('\n')
		),

		// --- Cómo te ven: los tres sitios donde apareces sin estar delante ---
		section(
			'Cómo te ven',
			[
				'Estos son los tres únicos sitios donde alguien te encuentra sin haberte leído nunca. Reconstruidos con lo que hay puesto ahora mismo.',
				sub(
					'Cuando alguien comparte tu enlace',
					[
						`> **${snapshot.name.trim() || '(sin nombre)'}**  `,
						`> ${clean(snapshot.tagline) || '*(sin subtítulo: aquí no sale nada)*'}  `,
						`> ${snapshot.ogImage ? 'Con imagen' : '**Sin imagen** — la tarjeta sale como un enlace de texto'}`
					].join('\n')
				),
				latest
					? sub(
							'En la bandeja de entrada',
							[
								`> De: **${snapshot.name || '(sin nombre)'}**  `,
								`> ${clean(latest.title)}  `,
								`> ${clean(latest.subtitle) || '*(sin subtítulo: Substack rellena con las primeras palabras del texto)*'}`
							].join('\n')
						)
					: '',
				sub(
					'En Google',
					[
						`> ${site}  `,
						`> **${clean(cut(snapshot.pageTitle, 60))}**  `,
						`> ${clean(cut(snapshot.metaDescription, 160)) || '*(sin descripción: Google elige un trozo del texto a su gusto)*'}`,
						// El rabo de la plantilla no es culpa suya y no hay forma de quitarlo,
						// así que no es un hallazgo. Pero verlo escrito sí es información:
						// explica por qué su subtítulo tiene que decir lo importante primero.
						SUBSTACK_TAIL.test(snapshot.metaDescription)
							? '\n*Ese «Click to read...» del final no lo has escrito tú: Substack lo pega detrás de tu subtítulo y no hay forma de quitarlo. Lo llevan todas. Lo único que está en tu mano es que tu subtítulo diga lo importante al principio, porque Google corta a los 160 caracteres.*'
							: ''
					]
						.filter(Boolean)
						.join('\n')
				)
			]
				.filter(Boolean)
				.join('\n\n')
		),

		// --- Lo que solo se puede juzgar leyendo ---
		niche?.paraQuien
			? section(
					'Para quién escribes',
					`${clean(niche.paraQuien)}\n\n*Esto sale solo de lo que enseñas. Si no es a quien tenías en la cabeza, el problema no es el lector: es lo que se lee.*`
				)
			: '',

		niche?.loQueSeEntiende
			? section('Lo que se entiende', `${clean(niche.loQueSeEntiende)}\n\n${clean(niche.porQue)}`.trim())
			: '',

		verdict?.promesa?.veredicto
			? section(
					'La promesa',
					[
						clean(verdict.promesa.veredicto),
						clean(verdict.promesa.reescritura)
							? `**Pega esto en Settings → Publication details → Short description:**\n\n> ${clean(verdict.promesa.reescritura)}`
							: ''
					]
						.filter(Boolean)
						.join('\n\n')
				)
			: '',

		verdict?.cta?.veredicto
			? section(
					'El botón',
					[
						clean(verdict.cta.veredicto),
						clean(verdict.cta.reescritura)
							? `**Pon esto en el botón que insertes dentro de un post:**\n\n> ${clean(verdict.cta.reescritura)}`
							: ''
					]
						.filter(Boolean)
						.join('\n\n')
				)
			: '',

		verdict?.titulares?.veredicto
			? section(
					'Los títulos',
					[
						clean(verdict.titulares.veredicto),
						verdict.titulares.mejorTitulo ? `**El mejor:** «${clean(verdict.titulares.mejorTitulo)}»` : '',
						verdict.titulares.peorTitulo ? `**El más flojo:** «${clean(verdict.titulares.peorTitulo)}»` : ''
					]
						.filter(Boolean)
						.join('\n\n')
				)
			: '',

		// --- El índice: de un vistazo, qué hay y en qué orden ---
		section(
			findings.length ? `Los ${findings.length} hallazgos, de más a menos impacto` : 'Hallazgos',
			findings.length
				? [
						findings.map(indexLine).join('\n\n'),
						'',
						`${defects.length} son fallos y ${findings.length - defects.length} son terreno libre: cosas que no hace ni la competencia que mejor va.` +
							(quickWins.length ? ` ${quickWins.length} se pueden hacer hoy mismo.` : '')
					].join('\n')
				: 'Nada que señalar. No es habitual.'
		),

		// --- El detalle con el arreglo escrito ---
		findings.length ? section('Uno por uno', findings.map(detailBlock).join('\n\n')) : '',

		// --- Los títulos de buscador, ya escritos ---
		verdict?.seoTitles?.length && m.seoOpportunities.length
			? section(
					'Escritos para buscadores',
					[
						'Tus posts con más respuesta y sin título de buscador. Los he escrito yo: cópialos en ⋯ → Manage → SEO de cada post. El título del post no cambia.',
						...verdict.seoTitles.slice(0, 3).map((t) => {
							const post = m.seoOpportunities.find((p) => p.slug === t.slug);
							return [
								`**${clean(post?.title ?? t.slug ?? '')}**`,
								clean(t.titulo) ? `*Título:* ${clean(t.titulo)}` : '',
								clean(t.descripcion) ? `*Descripción:* ${clean(t.descripcion)}` : ''
							]
								.filter(Boolean)
								.join('  \n');
						})
					].join('\n\n')
				)
			: '',

		// --- Lo que ya está bien: saber qué no tocar vale tanto como saber qué tocar ---
		good.length
			? section('Lo que sí funciona', good.map((g) => `- ${clean(g)}`).join('\n'))
			: '',

		// --- Y lo único que se recuerda al cerrar el correo ---
		verdict?.acciones?.length
			? section(
					'Por dónde empezar',
					[
						verdict.acciones
							.slice(0, 3)
							.map((a, i) => `**${i + 1}.** ${clean(a)}`)
							.join('\n\n'),
						'',
						'Haz la primera y para. Si cambias el subtítulo, el botón y los títulos el mismo día, dentro de un mes no vas a saber qué fue lo que funcionó.'
					].join('\n')
				)
			: ''
	];

	return parts.filter(Boolean).join('\n\n');
}
