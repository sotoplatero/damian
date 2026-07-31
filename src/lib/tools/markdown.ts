/**
 * Lo que hay que hacerle al texto del modelo antes de meterlo en un correo.
 *
 * Compartido por las tres herramientas: estaba copiado en `7-frameworks/format.ts`
 * y en `10-post-types/format.ts`, y `repurpose` habría sido la tercera copia.
 */

/**
 * Neutraliza el markdown accidental del texto del modelo.
 *
 * El correo se compone metiendo estos textos dentro de una plantilla markdown. Si
 * una línea empieza por "#", ">" o "-", el cliente de correo la pinta como
 * encabezado, cita o lista: aparece en letra grande o con viñeta donde debería haber
 * una frase. Y una línea de "---" o "===" convierte la frase anterior en un titular.
 * Se escapan solo los caracteres al principio de línea, que es donde tienen ese
 * efecto.
 *
 * Importa en todas, y más donde el texto va en líneas separadas a propósito: la
 * lista de LinkedIn de `repurpose`, y los tipos Lista y Práctico de `10-post-types`.
 */
export function escapeMarkdown(text: string): string {
	return text
		.split('\n')
		.map((line) => {
			// Línea que es solo guiones o iguales: subraya la frase anterior y la
			// convierte en encabezado. Se rompe con un espacio de por medio.
			if (/^\s*(-{2,}|={2,}|_{3,})\s*$/.test(line)) return line.replace(/(.)/g, '$1 ').trimEnd();
			// "1." o "1)" abren una lista numerada. Se escapa el signo y no la cifra,
			// porque markdown solo deja escapar puntuación.
			if (/^\s*\d+[.)]/.test(line)) return line.replace(/^(\s*\d+)([.)])/, '$1\\$2');
			return line.replace(/^(\s*)([#>+\-*=|])/, '$1\\$2');
		})
		.join('\n');
}
