import { env } from '$env/dynamic/private';

/**
 * El cliente de OpenAI que usan los dos tools.
 *
 * Va por `/v1/responses` y no por `/v1/chat/completions`. El motivo no es que
 * sea la nueva: es que `text.format` acepta un **esquema JSON estricto**, y con
 * eso el modelo no puede devolver una forma que no esperábamos. Con
 * `json_object` el JSON era válido pero la forma no estaba garantizada, y de ahí
 * salían secciones que desaparecían del informe en silencio.
 *
 * Tres cosas que hay que saber de la familia gpt-5 y que costaron un 400 cada una:
 *
 *  - El tope de salida es `max_output_tokens` (en chat/completions era
 *    `max_completion_tokens`, y `max_tokens` nunca).
 *  - Solo acepta la temperatura por defecto: mandar `temperature` da un 400.
 *  - La respuesta NO está en `choices[0].message.content`. Viene en `output[]`,
 *    donde los modelos con razonamiento meten primero un item `reasoning`. Hay
 *    que recorrer el array buscando el item `message`. Ver `extractText`.
 *
 * El modelo se pasa desde fuera a propósito: lo elige Damian, no este fichero.
 */

const ENDPOINT = 'https://api.openai.com/v1/responses';

/**
 * Sin esquema se pide `json_object`, y ahí la API exige que la palabra "json"
 * aparezca **en el input** — no vale que esté en `instructions`.
 *
 * Es una diferencia real con `chat/completions`: allí el system y el user iban en
 * el mismo array de `messages`, así que la instrucción de "devuelve JSON" del
 * prompt de sistema cumplía el requisito. Aquí `instructions` va por su lado y el
 * chequeo solo mira `input`, así que los dos tools que no usan esquema devolvían
 * un 400 con "Response input messages must contain the word 'json'".
 *
 * Se resuelve aquí y no en cada prompt porque es una rareza de la API, no una
 * decisión de redacción. Y solo se añade si falta, para no ensuciar los que ya la
 * llevan.
 */
function ensureJsonMention(input: string): string {
	return /json/i.test(input) ? input : `${input}\n\nDevuelve la respuesta en JSON.`;
}

/** Un esquema estricto, tal como lo quiere `text.format`. */
export type JsonSchema = {
	name: string;
	strict: boolean;
	schema: Record<string, unknown>;
};

type Ask = {
	model: string;
	/** El papel y las reglas. Va aparte del input, así que se cachea mejor. */
	instructions: string;
	/** Los datos de esta petición concreta. */
	input: string;
	/**
	 * El esquema de la respuesta. Sin él se pide JSON libre, que es lo que hacía
	 * el código anterior: sirve, pero no garantiza la forma.
	 */
	schema?: JsonSchema;
	maxOutputTokens: number;
	/** Para los logs, del tipo 'tool/newsletter'. */
	tag: string;
};

/**
 * El texto de la respuesta, o `null` si el modelo se negó o no mandó ninguno.
 *
 * `output` es una lista de items de tipos distintos. Los de razonamiento se
 * ignoran; el que importa es el `message`, y dentro de su `content` el trozo
 * `output_text`. Un `refusal` se trata como que no hay respuesta.
 */
function extractText(data: unknown, tag: string): string | null {
	const output = (data as { output?: unknown })?.output;
	if (!Array.isArray(output)) return null;

	for (const item of output) {
		if (!item || typeof item !== 'object') continue;
		const { type, content } = item as { type?: unknown; content?: unknown };
		if (type !== 'message' || !Array.isArray(content)) continue;

		for (const part of content) {
			if (!part || typeof part !== 'object') continue;
			const chunk = part as { type?: unknown; text?: unknown; refusal?: unknown };
			if (chunk.type === 'output_text' && typeof chunk.text === 'string') return chunk.text;
			if (chunk.type === 'refusal') {
				console.error(`[${tag}] OpenAI se negó:`, chunk.refusal);
				return null;
			}
		}
	}
	return null;
}

/**
 * Pide JSON al modelo y lo devuelve parseado, o `null` si algo falló.
 *
 * Nunca lanza: quien llama decide si un fallo es fatal. El informe de newsletter
 * sale sin la parte de juicio y no se rompe; 7-frameworks sí lo trata como error
 * porque sin copy no hay nada que enseñar.
 */
export async function askJson<T = Record<string, unknown>>(ask: Ask): Promise<T | null> {
	const key = env.OPENAI_API_KEY;
	if (!key) return null;

	try {
		const response = await fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
			body: JSON.stringify({
				model: ask.model,
				instructions: ask.instructions,
				input: ask.schema ? ask.input : ensureJsonMention(ask.input),
				text: {
					format: ask.schema
						? {
								type: 'json_schema',
								name: ask.schema.name,
								strict: ask.schema.strict,
								schema: ask.schema.schema
							}
						: { type: 'json_object' }
				},
				max_output_tokens: ask.maxOutputTokens,
				// No guardamos lo que se manda: son datos de la publicación de otro.
				store: false
			})
		});

		if (!response.ok) {
			console.error(`[${ask.tag}] OpenAI:`, response.status, await response.text());
			return null;
		}

		const data = await response.json();

		// Un `incomplete` casi siempre es haberse quedado corto de tokens, y el JSON
		// llega cortado: sin este log, lo único que se ve es un fallo de parseo.
		if (data?.status === 'incomplete') {
			console.error(`[${ask.tag}] OpenAI incompleto:`, JSON.stringify(data?.incomplete_details));
		}

		const text = extractText(data, ask.tag);
		if (!text) return null;

		return JSON.parse(text) as T;
	} catch (error) {
		console.error(`[${ask.tag}] fallo al pedir JSON:`, error);
		return null;
	}
}
