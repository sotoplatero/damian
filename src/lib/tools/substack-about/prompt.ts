import { STYLE } from '$lib/tools/voice';
import type { JsonSchema } from '$lib/server/openai';

export type AboutFinding = {
	criterion: string;
	status: 'bien' | 'flojo' | 'falta';
	evidence: string;
	fix: string;
};

export type AboutAudit = {
	diagnosis: { topic: string; reader: string; benefit: string; verdict: string };
	findings: AboutFinding[];
	rewrite: {
		promise: string;
		intro: string;
		benefits: string[];
		proof: string;
		expectations: string;
		cta: string;
	};
};

export function aboutSchema(): JsonSchema {
	return {
		name: 'substack_about_audit',
		strict: true,
		schema: {
			type: 'object', additionalProperties: false,
			required: ['diagnosis', 'findings', 'rewrite'],
			properties: {
				diagnosis: {
					type: 'object', additionalProperties: false,
					required: ['topic', 'reader', 'benefit', 'verdict'],
					properties: {
						topic: { type: 'string' }, reader: { type: 'string' },
						benefit: { type: 'string' }, verdict: { type: 'string' }
					}
				},
				findings: {
					type: 'array', minItems: 5, maxItems: 5,
					items: {
						type: 'object', additionalProperties: false,
						required: ['criterion', 'status', 'evidence', 'fix'],
						properties: {
							criterion: { type: 'string' }, status: { type: 'string', enum: ['bien', 'flojo', 'falta'] },
							evidence: { type: 'string' }, fix: { type: 'string' }
						}
					}
				},
				rewrite: {
					type: 'object', additionalProperties: false,
					required: ['promise', 'intro', 'benefits', 'proof', 'expectations', 'cta'],
					properties: {
						promise: { type: 'string' }, intro: { type: 'string' },
						benefits: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'string' } },
						proof: { type: 'string' }, expectations: { type: 'string' }, cta: { type: 'string' }
					}
				}
			}
		}
	};
}

export function aboutPrompt(): string {
	return `Eres editor de newsletters. Audita una página Acerca de pública y reescríbela en español.

Evalúa exactamente cinco criterios y devuélvelos en este orden: claridad (de qué va), lector (para quién), beneficio (qué gana), credibilidad (por qué creer al autor) y conversión (qué recibe, frecuencia y llamada a suscribirse).

La evidencia debe ser una cita literal breve de la página. Si algo falta, escribe "No aparece". No inventes testimonios, cifras, frecuencia, experiencia ni enlaces. En la reescritura conserva los hechos presentes; usa [añade aquí…] cuando falte una prueba. La promesa debe entenderse sola. La introducción presenta al autor sin convertirla en currículum. Los beneficios empiezan con verbos o resultados. La prueba utiliza solo evidencia real. Expectations dice formato y frecuencia solo si aparecen. La CTA debe decir por qué suscribirse, no solo "suscríbete".

Fuentes editoriales del criterio: guía pública de Toni Herrera; criterios complementarios de Roberto y Veronica Llorca-Smith, David del Directorio de Substack, Alba García Marcos y Víctor Millán.

${STYLE}`;
}

export function aboutInput(page: { title: string; description: string; text: string; finalUrl: string }): string {
	return `URL: ${page.finalUrl}\nTítulo: ${page.title}\nDescripción: ${page.description}\n\nPágina Acerca de:\n${page.text}`;
}
