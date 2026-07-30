/**
 * Lee los ficheros de copy del sitio.
 *
 * Todo el texto vive en `src/lib/content/*.md` con la misma forma: frontmatter
 * con las cadenas de interfaz como `clave: valor`, y cuerpo en markdown. Este
 * parser estaba copiado en tres páginas; ahora está una vez.
 *
 * No se usa mdsvex a propósito: tratar los `.md` como módulos de Svelte rompe
 * la resolución de tipos. Se importan como texto con `?raw` y se parsean aquí.
 */

export type Copy = {
	/** Cadenas del frontmatter. */
	t: Record<string, string>;
	/** El cuerpo, en markdown sin procesar. */
	body: string;
};

export function parseCopy(source: string): Copy {
	let body = source;
	const t: Record<string, string> = {};

	const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (frontmatter) {
		body = source.slice(frontmatter[0].length);
		for (const line of frontmatter[1].split('\n')) {
			const trimmed = line.trim();
			// Las líneas que empiezan por # son comentarios y no se publican: ahí van
			// las notas para Damian dentro de los propios ficheros de copy.
			if (!trimmed || trimmed.startsWith('#')) continue;
			const separator = trimmed.indexOf(':');
			if (separator === -1) continue;
			t[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
		}
	}

	return { t, body };
}
