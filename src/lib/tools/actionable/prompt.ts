/**
 * What the model is asked, and the exact shape it may answer in.
 *
 * TWO THINGS THIS PROMPT DELIBERATELY DOES NOT DO.
 *
 * It does not name examples of convertible pages. The newsletter audit was
 * tuned until one known finding appeared and ended up overfitted to a single
 * publication; hinting "pages like six hook formulas convert" buys the same
 * failure here, and this tool is nothing but its judgment.
 *
 * It does not ask for the verdict. Four axes, defended one by one with a
 * literal quote, and the bucket is arithmetic in `judgment.ts`.
 */
import { STYLE } from '$lib/tools/voice';
import type { JsonSchema } from '$lib/server/openai';
import { AXES, SHAPES } from './judgment';

/**
 * The two places this tool departs from the shared voice, and why.
 *
 * `STYLE` was written for a model rewriting somebody's offer in their name, so
 * it forbids saying "the article" and demands everything be translated into
 * Spanish. Neither fits here: this text explains a judgment ABOUT a page to
 * someone who may not have written it, and the quote is evidence — translate it
 * and it stops being verifiable, because `verifyQuote` compares it against the
 * page as downloaded.
 */
const EXCEPTIONS = `## EXCEPCIONES PARA ESTE TRABAJO

- Aquí no escribes el copy de nadie: explicas un juicio sobre una página. Puedes
  decir "esta página", "el texto", "lo que cuenta". Sigue estando prohibido sonar
  a máquina y sigue en pie la lista de palabras prohibidas.
- **La cita va literal y en el idioma del original.** No la traduces, no la
  arreglas, no la recortas por la mitad de una palabra. Se comprueba carácter a
  carácter contra la página: una cita retocada se cuenta como que no existe, y el
  eje que se apoyaba en ella cae.`;

export function judgePrompt(): string {
	return `Eres quien decide si una página publicada puede convertirse en una herramienta que alguien use de verdad, o si no puede.

Tu trabajo NO es convertir. Es decidir. Convertir lo que no se deja produce basura, y un "esto no da para herramienta, y te digo por qué" bien razonado vale más que una herramienta mediocre.

**La mayoría de las páginas de internet no dan para herramienta, y eso es lo normal.** Un ensayo, una historia con moraleja, una noticia, una definición, una portada o la página de un producto son textos buenos que no se ejecutan. Ante la duda, dices que no: equivocarte diciendo que sí produce un formulario que escupe un párrafo, y eso es peor que nada.

## PRIMERO, LA TAREA

Antes de juzgar nada, nombra la tarea concreta que hace la persona que lee esta página, en verbo más objeto: "escribir el titular de un post", "poner precio a un plan", "responder a un cliente enfadado".

Y contesta aparte, en \`tareaDeTrabajo\`, si esa tarea es de su TRABAJO y se hace sobre un material que ella produce o gestiona: un texto, un titular, un precio, una campaña, un cliente, un correo.

Su vida, su carrera, sus decisiones importantes y su forma de pensar NO son materiales, por muchos criterios que dé la página sobre ellos. Quien usa esto publica cosas y tiene trabajo pendiente esta semana; un texto sobre cómo vivir puede ser mejor que cualquier how-to y aun así no es de aquí.

## SEGUNDO, LOS PASOS

Escribe los pasos, reglas o criterios que la página enumera de verdad, uno por línea, con tus palabras. Solo los que están ahí. Si la página no enumera ninguno, o solo puedes sacar uno, devuelve la lista vacía o con ese uno: no rellenes.

Esta lista es la prueba de que hay un procedimiento. Si te cuesta escribirla, ya sabes lo que hay.

## LOS CUATRO EJES

Juzgas cuatro cosas por separado. Cada una se sostiene o no se sostiene por su cuenta; no las promedias ni dejas que una arrastre a las otras.

**procedimental** — ¿la página le dice a alguien QUÉ HACER con un material suyo, con reglas o criterios que se pueden enumerar?

No hace falta un método cerrado de principio a fin: seis fórmulas, o diez criterios para juzgar un titular, son un procedimiento de sobra. Lo que hace falta es que se apliquen a algo que la persona trae.

No cuentan, por mucho que lo parezcan: describir lo que existe o lo que hace un producto —eso es catálogo, no instrucción—, una forma de pensar, la moraleja de una historia, una definición, ejemplos sin el molde que los produce, o consejos sueltos del tipo "sé constante". Hablar de un método no es traerlo.

**parametrizable** — ¿hay entradas concretas que puedas nombrar, y el resultado cambia según lo que se ponga en ellas?

Que cada lector "lo aplique a su caso" no es esto. Tiene que haber datos que la persona escribe —su tema, su público, su precio, su texto— y una salida que sale distinta por escribirlos.

**repetido** — ¿esto le vuelve a tocar? Semanas o meses, no años. Una decisión que se toma una vez en la vida, por importante que sea, es una mala herramienta.

**tedioso** — ¿hacerlo a mano cuesta algo de verdad? Volumen, pesadez, o tener que sostener muchos criterios a la vez. "Da que pensar" no es coste. Si se resuelve a mano en treinta segundos, la herramienta no aporta nada.

Para cada eje devuelves:

- \`pasa\`: true o false.
- \`motivo\`: una o dos frases. Concretas, sobre ESTA página. "No es procedimental" no es un motivo; "cuenta cómo le fue a él, y no dice qué hacer" sí.
- \`cita\`: si \`pasa\` es true, un fragmento LITERAL de la página que lo demuestre, de quince caracteres para arriba. Copiado, no reescrito. Si \`pasa\` es false, cadena vacía.

Un eje que no puedas demostrar con una cita literal es un eje que no pasa. No fuerces una cita que no dice lo que necesitas.

## LO QUE HACE, Y SOLO DESPUÉS LA FORMA

\`queHace\`: una frase en cristiano, para alguien que no ha leído nada de esto, diciendo QUÉ LE PIDE a la persona y QUÉ LE DEVUELVE. Sin jerga: nada de "extracción", "clasificación" ni "arquetipo". Si no hay herramienta posible, di en una frase por qué esta página se queda en lectura.

\`forma\`: **la decide lo que SALE de la herramienta, no de qué habla la página.** Casi todo lo que juzgas está escrito como una guía; eso no hace que la herramienta sea una \`guia\`.

- \`generador\`: sale texto escrito para la persona. Titulares, asuntos, pies de foto, guiones.
- \`calculadora\`: sale un número, por una cuenta.
- \`corrector\`: la persona pega algo suyo y sale un juicio sobre ello.
- \`checklist\`: sale un proceso en orden que recuerda por dónde va.
- \`guia\`: salen preguntas que se ramifican y acaban en una recomendación. Solo si la decisión de verdad se bifurca.
- \`plantilla\`: sale un documento con formato, relleno con lo suyo.

Eliges la que le corresponde, no la que crees que queremos. Una página de fórmulas para escribir algo es un \`generador\`, aunque el artículo sea una guía. Una página sobre errores típicos casi nunca es un generador. Una página sobre cómo poner precio no es un generador. Equivocarse aquí es la forma más común de acabar con algo que funciona y no sirve para nada.

## Y LO ÚLTIMO

\`masCercano\`: si esta página no da para herramienta, o da para una floja, qué es lo más parecido que SÍ funcionaría —aunque sea otra cosa distinta de lo que pide el texto—. Si no hay nada, cadena vacía. No te lo inventes por quedar bien.

${STYLE}

${EXCEPTIONS}`;
}

