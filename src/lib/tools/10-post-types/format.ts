import { findPostType } from './types';

/** Un post ya escrito: el id de su tipo y el texto entero. */
export type GeneratedPost = {
	id: string;
	text: string;
};

/**
 * Se queda solo con lo que reconocemos de la respuesta del modelo: posts de un
 * tipo que existe y con texto de verdad. Si el modelo se inventa un id o
 * devuelve un número donde iba el texto, aquí se cae.
 */
export function sanitizePosts(raw: unknown): GeneratedPost[] {
	const list = Array.isArray((raw as { posts?: unknown })?.posts)
		? ((raw as { posts: unknown[] }).posts as unknown[])
		: [];

	const posts: GeneratedPost[] = [];
	for (const entry of list) {
		if (!entry || typeof entry !== 'object') continue;
		const { id, text } = entry as { id?: unknown; text?: unknown };
		if (typeof id !== 'string' || typeof text !== 'string') continue;
		if (!findPostType(id) || !text.trim()) continue;
		posts.push({ id, text: text.trim() });
	}
	return posts;
}

/** El post como texto plano, que es lo que se copia al portapapeles. */
export function toPlainText(post: GeneratedPost): string {
	return post.text;
}

/**
 * Neutraliza el markdown accidental del texto del modelo.
 *
 * El correo se compone metiendo estos textos dentro de una plantilla markdown.
 * Si una línea empieza por "#", ">" o "-", el cliente de correo la pinta como
 * encabezado, cita o lista: aparece en letra grande o con viñeta donde debería
 * haber una frase. Y una línea de "---" o "===" convierte la frase anterior en
 * un titular. Se escapan solo los caracteres al principio de línea, que es
 * donde tienen ese efecto.
 *
 * Es el mismo mecanismo que en 7-frameworks/format.ts. Aquí importa más todavía:
 * el tipo Lista y el tipo Práctico salen en líneas separadas a propósito, y sin
 * esto cada línea se comería el markdown de la de al lado.
 */
function escapeMarkdown(text: string): string {
	return text
		.split('\n')
		.map((line) => {
			if (/^\s*(-{2,}|={2,}|_{3,})\s*$/.test(line)) return line.replace(/(.)/g, '$1 ').trimEnd();
			if (/^\s*\d+[.)]/.test(line)) return line.replace(/^(\s*\d+)([.)])/, '$1\\$2');
			return line.replace(/^(\s*)([#>+\-*=|])/, '$1\\$2');
		})
		.join('\n');
}

/** Los posts como markdown, para el correo de entrega. */
export function toMarkdown(posts: GeneratedPost[]): string {
	return posts
		.map((post) => {
			const type = findPostType(post.id);
			if (!type) return '';
			return `## ${type.name}\n\n*${type.bestFor}*\n\n${escapeMarkdown(post.text)}`;
		})
		.filter(Boolean)
		.join('\n\n---\n\n');
}
