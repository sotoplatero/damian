/**
 * Las herramientas que se enseñan en la home, debajo del formulario.
 *
 * Esta lista va a crecer. Para añadir una, basta con meter un objeto aquí:
 * la home la pinta sola, en el orden en que estén. Lo primero de la lista es
 * lo primero que se ve, así que arriba va lo que más te interese mover.
 *
 * QUITAR UNA DE LA HOME NO LA APAGA. Todo lo que hay en `src/routes/tool/*`
 * sigue siendo accesible por URL; esta lista solo decide qué se enseña. Sirve
 * para trabajar en una sin que la vea quien entra.
 *
 * Fuera de la lista a propósito, y por qué:
 *
 *   - `places-evaluator` — usa Paraglide y DaisyUI, así que todavía no encaja
 *     con el resto. Para sacarlo a la home hay que migrarlo al tema del sitio.
 *   - `newsletter` — funciona, pero el informe todavía no aporta lo que debería.
 *     Se está reescribiendo la parte de juicio y la referencia contra la que se
 *     mide está en `docs/auditoria-de-referencia.md`. Vuelve a la home cuando el
 *     informe pase el filtro de ese documento: que quien lo lea cambie algo.
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
		name: 'Tu oferta, escrita de 7 formas',
		href: '/tool/7-frameworks',
		blurb: 'Pegas tu web y te devuelvo tu oferta escrita de siete formas distintas.',
		capturesEmail: true
	}
];
