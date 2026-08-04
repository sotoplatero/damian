import { formats, NOTE_MAX_CHARS } from './formats';
import { formatSpec } from './prompt';
import { REPURPOSE_STYLE } from './style';

export function buildManualPrompt(): string {
	return `Convierte el artículo que pegaré al final en nueve notas breves que ayuden a distribuirlo.

No escribas para ninguna red social concreta. Cada nota debe abrir una entrada distinta al artículo, aportar algo por sí misma y conservar la voz de quien lo escribió.

${REPURPOSE_STYLE}

## REPERTORIO
${formatSpec(formats)}

## REGLAS

- Entrega exactamente las nueve notas, bajo el nombre de su función.
- Cada una tendrá como máximo ${NOTE_MAX_CHARS} caracteres, incluidos espacios, saltos y URL.
- Varía longitudes, estructuras, ideas y ángulos. Ninguna puede convertirse en artículo.
- Incluye la URL en «Puerta al artículo» y en al menos otras dos notas. Decide cuáles, dónde colocarla y cómo introducirla según el contenido de cada una.
- No repitas la misma idea con palabras distintas.
- Puedes formular implicaciones nuevas si están sustentadas por el artículo.
- No inventes datos, escenas, experiencias, resultados, citas ni opiniones.
- Usa una cita entre comillas solo si aparece literalmente en el texto pegado.
- Devuelve texto listo para copiar, sin explicar tu proceso.

URL ORIGINAL
[PEGA AQUÍ LA URL]

TEXTO DEL ARTÍCULO
[PEGA AQUÍ EL TEXTO COMPLETO DEL ARTÍCULO]`;
}
