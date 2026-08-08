import type { JsonSchema } from '$lib/server/openai';
import { formats, freeFormats, NOTE_MAX_CHARS, type NoteFormat } from './formats';
import { REPURPOSE_STYLE } from './style';

/**
 * The shape of a set of notes, as a strict schema.
 *
 * ASKING FOR `ancla` IN PROSE WAS NOT ENOUGH, and it cost a production
 * incident. The model returned valid JSON with the field missing,
 * `readExactPieces` rejected the set, and the endpoint burned a second model
 * call retrying — which is what pushed it past the function's time limit.
 *
 * `src/lib/server/openai.ts` exists for exactly this: `text.format` takes a
 * strict schema, so the model cannot hand back a shape we didn't ask for. The
 * repo already learned this once — "with json_object the JSON was valid but the
 * shape wasn't guaranteed, and sections vanished from reports in silence".
 *
 * `ids` pins the count and lets the enum name the ids, so a set with four notes
 * or an invented id never leaves the API.
 */
function piecesSchema(ids: readonly string[]) {
	return {
		type: 'array',
		minItems: ids.length,
		maxItems: ids.length,
		items: {
			type: 'object',
			additionalProperties: false,
			required: ['id', 'text', 'ancla'],
			properties: {
				id: { type: 'string', enum: [...ids] },
				text: { type: 'string' },
				ancla: { type: 'string' }
			}
		}
	};
}

const STRINGS = { type: 'array', items: { type: 'string' } };

export function extractSchema(): JsonSchema {
	return {
		name: 'repurpose_extract',
		strict: true,
		schema: {
			type: 'object',
			additionalProperties: false,
			required: ['article', 'confidence', 'pieces'],
			properties: {
				article: {
					type: 'object',
					additionalProperties: false,
					required: ['tema', 'tesis', 'publico', 'ideas', 'pruebas', 'escenas', 'tensiones', 'frase', 'voz'],
					properties: {
						tema: { type: 'string' }, tesis: { type: 'string' }, publico: { type: 'string' },
						ideas: STRINGS, pruebas: STRINGS, escenas: STRINGS, tensiones: STRINGS,
						frase: { type: 'string' }, voz: { type: 'string' }
					}
				},
				confidence: { type: 'string', enum: ['alta', 'baja'] },
				pieces: piecesSchema(freeFormats.map(({ id }) => id))
			}
		}
	};
}

export function writeSchema(ids: readonly string[]): JsonSchema {
	return {
		name: 'repurpose_write',
		strict: true,
		schema: {
			type: 'object',
			additionalProperties: false,
			required: ['pieces', 'orden'],
			properties: { pieces: piecesSchema(ids), orden: STRINGS }
		}
	};
}

export type ArticleAnalysis = {
	tema: string;
	tesis: string;
	publico: string;
	ideas: string[];
	pruebas: string[];
	escenas: string[];
	/**
	 * What the article sets up and never closes.
	 *
	 * The four `mas-alla` notes anchor to these, one each. Without the field,
	 * "go past the article" is an invitation to wander: the model has material
	 * (`pruebas`, `escenas`) but nothing telling it where the article is unfinished.
	 * Naming the tension first is the method the 75 hook formulas already use.
	 */
	tensiones: string[];
	frase: string;
	voz: string;
};

function indent(text: string): string {
	return text.split('\n').map((line) => `      ${line}`).join('\n');
}

const ANCHOR_SLOT: Record<NoteFormat['anchor'], string> = {
	prueba: 'una de las PRUEBAS',
	escena: 'una de las ESCENAS',
	frase: 'la FRASE literal verificada',
	tension: 'una de las TENSIONES'
};

export function formatSpec(list: NoteFormat[]): string {
	return list.map((format) => [
		`- id "${format.id}" — ${format.name}`,
		`   Para qué: ${format.bestFor}`,
		`   Ancla: ${ANCHOR_SLOT[format.anchor]}`,
		`   Criterio: ${format.hint}`,
		'   Ejemplo de la forma (otro tema; no copies el asunto):',
		indent(format.example)
	].join('\n')).join('\n\n');
}

const ROLE = `Distribuyes un artículo mediante notas breves. Cada nota se sostiene sola: quien la lee se lleva algo aunque no haga clic en nada.`;

/**
 * The rule that ended the generic output.
 *
 * The old prompt asked for "la tesis", "una implicación", "una acción" — general
 * nouns — and got general notes back while the analysis sat there holding
 * figures, names and scenes. Now every note has to hand back the exact material
 * it used, and the server checks that the material survives into the text.
 */
