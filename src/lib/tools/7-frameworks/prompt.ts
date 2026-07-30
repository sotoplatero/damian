import { frameworks, type Framework } from './frameworks';
import { STYLE } from '$lib/tools/voice';

/** La oferta del usuario, ya sea extraída de su web o escrita a mano. */
export type Offer = {
	/** Qué vende. */
	what: string;
	/** A quién, y qué le duele. */
	who: string;
	/** Qué quiere que haga el lector. */
	action: string;
	/** Pruebas reales encontradas en la web (números, testimonios, años). Vacío si no hay. */
	proof?: string;
};

/** Reglas de estilo comunes. Lo que separa un copy que suena a persona de uno que suena a folleto. */

function frameworkSpec(list: Framework[]): string {
	return list
		.map((framework) => {
			const steps = framework.steps
				.map((step, i) => `   ${i + 1}. "${step.key}" (${step.label}): ${step.hint}`)
				.join('\n');
			return `- id "${framework.id}" — ${framework.name}\n   Se usa para: ${framework.bestFor}\n${steps}`;
		})
		.join('\n\n');
}

const ROLE = `Eres un copywriter directo, de los que venden sin adornos. Escribes como Isra Bravo:
frases cortas, cero relleno, hablando de tú a tú.`;

const OUTPUT_SHAPE = `- Un objeto en "copies" por cada framework pedido, en el mismo orden.
- Las claves de "blocks" son exactamente las que te he dado arriba. Ni una más, ni una menos.
- Cada bloque: de una a tres frases. Texto listo para copiar y pegar, sin comillas alrededor,
  sin repetir el nombre del paso dentro del texto.
- Los bloques de un mismo framework se leen seguidos como un texto único. Que encajen.
- Dos frameworks distintos no repiten las mismas frases. Cambia el ángulo de ataque en cada uno.
- Solo el JSON, sin explicaciones ni bloques de código.`;

/**
 * Prompt del primer paso: lee una página y, en la misma pasada, escribe el
 * framework gratis. Una sola llamada para leer y escribir.
 */
export const analyzePrompt = () => {
	const free = frameworks[0];

	return `${ROLE}

Recibes el texto plano de una página web. Puede ser la web de un negocio, una página
de producto, un artículo o un post. Viene sucia, con restos de menús y pies de página: ignóralos.

Haces dos cosas de una vez:

1. Averiguar qué se está vendiendo ahí y a quién.
2. Reescribirlo con el framework ${free.name}.

${STYLE}

## EL FRAMEWORK

${frameworkSpec([free])}

## FORMATO DE SALIDA

Devuelves SOLO un objeto JSON con esta forma exacta:

{
  "offer": {
    "what": "Qué vende, en una frase concreta",
    "who": "A quién y qué problema le resuelve, en una frase",
    "action": "Qué quiere que haga el lector: comprar, reservar, pedir presupuesto, suscribirse...",
    "proof": "Cifras, testimonios, años o clientes reales que aparezcan literalmente en la página. Cadena vacía si no hay nada."
  },
  "confidence": "alta" | "baja",
  "copies": [ { "id": "${free.id}", "blocks": { ... } } ]
}

Sobre "offer":
- "what", "who" y "action" los escribes tú a partir de lo que leas. No copias las frases
  de marketing de la página tal cual: la gracia es reescribirlas mejor.
- Si la página es un artículo o un post en vez de una página de venta, la "oferta" es la idea
  o el servicio que ese texto empuja, y "action" lo que busca que haga el lector.
- En "proof" solo van datos que aparezcan en la página: no te inventas ninguno. Pero lo
  escribes en español. Si la página está en inglés, traduces el dato; no lo copias tal cual.
  Si no hay nada, cadena vacía.
- Si la página no deja claro qué se vende (un login, un error, una página casi vacía),
  pon "confidence": "baja" y haz tu mejor conjetura.

Sobre "copies":
${OUTPUT_SHAPE}`;
};

/**
 * Prompt del segundo paso: la misma oferta, con los frameworks que quedan.
 * `ids` son ids de `frameworks.ts`; si se omite, van los siete.
 */
export const copyPrompt = (ids?: string[]) => {
	const selected = ids ? frameworks.filter((f) => ids.includes(f.id)) : frameworks;

	return `${ROLE}

Recibes una oferta y la escribes usando ${selected.length === 1 ? 'un framework' : `${selected.length} frameworks`} de copywriting.
Es la misma oferta cada vez: lo que cambia es el ángulo y el orden en que la cuentas.

${STYLE}

## LOS FRAMEWORKS

${frameworkSpec(selected)}

## FORMATO DE SALIDA

Devuelves SOLO un objeto JSON con esta forma exacta:

{
  "copies": [
    {
      "id": "<el id del framework>",
      "blocks": { "<key del paso>": "<el texto de ese paso>", ... }
    }
  ]
}

${OUTPUT_SHAPE}`;
};

/** El mensaje de usuario: la oferta, formateada para el modelo. */
export function offerMessage(offer: Offer): string {
	const proof = offer.proof?.trim()
		? offer.proof.trim()
		: '(no hay ninguna prueba real disponible — usa huecos entre corchetes)';

	return `Oferta a escribir:

- Qué vende: ${offer.what}
- A quién y qué le duele: ${offer.who}
- Qué quiere que haga el lector: ${offer.action}
- Pruebas reales disponibles: ${proof}`;
}
