import { findFramework } from './frameworks';
import { escapeMarkdown } from '$lib/tools/markdown';

/** Un framework ya escrito: el id y el texto de cada uno de sus pasos. */
export type GeneratedCopy = {
	id: string;
	blocks: Record<string, string>;
};

/**
 * Se queda solo con lo que reconocemos de la respuesta del modelo: frameworks
 * que existen y bloques que tocan. Si el modelo se inventa una clave o devuelve
 * un número donde iba texto, aquí se cae.
 */
export function sanitizeCopies(raw: unknown): GeneratedCopy[] {
	const list = Array.isArray((raw as { copies?: unknown })?.copies)
		? ((raw as { copies: unknown[] }).copies as unknown[])
		: [];

	const copies: GeneratedCopy[] = [];
	for (const entry of list) {
		if (!entry || typeof entry !== 'object') continue;
		const { id, blocks } = entry as { id?: unknown; blocks?: unknown };
		if (typeof id !== 'string') continue;

		const framework = findFramework(id);
		if (!framework || !blocks || typeof blocks !== 'object') continue;

		const source = blocks as Record<string, unknown>;
		const clean: Record<string, string> = {};
		for (const step of framework.steps) {
			const value = source[step.key];
			if (typeof value === 'string' && value.trim()) clean[step.key] = value.trim();
		}
		if (Object.keys(clean).length) copies.push({ id, blocks: clean });
	}
	return copies;
}

/** Un framework como texto plano, que es lo que se copia al portapapeles. */
export function toPlainText(copy: GeneratedCopy): string {
	const framework = findFramework(copy.id);
	if (!framework) return '';
	return framework.steps
		.filter((step) => copy.blocks[step.key])
		.map((step) => copy.blocks[step.key])
		.join('\n\n');
}

/** Los frameworks como markdown, para el correo de entrega. */
export function toMarkdown(copies: GeneratedCopy[]): string {
	return copies
		.map((copy) => {
			const framework = findFramework(copy.id);
			if (!framework) return '';
			const body = framework.steps
				.filter((step) => copy.blocks[step.key])
				.map((step) => `**${step.label}**\n\n${escapeMarkdown(copy.blocks[step.key])}`)
				.join('\n\n');
			return `## ${framework.name}\n\n*${framework.bestFor}*\n\n${body}`;
		})
		.filter(Boolean)
		.join('\n\n---\n\n');
}
