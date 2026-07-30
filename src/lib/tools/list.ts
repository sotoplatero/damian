/**
 * Las herramientas que se enseñan en la home, debajo del formulario.
 *
 * Esta lista va a crecer. Para añadir una, basta con meter un objeto aquí:
 * la home la pinta sola, en el orden en que estén. Lo primero de la lista es
 * lo primero que se ve, así que arriba va lo que más te interese mover.
 *
 * `places-evaluator` sigue vivo por URL pero no está aquí a propósito: usa
 * Paraglide y DaisyUI, así que todavía no encaja con el resto. Para sacarlo a
 * la home hay que migrarlo antes al tema del sitio.
 */
export type Tool = {
	/** Lo que se lee en el enlace. Que diga qué hace, no cómo se llama por dentro. */
	name: string;
	href: string;
	/** Una frase corta: se corta a dos líneas en pantalla. Qué se lleva quien entre. */
	blurb: string;
	/** Marca las que piden email, para que sepas de un vistazo cuáles captan. */
	capturesEmail?: boolean;
};

export const tools: Tool[] = [
	{
		name: 'Qué se ve de tu newsletter desde fuera',
		href: '/tool/newsletter',
		blurb: 'Pegas tu Substack y te digo si se entiende de qué va y qué tienes sin tocar.'
	},
	{
		name: 'Tu oferta, escrita de 7 formas',
		href: '/tool/7-frameworks',
		blurb: 'Pegas tu web y te devuelvo tu oferta escrita de siete formas distintas.',
		capturesEmail: true
	},
	{
		name: 'Tu tema, en 10 tipos de post',
		href: '/tool/10-post-types',
		blurb: 'Pegas tu web y te devuelvo el mismo tema contado en diez posts para redes.',
		capturesEmail: true
	}
];
