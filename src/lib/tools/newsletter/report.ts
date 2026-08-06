import { copy as t } from './copy';
import { strengths, type Measurements } from './checks';
import {
	DIMENSIONS,
	EFFORT_LABEL,
	isQuickWin,
	type AuditItem,
	type Dimension,
	type Tally
} from './rules';
import type { NewsletterSnapshot } from '$lib/server/newsletter';
import { escapeMarkdown } from '$lib/tools/markdown';

/**
 * La auditoría completa, en markdown, para el correo.
 *
 * Tres reglas que aguantan cualquier cambio aquí:
 *
 * 1. **Es el MISMO documento que la pantalla, con lo tapado abierto.** No una
 *    segunda versión. El orden es el de `+page.svelte` y las etiquetas salen del
 *    mismo `./copy.ts`, así que no pueden divergir por descuido. Y sí repite lo
 *    que ya vio gratis, a propósito: el correo es lo único que le queda cuando
 *    cierra la pestaña.
 * 2. **Cada sección lleva un dato o una propuesta, o no existe.** Salió de auditar
 *    un informe SEO de referencia con dos páginas repetidas literalmente y
 *    recomendaciones del tipo "mejora la experiencia de usuario".
 * 3. **El arreglo va escrito, no descrito.** Eso ya lo garantiza el tipo:
 *    `AuditItem` exige `propuesta`, y lo que llega sin ella se cae antes.
 *
 * El cuerpo es UN BUCLE sobre los hallazgos. Antes eran once secciones
 * condicionales concatenando strings, y cada una podía desaparecer en silencio.
 *
 * NO hay nota sobre 100: se quitó, y el motivo está en `tally` (`rules.ts`). En su
 * sitio va el estado y el recuento, que son hechos.
 *
 * NO se usan tablas markdown a propósito: el shell de correo no las estiliza y en
 * un móvil de 320px se salen. Una lista numerada escanea igual y no se rompe.
 *
 * El texto del modelo se escapa antes de meterlo en el markdown: una línea que
 * empiece por "#" o "-" la pintaría el cliente de correo como titular o lista.
 */

function clean(value: unknown): string {
	return typeof value === 'string' && value.trim() ? escapeMarkdown(value.trim()) : '';
}

function section(title: string, body: string): string {
	return body ? `## ${title}\n\n${body}` : '';
}

/**
 * El rabo que Substack pega detrás del subtítulo de todo el mundo en la meta
 * descripción. No es un hallazgo porque no tiene arreglo posible (lo llevan las
 * cinco publicaciones medidas), pero explicarlo sí es información: es el motivo
 * de que el subtítulo tenga que decir lo importante al principio.
 */
const SUBSTACK_TAIL = /click to read|a substack publication/i;

/** Una palabra para la gravedad. Es lo que se lee al escanear. */
const LABEL = {
	grave: 'GRAVE',
	medio: 'Importante',
	leve: 'Menor',
	oportunidad: 'Libre'
} as const;

/**
 * El titular del informe. Sustituye a la nota sobre 100 y sale de una regla de
 * una línea: hay algo grave, hay fallos, o solo queda terreno libre.
 */
const STATE_LINE = {
	roto: 'Hay algo roto.',
	fugas: 'Funciona, y tiene fugas.',
	sano: 'Está sano.'
} as const;

export type ReportInput = {
	site: string;
	snapshot: NewsletterSnapshot;
	m: Measurements;
	/** Todos los hallazgos, medidos y abiertos, ya ordenados por gravedad. */
	items: AuditItem[];
	tally: Tally;
	diagnosis: { veredicto: string; loQueSeEntiende: string; paraQuien: string } | null;
};

/** «3 hallazgos, 1 grave» — el recuento, que es un hecho y no un juicio. */
function countLine(tally: Tally): string {
	if (!tally.total) return 'Ni un hallazgo.';
	const parts = [`${tally.total} ${tally.total === 1 ? 'hallazgo' : 'hallazgos'}`];
	if (tally.grave) parts.push(`${tally.grave} grave${tally.grave === 1 ? '' : 's'}`);
	if (tally.medio) parts.push(`${tally.medio} importante${tally.medio === 1 ? '' : 's'}`);
	if (tally.oportunidad) parts.push(`${tally.oportunidad} de terreno libre`);
	return parts.join(', ');
}

