/**
 * Turning a judged page into a spec: the plan the visitor gets to correct.
 *
 * IT IS WRITTEN FOR SOMEBODY WHO WILL EDIT IT. That is the whole point of the
 * step — the brief says never go from URL straight to finished tool, because
 * people need to see and fix the interpretation before committing, and because
 * a plan nobody can touch is a slot machine with extra clicks. So every part of
 * it is phrased as a claim the visitor can disagree with: this is what I'd ask
 * you for, this is why each answer matters, this is what comes back.
 *
 * The judgment is handed over as input rather than re-derived. It already
 * named the task, enumerated the rules and defended the four axes; asking a
 * second call to work that out again would let the two disagree, and the
 * visitor would have read the first one.
 */
import { STYLE } from '$lib/tools/voice';
import type { JsonSchema } from '$lib/server/openai';
import { FIELD_TYPES, MAX_FIELDS, MIN_FIELDS } from './spec';
import type { Judgment } from './judgment';

export function planPrompt(): string {
	return `Conviertes un artículo ya juzgado en el plan de un generador: un formulario corto y lo que devuelve.

Solo generadores. Entra lo que escribe la persona, sale texto escrito para ella.

## EL FORMULARIO

Entre ${MIN_FIELDS} y ${MAX_FIELDS} campos. Ni uno más: cada campo que añades es una excusa más para cerrar la pestaña.

Un campo solo entra si **cambia lo que sale**. Por cada uno escribes \`cambia\`: qué es distinto en el resultado según lo que se ponga ahí. Si lo único que sabes escribir es "da contexto" o "personaliza el resultado", ese campo sobra: quítalo.

De cada campo:

- \`etiqueta\`: lo que se lee encima, corto y en cristiano. "Sobre qué escribes", no "Input temático".
- \`ayuda\`: un ejemplo de respuesta de verdad, no la etiqueta otra vez. Mal: "Escribe tu tema". Bien: "cómo dejé de perseguir clientes por WhatsApp".
- \`tipo\`: ${FIELD_TYPES.map((type) => `\`${type}\``).join(', ')}. \`parrafo\` solo si de verdad hace falta más de una línea. \`opcion\` solo cuando las salidas sean pocas y cerradas de verdad, y entonces trae entre dos y seis \`opciones\`.

## LO QUE DEVUELVE

- \`cuantos\`: cuántos resultados. Entre tres y diez. Suficientes para elegir, no tantos como para no leerlos.
- \`variedad\`: en qué se diferencian entre sí. Esto es lo que evita que salga diez veces lo mismo con otras palabras. Que sea concreto: por ángulo, por longitud, por a quién le habla.

## LAS REGLAS

\`reglas\`: el procedimiento del artículo, **con tus palabras**, para que quien ejecute esto lo aplique sin haber leído la página.

**No copias ni una frase del original.** El procedimiento no es de nadie; sus frases sí. Y si lo reescribes de verdad, se nota en el resultado: obliga a haberlo entendido en lugar de recolocarlo.

Entre dos y diez reglas. Que digan qué hacer, no de qué va el artículo.

## EL NOMBRE

\`nombre\`: cómo se llama la herramienta, dicho por lo que hace. "Titulares para tu próximo post" antes que "Generador de titulares magnéticos con IA".

${STYLE}`;
}

export function planSchema(): JsonSchema {
	return {
		name: 'plan',
		strict: true,
		schema: {
			type: 'object',
			additionalProperties: false,
			required: ['nombre', 'queHace', 'campos', 'reglas', 'cuantos', 'variedad'],
			properties: {
				nombre: { type: 'string' },
				queHace: { type: 'string', description: 'Una frase: qué te pide y qué te devuelve.' },
				campos: {
					type: 'array',
					items: {
						type: 'object',
						additionalProperties: false,
						required: ['etiqueta', 'ayuda', 'tipo', 'opciones', 'cambia'],
						properties: {
							etiqueta: { type: 'string' },
							ayuda: { type: 'string', description: 'Un ejemplo de respuesta real, no la etiqueta otra vez.' },
							tipo: { type: 'string', enum: [...FIELD_TYPES] },
							opciones: { type: 'array', items: { type: 'string' }, description: 'Solo si tipo es opcion. Entre dos y seis. Vacío en los demás casos.' },
							cambia: { type: 'string', description: 'Qué cambia en el resultado según lo que se ponga aquí.' }
						}
					}
				},
				reglas: { type: 'array', items: { type: 'string' }, description: 'El procedimiento con tus palabras. Ni una frase copiada del original.' },
				cuantos: { type: 'integer' },
				variedad: { type: 'string' }
			}
		}
	};
}

/** The judged page, as the model sees it when it draws up the plan. */
export function planMessage(judgment: Judgment, page: { finalUrl: string; title: string; text: string }): string {
	return [
		`URL: ${page.finalUrl}`,
		`Título: ${page.title}`,
		`Tarea de quien lo lee: ${judgment.tarea}`,
		`Lo que ya se decidió que sería: ${judgment.queHace}`,
		judgment.pasos.length ? `Pasos y reglas que trae la página:\n- ${judgment.pasos.join('\n- ')}` : '',
		`\nTexto del artículo:\n${page.text}`
	]
		.filter(Boolean)
		.join('\n');
}
