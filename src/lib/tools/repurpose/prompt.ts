import { formats, freeFormats, type Format } from './formats';
import { STYLE } from '$lib/tools/voice';

export type Article = { tema: string; tesis: string; publico: string; frase: string; prueba: string };

function indent(text: string): string {
	return text.split('\n').map((line) => `      ${line}`).join('\n');
}

function formatSpec(list: Format[]): string {
	return list.map((format) => [
		`- id "${format.id}" — ${format.name} (${format.channel})`,
		`   Para qué: ${format.bestFor}`,
		`   Cómo: ${format.hint}`,
		format.maxChars ? `   Tope: ${format.maxChars} caracteres, contando espacios.` : '',
		`   Ejemplo de la forma (de OTRO tema; enseña el molde, no lo copies):`, indent(format.example)
	].filter(Boolean).join('\n')).join('\n\n');
}

const ROLE = `Eres quien reparte en redes lo que este negocio publica. Coges un artículo ya escrito y lo conviertes en piezas nativas de Substack, X y LinkedIn. Escribes en corto y directo, como Isra Bravo: sin adornos, de tú a tú, sin emojis. Cada pieza tiene que sonar a la persona y no a una agencia.`;
const OUTPUT = `Un objeto en "pieces" por cada id pedido, en el mismo orden. Cada "text" es la pieza entera, lista para copiar y pegar, sin títulos. Puedes usar saltos de línea, pero ningún markdown. Es el mismo artículo en todas y no repites frases. Solo la pieza con enlace lleva URL. No inventes cifras, clientes ni fechas: usa huecos como "[tu cifra]". Los ejemplos solo enseñan la forma. Solo JSON.`;

export const extractPrompt = () => `${ROLE}

Recibes el artículo entero. Ignora menús, pie y cabecera. Ordena de qué va, qué defiende, a quién sirve y su frase más fuerte, copiada LITERAL; y escribe ${freeFormats.map((f) => `"${f.id}"`).join(', ')}.

${STYLE}

## LOS FORMATOS QUE ESCRIBES AHORA
${formatSpec(freeFormats)}

## FORMATO DE SALIDA
{"article":{"tema":"","tesis":"","publico":"","frase":"","prueba":""},"confidence":"alta | baja","pieces":[{"id":"","text":""}]}

La frase se copia carácter a carácter, sin comillas, completa y con al menos quince caracteres. Si no existe, cadena vacía. La prueba solo contiene cifras, casos, nombres o fechas presentes. Confidence es baja si no parece un artículo.

${OUTPUT}`;

export const writePrompt = (ids: string[]) => {
	const selected = formats.filter((format) => ids.includes(format.id));
	return `${ROLE}

Recibes un artículo ya ordenado y escribes ${selected.length} piezas para redes y el orden de publicación.

${STYLE}

## LOS FORMATOS
${formatSpec(selected)}

## FORMATO DE SALIDA
{"pieces":[{"id":"","text":""}],"orden":["qué pieza va primero y por qué"]}

${OUTPUT}

El orden lleva entre cuatro y seis líneas, nombra el formato y explica por qué va ahí. Sin días ni fechas. La pieza con enlace va pegada a la publicación del artículo.`;
};

export function articleMessage(article: Article, sourceUrl: string): string {
	const frase = article.frase.trim() ? `«${article.frase.trim()}» (verificada, puedes citarla)` : '(ninguna verificada: parafrasea y SIN comillas)';
	const prueba = article.prueba.trim() || '(sin prueba real: usa huecos entre corchetes)';
	const enlace = sourceUrl.trim() || '(no disponible: escribe sin enlace)';
	return `Artículo sobre el que escribir:\n\n- De qué va: ${article.tema}\n- Qué defiende: ${article.tesis}\n- A quién le sirve: ${article.publico}\n- Su frase más fuerte: ${frase}\n- Pruebas reales disponibles: ${prueba}\n- Enlace al artículo (solo para la pieza con enlace): ${enlace}`;
}
