import { findPostType } from './types';
import { escapeMarkdown } from '$lib/tools/markdown';

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