/**
 * The strict schema.
 *
 * THE ORDER OF THE PROPERTIES IS THE ORDER IT THINKS IN. A model writes the JSON
 * front to back, so every field it fills in later is written knowing what it
 * already committed to. That is why `tarea` and `pasos` come before the axes —
 * enumerating the procedure first is what stops an essay from being called
 * procedural — and why `queHace` comes before `forma`: naming what comes out of
 * the tool first, and only then labelling it, is what stopped nearly every page
 * from being filed as a `guia`.
 *
 * `axes` is a plain array because the strict subset has no `minItems`; that the
 * four ids arrive exactly once each is checked by `readAxes`.
 */
export function judgeSchema(): JsonSchema {
	return {
		name: 'juicio',
		strict: true,
		schema: {
			type: 'object',
			additionalProperties: false,
			required: ['tarea', 'tareaDeTrabajo', 'pasos', 'axes', 'queHace', 'forma', 'masCercano'],
			properties: {
				tarea: { type: 'string', description: 'La tarea de la persona que lee, en verbo más objeto.' },
				tareaDeTrabajo: {
					type: 'boolean',
					description:
						'¿Es una tarea de su trabajo, sobre un material que ella produce o gestiona (un texto, un precio, una campaña, un cliente)? Su vida, su carrera o su forma de pensar NO son materiales.'
				},
				pasos: {
					type: 'array',
					items: { type: 'string' },
					description: 'Los pasos, reglas o criterios que la página enumera de verdad. Vacío si no enumera ninguno.'
				},
				axes: {
					type: 'array',
					items: {
						type: 'object',
						additionalProperties: false,
						required: ['id', 'pasa', 'motivo', 'cita'],
						properties: {
							id: { type: 'string', enum: [...AXES] },
							pasa: { type: 'boolean' },
							motivo: { type: 'string', description: 'Una o dos frases, en español, sobre esta página en concreto.' },
							// Where this instruction actually lands. In the prompt alone it
							// lost against the shared voice, which orders everything
							// translated into Spanish: on English pages the model handed
							// back beautiful Spanish translations, all four quotes failed
							// verification at once, and good how-tos came out refused.
							cita: {
								type: 'string',
								description:
									'Copiado y pegado de la página, EN SU IDIOMA ORIGINAL. Si la página está en inglés, la cita va en inglés. No traducir, no corregir, no acortar por dentro. Vacío si el eje no pasa.'
							}
						}
					}
				},
				queHace: { type: 'string' },
				forma: { type: 'string', enum: [...SHAPES] },
				masCercano: { type: 'string' }
			}
		}
	};
}

/** The page, as the model sees it. */
export function pageMessage(page: { finalUrl: string; title: string; description: string; text: string }): string {
	return `URL: ${page.finalUrl}\nTítulo: ${page.title}\nMeta descripción: ${page.description}\n\nTexto de la página:\n${page.text}`;
}
