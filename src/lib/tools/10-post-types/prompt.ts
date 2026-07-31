import { ANCHORS, postTypes, type PostType } from './types';
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

function indent(text: string): string {
	return text
		.split('\n')
		.map((line) => `      ${line}`)
		.join('\n');
}

/**
 * La ficha de cada tipo para el modelo: para qué sirve, cómo se hace, y hasta dos
 * muestras.
 *
 * La segunda muestra es el ancla: un post real que funcionó, en inglés y sobre otro
 * tema (ver `ANCHORS`). Solo la tienen seis de los diez tipos, y se omite sin más
 * en los otros cuatro — es mejor no tener ancla que inventarse una.
 *
 * Va en inglés a propósito y se avisa de que lo está: lo que tiene que copiar es el
 * ritmo y el esqueleto, no el idioma ni el tema.
 */
function typeSpec(list: PostType[]): string {
	return list
		.map((type) => {
			const anchor = ANCHORS[type.id];
			return [
				`- id "${type.id}" — ${type.name}`,
				`   Para qué: ${type.bestFor}`,
				`   Cómo: ${type.hint}`,
				`   Ejemplo de la forma (de OTRO tema, correr un 10K; enseña el molde, no lo copies):`,
				indent(type.example),
				anchor
					? `   Y un post REAL de este tipo que funcionó, de ${anchor.author}. Está en inglés y va de otro tema: fíjate en el esqueleto y en el ritmo —cuántas líneas, dónde respira, cómo abre y cómo remata— y escribe el tuyo en español sobre el tema del usuario. No lo traduzcas ni lo calques:\n${indent(anchor.text)}`
					: ''
			]
				.filter(Boolean)
				.join('\n');
		})
		.join('\n\n');
}

const ROLE = `Eres quien escribe los posts de redes de este negocio. Escribes en corto y directo,
como Isra Bravo: sin adornos, de tú a tú, sin emojis. Cada post lo va a publicar la persona con su
nombre, así que tiene que sonar a ella y no a un folleto.`;

const OUTPUT_SHAPE = `- Un objeto en "posts" por cada tipo pedido, en el mismo orden.
- Cada "text" es el post entero, listo para copiar y pegar en redes. Sin comillas alrededor,
  sin repetir el nombre del tipo dentro del post, sin títulos tipo "Post práctico:".
- Puedes usar saltos de línea dentro de un post. Los tipos Lista y Práctico van en líneas
  separadas, una cosa por línea, y el Meme lleva la línea de encima y debajo la que empieza
  por "Imagen:". Ningún otro markdown: nada de negrita, viñetas ni almohadillas.
- Es el mismo tema en los diez, pero cada post lo cuenta desde su ángulo. No repitas las mismas
  frases de un tipo a otro.
- Los ejemplos de cada tipo son de correr un 10K y están SOLO para que veas la forma. Escribe
  siempre sobre el tema del usuario, nunca sobre correr (salvo que correr sea de verdad su tema).
- Solo el JSON, sin explicaciones ni bloques de código.`;

/**
 * Prompt del primer paso: lee la idea que ha escrito la persona y, en la misma
 * pasada, escribe el post gratis (el primero de la lista).
 *
 * La entrada es TEXTO, no una URL. Antes se raspaba una web y de ahí se deducía
 * el tema, lo que obligaba a tener una web y a que dijera algo aprovechable. Una
 * idea escrita a mano llega más directa y sirve para quien todavía no tiene sitio.
 * La contrapartida es que puede venir en dos palabras, así que el prompt tiene que
 * saber trabajar con poco y decirlo cuando no da.
 */
export const extractPrompt = () => {
	const free = postTypes[0];

	return `${ROLE}

Recibes una idea escrita por la persona, con sus palabras. Puede venir muy suelta —dos
líneas, un tema a secas— o bien explicada, con su público y su experiencia dentro.

Haces dos cosas de una vez:

1. Ordenar la idea: cuál es el tema, a quién le habla y qué le hace distinta.
2. Escribir un post del tipo "${free.name}" sobre ese tema.

**Trabaja con lo que te dé, sin pedirle más.** Si la idea no dice a quién le habla, deduce
el público más probable de ese tema y sigue. Si no dice qué le hace distinta, usa el ángulo
que se desprenda de cómo lo ha escrito. Lo que no puedas deducir con fundamento, no lo
rellenes con adornos: es mejor un ángulo sobrio que uno inventado.

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
    "prueba": "Cifras, casos, testimonios o años que haya escrito ELLA en su idea. Cadena vacía si no hay nada."
  },
  "confidence": "alta" | "baja",
  "posts": [ { "id": "${free.id}", "text": "<el post entero>" } ]
}

Sobre "topic":
- "tema", "publico" y "angulo" los escribes tú a partir de lo que ha escrito, ordenado y en
  una frase cada uno. No le devuelvas sus mismas palabras copiadas.
- En "prueba" solo va lo que ella haya puesto: **no te inventas ni una cifra**. Si no ha dado
  ninguna, cadena vacía — y entonces los posts que necesiten prueba dejan el hueco entre
  corchetes en vez de rellenarlo.
- Pon "confidence": "baja" cuando la idea es demasiado corta o vaga para saber de qué va de
  verdad (una palabra, un saludo, algo sin tema). Haz tu mejor conjetura de todas formas.

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
