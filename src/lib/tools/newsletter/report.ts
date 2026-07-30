import type { Finding, Measurements } from './checks';

/**
 * El informe completo, en markdown, para el correo.
 *
 * Lo que va aquí es lo que NO se enseña en pantalla: la promesa, el botón, los
 * títulos, los defectos, las oportunidades y las tres acciones. En la web solo
 * quedan las cifras y el nicho.
 *
 * El texto del modelo se escapa antes de meterlo en el markdown por el mismo
 * motivo que en el otro tool: una línea que empiece por "#" o "-" la pintaría
 * el cliente de correo como titular o lista.
 */

export type Niche = { loQueSeEntiende?: string; claro?: boolean; porQue?: string };
export type Block = { veredicto?: string; reescritura?: string };
export type Titles = { veredicto?: string; mejorTitulo?: string; peorTitulo?: string };
export type FullVerdict = {
	promesa?: Block;
	cta?: Block;
	titulares?: Titles;
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

function block(label: string, data: Block | undefined, rewriteLabel: string): string {
	const verdict = clean(data?.veredicto);
	if (!verdict) return '';
	const rewrite = clean(data?.reescritura);
	return section(label, rewrite ? `${verdict}\n\n**${rewriteLabel}:** «${rewrite}»` : verdict);
}

export function toMarkdown(
	site: string,
	m: Measurements,
	findings: Finding[],
	niche: Niche | null,
	verdict: FullVerdict | null
): string {
	const defects = findings.filter((f) => f.severity !== 'oportunidad');
	const opportunities = findings.filter((f) => f.severity === 'oportunidad');

	const line = (f: Finding) =>
		`- **${clean(f.fact)}**${f.detail ? `  \n  ${clean(f.detail)}` : ''}`;

	const parts = [
		`Esto es lo que se ve de **${site}** desde fuera.`,

		section(
			'Las cifras',
			[
				`- **${m.posts}** posts leídos (${m.freePosts} gratis, ${m.paidPosts} de pago)`,
				`- Un post cada **${m.cadenceMedianDays} días** de mediana, con huecos de ${m.cadenceMinDays} a ${m.cadenceMaxDays}`,
				`- El último, hace **${m.daysSinceLast} días**`,
				`- De ${m.wordsMin} a ${m.wordsMax} palabras por post (mediana ${m.wordsMedian})`,
				`- **${m.engagementPerPost}** reacciones y comentarios por post`,
				m.sections.length ? `- Secciones: ${m.sections.join(', ')}` : '- Sin secciones'
			].join('\n')
		),

		niche?.loQueSeEntiende
			? section(
					'El nicho',
					`${clean(niche.loQueSeEntiende)}\n\n${clean(niche.porQue)}`.trim()
				)
			: '',

		block('La promesa', verdict?.promesa, 'Yo pondría'),
		block('El botón', verdict?.cta, 'Yo pondría'),

		verdict?.titulares?.veredicto
			? section(
					'Los títulos',
					[
						clean(verdict.titulares.veredicto),
						verdict.titulares.mejorTitulo
							? `**El mejor:** «${clean(verdict.titulares.mejorTitulo)}»`
							: '',
						verdict.titulares.peorTitulo
							? `**El más flojo:** «${clean(verdict.titulares.peorTitulo)}»`
							: ''
					]
						.filter(Boolean)
						.join('\n\n')
				)
			: '',

		defects.length
			? section('Lo que hay que arreglar', defects.map(line).join('\n'))
			: section('Lo que hay que arreglar', 'Nada roto. Lo que queda son oportunidades.'),

		opportunities.length
			? section(
					'Lo que nadie está haciendo',
					opportunities.map(line).join('\n')
				)
			: '',

		verdict?.acciones?.length
			? section(
					'Por dónde empezar',
					verdict.acciones
						.slice(0, 3)
						.map((a, i) => `**${i + 1}.** ${clean(a)}`)
						.join('\n\n')
				)
			: ''
	];

	return parts.filter(Boolean).join('\n\n');
}
