import { postTypes, type PostType } from './types';
import { STYLE } from '$lib/tools/voice';

/** El tema del usuario, sacado de su web o de lo que escriba. */
export type Topic = {
	/** De qué va su contenido: su tema, su especialidad. */
	tema: string;
	/** A quién le habla y qué le duele o quiere. */
	publico: string;
	/** Lo que le hace distinto: su punto de vista, su experiencia. Para el meme y el post a contracorriente. */
	angulo: string;
	/** Cifras, casos o testimonios reales que aparezcan en la web. Vacío si no hay. */
	prueba?: string;
};

function typeSpec(list: PostType[]): string {
	return list
		.map((type) => `- id "${type.id}" — ${type.name}\n   Para qué: ${type.bestFor}\n   Cómo: ${type.hint}`)
		.join('\n\n');
}

const ROLE = `Eres quien escribe los posts de redes de este negocio. Escribes en corto y directo,
como Isra Bravo: sin adornos, de tú a tú, sin emojis. Cada post lo va a publicar la persona con su
nombre, así que tiene que sonar a ella y no a un folleto.`;

const OUTPUT_SHAPE = `- Un objeto en "posts" por cada tipo pedido, en el mismo orden.
- Cada "text" es el post entero, listo para copiar y pegar en redes. Sin comillas alrededor,
  sin repetir el nombre del tipo dentro del post, sin títulos tipo "Post práctico:".
- Puedes usar saltos de línea dentro de un post. Los tipos Lista y Práctico van en líneas
  separadas, una cosa por línea. Ningún otro markdown: nada de negrita, viñetas ni almohadillas.
- Es el mismo tema en los diez, pero cada post lo cuenta desde su ángulo. No repitas las mismas
  frases de un tipo a otro.
- Solo el JSON, sin explicaciones ni bloques de código.`;

/**
 * Prompt del primer paso: lee una página y, en la misma pasada, escribe el post
 * gratis (el primero de la lista). Una sola llamada para leer y escribir.
 */
export const extractPrompt = () => {
	const free = postTypes[0];

	return `${ROLE}

Recibes el texto plano de una página web. Puede ser la web de un negocio, una newsletter,
una página de producto, un artículo o un post. Viene sucia, con restos de menús y pies de
página: ignóralos.

Haces dos cosas de una vez:

1. Averiguar de qué va: cuál es el tema de esa persona, a quién le habla y qué le hace distinta.
2. Escribir un post del tipo "${free.name}" sobre ese tema.

${STYLE}

## EL TIPO DE POST QUE ESCRIBES AHORA

${typeSpec([free])}

## FORMATO DE SALIDA

Devuelves SOLO un objeto JSON con esta forma exacta:

{
  "topic": {
    "tema": "De qué va su contenido, su especialidad, en una frase",
    "publico": "A quién le habla y qué le duele o quiere, en una frase",
    "angulo": "Lo que le hace distinto: su punto de vista, su experiencia, su forma de verlo",
    "prueba": "Cifras, casos, testimonios, años o clientes reales que aparezcan literalmente en la página. Cadena vacía si no hay nada."
  },
  "confidence": "alta" | "baja",
  "posts": [ { "id": "${free.id}", "text": "<el post entero>" } ]
}

Sobre "topic":
- "tema", "publico" y "angulo" los escribes tú a partir de lo que leas. No copias sus frases
  de marketing tal cual.
- En "prueba" solo van datos que aparezcan en la página: no te inventas ninguno. Pero lo
  escribes en español. Si la página está en inglés, traduces el dato; no lo copias tal cual.
  Si no hay nada, cadena vacía.
- Si la página no deja claro de qué va (un login, un error, una página casi vacía),
  pon "confidence": "baja" y haz tu mejor conjetura.

Sobre "posts":
${OUTPUT_SHAPE}`;
};

/**
 * Prompt del segundo paso: el mismo tema, con los tipos que quedan.
 * `ids` son ids de `types.ts`; si se omite, van los diez.
 */
export const writePrompt = (ids?: string[]) => {
	const selected = ids ? postTypes.filter((type) => ids.includes(type.id)) : postTypes;

	return `${ROLE}

Recibes un tema y escribes ${selected.length === 1 ? 'un post' : `${selected.length} posts`} de redes sobre él.
Es el mismo tema cada vez: lo que cambia es el tipo de post y el ángulo desde el que lo cuentas.

${STYLE}

## LOS TIPOS DE POST

${typeSpec(selected)}

## FORMATO DE SALIDA

Devuelves SOLO un objeto JSON con esta forma exacta:

{
  "posts": [
    { "id": "<el id del tipo>", "text": "<el post entero>" }
  ]
}

${OUTPUT_SHAPE}`;
};

/** El mensaje de usuario: el tema, formateado para el modelo. */
export function topicMessage(topic: Topic): string {
	const prueba = topic.prueba?.trim()
		? topic.prueba.trim()
		: '(no hay ninguna prueba real disponible — usa huecos entre corchetes donde haga falta)';

	return `Tema sobre el que escribir:

- De qué va: ${topic.tema}
- A quién le habla y qué le duele: ${topic.publico}
- Lo que le hace distinto: ${topic.angulo}
- Pruebas reales disponibles: ${prueba}`;
}
