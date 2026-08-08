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
- **Cada nota se apoya en un material distinto del artículo, y no hay dos sobre el mismo.** Antes de escribirla, di en una línea sobre qué la construyes: qué cifra, qué escena, qué frase o qué tensión.
- En las cinco primeras, ese material va DENTRO de la nota: la cifra escrita, el nombre propio escrito, la escena contada. «Muy barato» no es una cifra. «La mayoría» no es un dato.
- Las cuatro últimas no resumen: piensan a partir del artículo y van donde el artículo no fue. Todo lo que digan tiene que poder defenderse con el texto delante sin estar ya escrito en él.
- Varía longitudes y estructuras. Ninguna puede convertirse en artículo.
- Sobre el enlace: decide en cada nota si ayuda. No hay obligación de ponerlo, una nota con enlace llega a menos gente, y si lo pones la nota tiene que valer sin él.
- No inventes datos, escenas, experiencias, resultados, citas ni opiniones. Razonar sobre lo que hay no es inventar; añadir cifras que no están, sí.
- Usa una cita entre comillas solo si aparece literalmente en el artículo.
- Devuelve texto listo para copiar, sin explicar tu proceso.
`;
}
