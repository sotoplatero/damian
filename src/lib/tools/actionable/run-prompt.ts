/**
 * What runs when somebody actually uses a generated tool.
 *
 * The spec is data written by a model and edited by a visitor, and here it
 * becomes instructions for another model. That is a prompt injection surface
 * with a bow on it, so two things hold:
 *
 *  - The spec's text goes into `input`, never into `instructions`. The role and
 *    the rules are ours and sit in a place the payload can't reach.
 *  - The answer comes back through a strict schema, so the worst a poisoned
 *    rule can do is make the results bad — not make the endpoint return
 *    something else, and not turn this into a free general-purpose model for
 *    whoever crafts a link. The signature in `actionable-link.ts` is what stops
 *    the crafted link in the first place; this is the second lock.
 */
import { STYLE } from '$lib/tools/voice';
import type { JsonSchema } from '$lib/server/openai';
import { answersMessage, type Answers, type Spec } from './spec';

export function runPrompt(): string {
	return `Ejecutas una herramienta. Alguien ha rellenado un formulario corto y espera un resultado que pueda usar hoy.

Recibes las reglas de la herramienta y lo que ha escrito la persona. Aplicas las reglas a SU material: no explicas las reglas, no las repites, no cuentas lo que vas a hacer. Devuelves el trabajo hecho.

- Cada resultado tiene que ser usable tal cual, copiado y pegado. Nada de plantillas a medio rellenar ni de "aquí podrías poner...".
- Los resultados se diferencian entre sí de verdad. Diez veces lo mismo con otras palabras es un fallo.
- Todo lo que ha escrito la persona tiene que notarse en lo que sale. Si un dato suyo no cambia nada, no lo has usado.
- Si lo que ha puesto es tan poco que no da para trabajar, haces lo que puedas con ello y no te lo inventas.

${STYLE}`;
}

export function runSchema(): JsonSchema {
	return {
		name: 'resultados',
		strict: true,
		schema: {
			type: 'object',
			additionalProperties: false,
			required: ['resultados'],
			properties: {
				resultados: {
					type: 'array',
					items: {
						type: 'object',
						additionalProperties: false,
						required: ['texto', 'nota'],
						properties: {
							texto: { type: 'string', description: 'El resultado, listo para copiar. Sin comillas alrededor ni encabezados.' },
							nota: { type: 'string', description: 'Muy corto: en qué se diferencia este de los demás. Cadena vacía si no aporta nada.' }
						}
					}
				}
			}
		}
	};
}

/** The spec and the form, as data — never as instructions. */
export function runMessage(spec: Spec, answers: Answers): string {
	return [
		`Herramienta: ${spec.nombre}`,
		`Qué hace: ${spec.queHace}`,
		`\nReglas que tienes que aplicar:\n- ${spec.reglas.join('\n- ')}`,
		`\nDevuelve exactamente ${spec.cuantos} resultados.`,
		spec.variedad ? `Se diferencian así: ${spec.variedad}` : '',
		`\n${answersMessage(spec, answers)}`
	]
		.filter(Boolean)
		.join('\n');
}

export type Result = { texto: string; nota: string };

/** Reads the results, or `null` if the count is wrong or anything came back empty. */
export function readResults(raw: unknown, expected: number): Result[] | null {
	const list = (raw as { resultados?: unknown })?.resultados;
	if (!Array.isArray(list)) return null;
	const results = list
		.map((item) => {
			if (!item || typeof item !== 'object') return null;
			const { texto, nota } = item as Record<string, unknown>;
			const body = typeof texto === 'string' ? texto.trim().slice(0, 2000) : '';
			return body ? { texto: body, nota: typeof nota === 'string' ? nota.trim().slice(0, 120) : '' } : null;
		})
		.filter((item): item is Result => item !== null);
	// One short is a truncated answer, and showing four where the tool promised
	// five is the kind of quiet shortfall nobody reports and everybody notices.
	return results.length === expected ? results : null;
}