export function toMarkdown({ site, snapshot, m, items, tally, diagnosis }: ReportInput): string {
	const good = strengths(snapshot, m);

	/**
	 * Un hallazgo: qué pasa, cuánto pesa, la prueba y el arreglo. Es el único
	 * bloque que se repite, y de él sale todo el cuerpo del informe.
	 */
	const renderItem = (item: AuditItem, i: number) =>
		[
			`**${i + 1}. ${clean(item.hecho)}**`,
			`${LABEL[item.severity]} · ${DIMENSIONS[item.dimension]} · ${EFFORT_LABEL[item.effort]}` +
				(isQuickWin(item) ? ' · **se hace hoy**' : ''),
			item.evidencia
				? item.origen === 'abierto'
					? `> ${clean(item.evidencia)}`
					: clean(item.evidencia)
				: '',
			`*${t.labelFix}:* ${clean(item.propuesta)}`
		]
			.filter(Boolean)
			.join('\n\n');

	const parts = [
		// --- La introducción: qué es esto y de dónde sale. Sin ella el correo
		//     empezaba con un número a pelo, que además es el preheader de Gmail.
		[
			`Esta es la auditoría completa de **${site}**, la que te prometí cuando dejaste tu correo.`,
			`Es la misma que viste en pantalla, con ${items.length === 1 ? 'el hallazgo' : `los ${items.length} hallazgos`} ${items.length === 1 ? 'abierto' : 'abiertos'} y el arreglo de cada uno escrito. Empieza igual, así que puedes bajar directo a **Qué está mal**.`,
			`Una cosa antes: lo que va marcado como **${LABEL.oportunidad}** no es un fallo. Son cosas que no hace ni la competencia que mejor va, y por eso están libres.`
		].join('\n\n'),

		'---',

		// --- El estado y el recuento. Igual que en pantalla. ---
		`# ${STATE_LINE[tally.state]}`,

		`**${countLine(tally)}.**${tally.quickWins ? ` ${tally.quickWins === 1 ? 'Uno se hace' : `${tally.quickWins} se hacen`} hoy mismo.` : ''}`,

		clean(diagnosis?.veredicto),

		// Por dimensión, un recuento y nada más: ni barras ni notas, porque cualquier
		// número aquí volvería a ser el agregado que se quitó.
		[
			...(Object.keys(DIMENSIONS) as Dimension[]).map((d) => {
				const { total, worst } = tally.byDimension[d];
				if (!total) return `- **${DIMENSIONS[d]}** — nada que señalar`;
				return `- **${DIMENSIONS[d]}** — ${total} ${total === 1 ? 'hallazgo' : 'hallazgos'}${worst ? `, el peor ${LABEL[worst].toLowerCase()}` : ''}`;
			}),
			'',
			`*${t.stateNote}*`
		].join('\n'),

		// --- Las cifras: lo único que no se puede discutir ---
		section(
			'Las cifras',
			[
				`- **${m.posts}** posts leídos (${m.freePosts} gratis, ${m.paidPosts} de pago)`,
				`- Un post cada **${m.cadenceMedianDays} ${m.cadenceMedianDays === 1 ? 'día' : 'días'}** de mediana, con huecos de ${m.cadenceMinDays} a ${m.cadenceMaxDays}`,
				m.daysSinceLast === 0
					? '- El último, **hoy**'
					: `- El último, hace **${m.daysSinceLast} ${m.daysSinceLast === 1 ? 'día' : 'días'}**`,
				m.monthsLive ? `- La publicación lleva **${m.monthsLive} meses** en pie` : '',
				`- De ${m.wordsMin} a ${m.wordsMax} palabras por post (mediana ${m.wordsMedian})`,
				`- **${m.engagementPerPost}** reacciones y comentarios por post — ${m.engagementFirstHalf} en tu mitad más antigua, ${m.engagementSecondHalf} en la más reciente`,
				m.bestPost ? `- El que más conectó: «${clean(m.bestPost.title)}» (${m.bestPost.engagement})` : '',
				m.sections.length ? `- Secciones: ${m.sections.join(', ')}` : '- Sin secciones'
			]
				.filter(Boolean)
				.join('\n')
		),

		// --- La tarjeta, la misma que vio en pantalla y con la misma etiqueta ---
		section(
			t.labelCard,
			[
				`> **${snapshot.name.trim() || '(sin nombre)'}**  `,
				`> ${clean(snapshot.tagline) || `*${t.cardNoTagline}*`}  `,
				`> ${snapshot.ogImage ? 'Con imagen' : `**${t.cardNoImage}**`}`,
				SUBSTACK_TAIL.test(snapshot.metaDescription)
					? '\n*En Google, detrás de tu subtítulo, Substack pega un «Click to read...» que no has escrito tú y que no se puede quitar. Lo llevan todas. Lo único que está en tu mano es que tu subtítulo diga lo importante al principio, porque Google corta a los 160 caracteres.*'
					: ''
			]
				.filter(Boolean)
				.join('\n')
		),

		// --- Lo que solo se puede juzgar leyendo. También estaba en pantalla. ---
		clean(diagnosis?.paraQuien)
			? section(t.labelAudience, `${clean(diagnosis?.paraQuien)}\n\n*${t.audienceNote}*`)
			: '',

		clean(diagnosis?.loQueSeEntiende) ? section(t.labelNiche, clean(diagnosis?.loQueSeEntiende)) : '',

		// --- El cuerpo: un bucle, de más a menos grave ---
		section(
			items.length ? `Qué está mal (${items.length})` : 'Qué está mal',
			items.length
				? items.map(renderItem).join('\n\n---\n\n')
				: 'Nada que señalar. No es habitual.'
		),

		// --- Lo que ya está bien: saber qué no tocar vale tanto como saber qué tocar ---
		good.length ? section('Qué está bien', good.map((g) => `- ${clean(g)}`).join('\n')) : '',

		// --- Y lo único que se recuerda al cerrar el correo ---
		items.length
			? section(
					'Por dónde empezar',
					'Por el **1**, y para. Si cambias el subtítulo, el botón y los títulos el mismo día, dentro de un mes no vas a saber qué fue lo que funcionó.'
				)
			: ''
	];

	return parts.filter(Boolean).join('\n\n');
}
