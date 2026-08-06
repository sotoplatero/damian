import { formats, freeFormats, NOTE_MAX_CHARS, type NoteFormat } from './formats';
import { REPURPOSE_STYLE } from './style';

export type ArticleAnalysis = {
	tema: string;
	tesis: string;
	publico: string;
	ideas: string[];
	pruebas: string[];
	escenas: string[];
	frase: string;
	voz: string;
};

function indent(text: string): string {
	return text.split('\n').map((line) => `      ${line}`).join('\n');
}

export function formatSpec(list: NoteFormat[]): string {
	return list.map((format) => [
		`- id "${format.id}" — ${format.name}`,
		`   Para qué: ${format.bestFor}`,
		`   Criterio: ${format.hint}`,
		'   Ejemplo de la forma (otro tema; no copies el asunto):',
		indent(format.example)
	].join('\n')).join('\n\n');
}

const ROLE = `Distribuyes un artículo mediante notas breves que abren entradas distintas al texto original. No escribes para redes concretas. Cada nota aporta algo por sí misma y puede llevar a leer el artículo.`;
const RULES = `Cada nota tiene como máximo ${NOTE_MAX_CHARS} caracteres, contando espacios, saltos y URL. Elige libremente su longitud y estructura: puede ser una frase o varios párrafos breves, pero nunca un artículo ni un resumen completo. No repitas una idea cambiando palabras. Puedes extraer implicaciones nuevas solo si se sostienen en el texto. Decide en cada nota si la URL ayuda, dónde ponerla y si necesita una transición; inclúyela en varias cuando encaje, sin imponer una cantidad. No inventes nada. Sin markdown, títulos, etiquetas de plataforma, emojis ni hashtags.`;

export const extractPrompt = () => `${ROLE}

Recibes el artículo completo. Ignora navegación, cabecera y pie. Analiza su contenido y su voz, y escribe ${freeFormats.map((format) => `"${format.id}"`).join(', ')}.

${REPURPOSE_STYLE}

## NOTAS QUE ESCRIBES AHORA
${formatSpec(freeFormats)}

## FORMATO DE SALIDA
{"article":{"tema":"","tesis":"","publico":"","ideas":[""],"pruebas":[""],"escenas":[""],"frase":"","voz":""},"confidence":"alta | baja","pieces":[{"id":"","text":""}]}

La frase se copia carácter a carácter, sin comillas, completa y con al menos quince caracteres. Si no existe, cadena vacía. Ideas, pruebas y escenas solo contienen material sustentado por el texto. Confidence es baja si no parece un artículo completo.

Al menos UNA de las tres notas debe incluir la URL original. Elige cuál según su contenido.

${RULES}
Devuelve solo JSON.`;

export const writePrompt = (ids: readonly string[]) => {
	const selected = formats.filter((format) => ids.includes(format.id));
	return `${ROLE}

Recibes un artículo ya analizado. Escribe las ${selected.length} notas restantes y una orientación breve para alternar ideas y extensiones, sin días ni calendario.

${REPURPOSE_STYLE}

## NOTAS QUE ESCRIBES AHORA
${formatSpec(selected)}

## FORMATO DE SALIDA
{"pieces":[{"id":"","text":""}],"orden":["orientación breve"]}

${RULES}
"puerta-articulo" debe incluir la URL final. Incluye esa misma URL en al menos otra de las seis notas, elegida según su contenido.
La cita comentada debe contener la frase verificada si existe. Si no existe, parafrasea sin comillas. Devuelve solo JSON.`;
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
- Frase literal verificada: ${article.frase ? `«${article.frase}»` : '(ninguna: parafrasea sin comillas)'}
- URL final: ${sourceUrl}`;
}