const ANCHOR_RULES = `## CADA NOTA SE APOYA EN UN MATERIAL DISTINTO

Cada nota devuelve "ancla": el material exacto del análisis sobre el que está construida, copiado de él tal cual.

- Las nueve anclas son DISTINTAS. Dos notas sobre el mismo material es una entrega inválida.
- El ancla sale del análisis. No la inventes ni la reformules hasta que deje de reconocerse.
- "cifra": ancla en un material que tenga NÚMEROS y escríbelos con sus dígitos dentro de la nota. "Muy barato" no es una cifra y "la mayoría" no es un dato.
- "caso": ancla en un material que tenga NOMBRE PROPIO —una persona, un negocio, un sitio, una herramienta— y escríbelo dentro de la nota. "Un negocio local" no es un nombre. Si el artículo no tiene ningún ejemplo con nombre, elige el ejemplo más concreto que haya y no te inventes uno.
- En las notas ancladas a una TENSIÓN, no repitas la tensión: resuélvela, discútela o llévala más lejos.

**LA NOTA NO ES EL MATERIAL. Es lo que haces con él.** Copiar el ancla y devolverla como nota es una entrega inválida, aunque cumpla todo lo anterior. Una cifra sin lo que esa cifra deja ver no es una nota. Una frase citada sin nada tuyo alrededor tampoco. Y dos notas no pueden decir lo mismo con otras palabras ni, mucho menos, con las mismas.`;

const RULES = `Cada nota tiene como máximo ${NOTE_MAX_CHARS} caracteres, contando espacios, saltos y URL. Elige libremente su longitud y estructura: puede ser una frase o varios párrafos breves, pero nunca un artículo ni un resumen completo. No repitas una idea cambiando palabras. Sin markdown, títulos, etiquetas de plataforma, emojis ni hashtags.

Sobre el enlace: decide en cada nota si ayuda. No hay ninguna obligación de incluirlo y una nota con enlace llega a menos gente, así que ponlo solo donde la nota lo pida. Si lo pones, la nota tiene que seguir valiendo sin él. Nunca uses una URL que no sea la del artículo.

No inventes cifras, fechas, casos, experiencias, resultados, citas ni posiciones del autor. Lo que sí puedes hacer, y debes, es RAZONAR sobre lo que hay.`;

export const extractPrompt = () => `${ROLE}

Recibes el artículo completo. Ignora navegación, cabecera y pie. Analiza su contenido y su voz, y escribe ${freeFormats.map((format) => `"${format.id}"`).join(', ')}.

${REPURPOSE_STYLE}

## NOTAS QUE ESCRIBES AHORA
${formatSpec(freeFormats)}

${ANCHOR_RULES}

## FORMATO DE SALIDA
{"article":{"tema":"","tesis":"","publico":"","ideas":[""],"pruebas":[""],"escenas":[""],"tensiones":[""],"frase":"","voz":""},"confidence":"alta | baja","pieces":[{"id":"","text":"","ancla":""}]}

Pruebas: cifras, nombres propios, ejemplos concretos y resultados que aparezcan en el texto, cada uno con el dato al lado. Escenas: momentos narrados, con su sitio y lo que se hizo. Tensiones: lo que el artículo plantea y NO cierra —una objeción que no responde, una consecuencia que no desarrolla, a quién deja fuera, una pregunta que abre y no contesta—. Saca al menos cuatro tensiones distintas y escríbelas como afirmaciones, no como títulos.

La frase se copia carácter a carácter, sin comillas, completa y con al menos quince caracteres. Si no existe, cadena vacía. Ideas, pruebas y escenas solo contienen material sustentado por el texto. Confidence es baja si no parece un artículo completo.

${RULES}
Devuelve solo JSON.`;

export const writePrompt = (ids: readonly string[]) => {
	const selected = formats.filter((format) => ids.includes(format.id));
	return `${ROLE}

Recibes un artículo ya analizado. Escribe las ${selected.length} notas que van MÁS ALLÁ del artículo y una orientación breve para alternarlas, sin días ni calendario.

Estas notas no resumen el artículo: piensan a partir de él. Cada una toma una tensión que el texto deja abierta y va a donde el texto no fue. Todo lo que digas tiene que poder defenderse con el artículo delante, pero no puede estar ya escrito en él. Si una nota se puede sustituir por una frase del artículo, está mal.

${REPURPOSE_STYLE}

## NOTAS QUE ESCRIBES AHORA
${formatSpec(selected)}

${ANCHOR_RULES}

## FORMATO DE SALIDA
{"pieces":[{"id":"","text":"","ancla":""}],"orden":["orientación breve"]}

${RULES}
La cita comentada, si te toca escribirla, debe contener la frase verificada si existe; si no existe, parafrasea sin comillas. Devuelve solo JSON.`;
};

export function articleMessage(article: ArticleAnalysis, sourceUrl: string): string {
	const lines = (items: string[]) => items.length ? items.map((item) => `  - ${item}`).join('\n') : '  - (ninguna)';
	return `Artículo sobre el que escribir:

- Tema: ${article.tema}
- Tesis: ${article.tesis}
- Público: ${article.publico}
- Voz detectada: ${article.voz}
- Ideas secundarias:\n${lines(article.ideas)}
- Pruebas reales:\n${lines(article.pruebas)}
- Escenas disponibles:\n${lines(article.escenas)}
- Tensiones abiertas:\n${lines(article.tensiones)}
- Frase literal verificada: ${article.frase ? `«${article.frase}»` : '(ninguna: parafrasea sin comillas)'}
- URL final: ${sourceUrl}`;
}
