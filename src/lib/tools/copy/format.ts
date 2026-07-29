import { findFramework } from './frameworks';

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

/**
 * Neutraliza el markdown accidental del texto del modelo.
 *
 * El correo se compone metiendo estos textos dentro de una plantilla markdown.
 * Si una línea empieza por "#", ">" o "-", el cliente de correo la pinta como
 * encabezado, cita o lista: aparece en letra grande o con viñeta donde debería
 * haber una frase. Y una línea de "---" o "===" convierte la frase anterior en
 * un titular. Se escapan solo los caracteres al principio de línea, que es
 * donde tienen ese efecto.
 */
function escapeMarkdown(text: string): string {
	return text
		.split('\n')
		.map((line) => {
			// Línea que es solo guiones o iguales: subraya la frase anterior y la
			// convierte en encabezado. Se rompe con un espacio de por medio.
			if (/^\s*(-{2,}|={2,}|_{3,})\s*$/.test(line)) return line.replace(/(.)/g, '$1 ').trimEnd();
			// "1." o "1)" abren una lista numerada. Se escapa el signo y no la
			// cifra, porque markdown solo deja escapar puntuación.
			if (/^\s*\d+[.)]/.test(line)) return line.replace(/^(\s*\d+)([.)])/, '$1\\$2');
			return line.replace(/^(\s*)([#>+\-*=|])/, '$1\\$2');
		})
		.join('\n');
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
