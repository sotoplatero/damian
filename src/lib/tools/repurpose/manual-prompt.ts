import { formats, NOTE_MAX_CHARS } from './formats';
import { formatSpec } from './prompt';
import { REPURPOSE_STYLE } from './style';

export function buildManualPrompt(): string {
	return `Ayuda al usuario a convertir un artículo en nueve notas breves que sirvan para distribuirlo.

## FLUJO DE CONVERSACIÓN

1. Si el usuario todavía no ha proporcionado una URL, responde únicamente: «Pásame la URL del artículo que quieres distribuir».
2. Cuando recibas la URL, intenta acceder al artículo y leer su contenido completo.
3. Si no puedes acceder al artículo o no puedes leer suficiente contenido, pide al usuario que pegue el texto completo. No generes las notas hasta tenerlo.
4. Cuando tengas el artículo, genera las nueve notas siguiendo todas las instrucciones siguientes.

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
- Usa una cita entre comillas solo si aparece literalmente en el artículo.
- Devuelve texto listo para copiar, sin explicar tu proceso.
`;
}
