/**
 * El candado de las citas, compartido por las herramientas.
 *
 * Vivía dentro de `newsletter/rules.ts`, que es donde se ganó: allí todo hallazgo
 * abierto del modelo trae una cita literal y se comprueba contra el material antes
 * de aceptarlo, y eso ya pilló una síntesis del modelo presentada como evidencia.
 * `repurpose` necesita lo mismo —dos de sus nueve piezas se apoyan en una frase del
 * artículo—, y duplicar la normalización sería pedir que las dos copias dejen de
 * coincidir con el tiempo.
 *
 * Está aquí y no en `$lib/server` porque no toca red ni secretos: es una comparación
 * de cadenas, igual que `voice.ts` es texto compartido.
 */

/** Mínimo de caracteres de una cita. Menos que esto no prueba nada: "España" no es evidencia. */
export const QUOTE_MIN = 15;

/**
 * Normaliza para comparar citas: minúsculas, espacios colapsados y fuera los
 * caracteres que cambian solos al escribir o pegar texto (comillas repetidas,
 * guiones largos, puntos suspensivos). Sin esto, una cita correcta se rechazaría
 * por una diferencia de tipografía que no cambia el sentido.
 *
 * EL PAJAR HAY QUE PASARLO POR AQUÍ ANTES DE `verifyQuote`: esa función solo
 * normaliza la aguja. Era una función privada de `rules.ts` y su único cliente la
 * llamaba bien; al salir a un módulo compartido, esto pasa a ser parte del contrato.
 *
 * Las clases de caracteres son las que hay de verdad en la fuente de `rules.ts`,
 * comprobadas por punto de código con el script del plan y no de un vistazo visual:
 * comillas y guiones se parecen demasiado entre sí en un editor para fiarse del ojo.
 */
export function normalizeQuoteText(text: string): string {
	return text
		.toLowerCase()
		// « » " '  ->  "  (el " y el ' aparecen duplicados en la clase original)
		.replace(/[«»""'']/g, '"')
		// – —  ->  -
		.replace(/[–—]/g, '-')
		// …  ->  ...
		.replace(/…/g, '...')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Quita las comillas que envuelven una cita.
 *
 * Hace falta por cómo normaliza: `«` y `»` se convierten en `"`, así que una cita
 * que venga envuelta («así») se busca en el pajar CON las comillas dentro de la
 * aguja, y el artículo original no las tiene. Resultado: una cita correcta que se
 * rechaza. El prompt pide la frase sin comillas; esto es el cinturón.
 */
export function unwrapQuotes(text: string): string {
	return text.replace(/^[\s«»"'“”‘’]+/, '').replace(/[\s«»"'“”‘’]+$/, '');
}

/**
 * La cita tiene que existir en el material.
 *
 * Es una comparación de cadenas, barata y brutal. `haystack` tiene que venir ya
 * normalizado con `normalizeQuoteText`.
 */
export function verifyQuote(cita: string, haystack: string): boolean {
	const needle = normalizeQuoteText(cita);
	return needle.length >= QUOTE_MIN && haystack.includes(needle);
}
