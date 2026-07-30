import { tools } from '$lib/tools/list';
import homeRaw from '$lib/content/home.md?raw';

/**
 * Qué pone en la tarjeta que se ve al compartir cada página.
 *
 * Vive aquí y no dentro de la ruta que dibuja la imagen para que los textos
 * sigan saliendo de donde salen siempre: las herramientas de
 * `src/lib/tools/list.ts` y la portada del frontmatter de `home.md`. Así una
 * herramienta nueva tiene tarjeta sola y el copy de la home se edita en el
 * mismo sitio que el resto.
 */

export type Card = {
	title: string;
	subtitle: string;
	/** La línea de abajo, al lado del dominio. Distingue la portada de un tool. */
	tag: string;
};

/** Lee un valor del frontmatter de home.md, igual que hace la página. */
function fromHome(key: string): string {
	const frontmatter = homeRaw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!frontmatter) return '';
	for (const line of frontmatter[1].split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const separator = trimmed.indexOf(':');
		if (separator === -1) continue;
		if (trimmed.slice(0, separator).trim() === key) return trimmed.slice(separator + 1).trim();
	}
	return '';
}

/** `home` para la portada; para una herramienta, su slug. Null si no existe. */
export function cardFor(slug: string): Card | null {
	if (slug === 'home') {
		return {
			title: fromHome('ogTitle'),
			subtitle: fromHome('ogDescription'),
			tag: fromHome('ogTag')
		};
	}

	const tool = tools.find((t) => t.href.replace(/^\/tool\//, '') === slug);
	if (!tool) return null;
	return { title: tool.name, subtitle: tool.blurb, tag: 'herramienta gratis' };
}

/** El slug de la tarjeta que le toca a una ruta. */
export function slugForPath(pathname: string): string {
	const clean = pathname.replace(/\/$/, '');
	if (!clean || clean === '') return 'home';
	return clean.replace(/^\/tool\//, '');
}
