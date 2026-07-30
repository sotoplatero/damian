import { STYLE } from '$lib/tools/voice';
import type { NewsletterSnapshot } from '$lib/server/newsletter';
import type { Finding, Measurements } from './checks';

/**
 * El modelo solo juzga lo que no se puede contar.
 *
 * Los números llegan ya medidos desde checks.ts, y se le prohíbe inventar o
 * recalcular ninguno: si contase él, se equivocaría y encima sonaría seguro.
 *
 * Hay DOS prompts, y la razón es de negocio, no técnica. En pantalla se regala
 * el bloque del nicho —es el que produce el "esto es verdad" y con eso el
 * visitante ya sabe que el juicio vale algo— y el resto va al correo a cambio
 * del email. Así que la primera llamada solo escribe el nicho: generar lo demás
 * para no enseñarlo sería pagar tokens por nada.
 */

const ROLE = `Eres un editor que evalúa newsletters. Directo, sin rodeos, y sin
regañar por regañar.`;

const RULES = `## LO QUE NO HACES

- **No cuentas nada.** Los números te llegan medidos. No los recalcules, no los
  redondees, no te inventes otros. Si necesitas una cifra, usa la que te dan tal cual.
- **No repites los hallazgos que ya vienen dados.** Se muestran aparte. Tú aportas
  lo que ellos no pueden ver.
- **No felicitas por cumplir.** "Tienes logo" no es un elogio.
- No hablas de aperturas, bajas ni suscriptores: desde fuera no se ven y no los tienes.`;

/** Primera llamada: solo el nicho, que es lo que se enseña gratis. */
export const nichePrompt = () => `${ROLE}

Recibes lo que un newsletter de Substack enseña desde fuera y unas mediciones ya hechas.
Tu único trabajo ahora es una cosa: decir de qué va esto.

${STYLE}

${RULES}

## CÓMO SE JUZGA UN NICHO

Leyendo los títulos, ¿se entiende de qué va? Un nicho vale cuando es un paraguas: lo
bastante ancho para caber, no tan vago que no diga nada.

Di de qué crees que va **con tus palabras**, para que quien lo lea compruebe si has
acertado. Ahí está el valor: se va a leer descrito por un desconocido. Si los títulos van
cada uno por su lado, dilo sin rodeos.

## FORMATO DE SALIDA

Devuelves SOLO un objeto JSON con esta forma exacta:

{
  "loQueSeEntiende": "De qué va esto, según sus títulos, en una o dos frases",
  "claro": true | false,
  "porQue": "Dos frases. Qué lo sostiene, o qué lo desdibuja."
}

Solo el JSON, sin explicaciones ni bloques de código.`;

/** Segunda llamada: todo lo demás, que va al correo. */
export const fullPrompt = () => `${ROLE}

Recibes lo que un newsletter de Substack enseña desde fuera, unas mediciones ya hechas, y
el diagnóstico de nicho que ya se le ha dado. Ahora escribes el resto del informe.

${STYLE}

${RULES}

- **No repitas el diagnóstico de nicho**: ya lo tiene. Constrúyelo encima.

## LO QUE JUZGAS

1. **La promesa.** Nombre y subtítulo juntos, ¿le dicen a un desconocido qué se lleva si
   deja su correo? Un nombre genérico del tipo "El Substack de Fulano" no promete nada.
2. **El CTA.** Mira el texto de los botones. ¿Pide suscribirse a secas o promete algo?
   "Suscribirse" es un trámite; funciona mejor decir qué llega y cada cuánto.
3. **Los títulos.** ¿Dicen algo concreto o son vagos? ¿Prometen o solo describen?

## FORMATO DE SALIDA

Devuelves SOLO un objeto JSON con esta forma exacta:

{
  "promesa": {
    "veredicto": "Dos o tres frases sobre si el nombre y el subtítulo venden la suscripción",
    "reescritura": "Un subtítulo alternativo, de 90 caracteres o menos, escrito por ti"
  },
  "cta": {
    "veredicto": "Dos frases sobre lo que promete el botón",
    "reescritura": "Un texto de botón alternativo, cuatro palabras o menos"
  },
  "titulares": {
    "veredicto": "Dos o tres frases sobre la calidad de los títulos, con un ejemplo suyo entre comillas",
    "mejorTitulo": "El mejor de los suyos, copiado tal cual",
    "peorTitulo": "El más flojo de los suyos, copiado tal cual"
  },
  "acciones": [
    "Lo primero que haría yo mañana, en una frase y accionable",
    "Lo segundo",
    "Lo tercero"
  ]
}

- Las tres acciones van ordenadas por lo que más mueve la aguja, no por lo más fácil.
- Cada acción dice qué hacer, no qué mejorar. "Cambia el subtítulo por X" y no
  "mejora tu subtítulo".
- En "mejorTitulo" y "peorTitulo" copias sus títulos literalmente, sin retocarlos.
- Solo el JSON, sin explicaciones ni bloques de código.`;

/** Todo lo observado y medido, formateado para el modelo. */
export function auditMessage(
	snapshot: NewsletterSnapshot,
	m: Measurements,
	findings: Finding[],
	niche?: { loQueSeEntiende?: string; claro?: boolean; porQue?: string } | null
): string {
	const titles = snapshot.posts
		.map((p) => `- "${p.title}"${p.subtitle ? ` — ${p.subtitle}` : ''}`)
		.join('\n');

	const nicheBlock = niche?.loQueSeEntiende
		? `\n## DIAGNÓSTICO DE NICHO YA DADO (no lo repitas)\n\n${niche.loQueSeEntiende}\n${niche.porQue ?? ''}\n`
		: '';

	return `## LO QUE SE VE

- Nombre: ${JSON.stringify(snapshot.name)}
- Subtítulo: ${JSON.stringify(snapshot.tagline)}
- Autor: ${snapshot.authorName || '(sin nombre)'}
- Biografía del autor: ${snapshot.authorBio || '(vacía)'}
- Botones de la portada: ${snapshot.buttons.join(' / ') || '(ninguno)'}
- Secciones: ${m.sections.join(', ') || '(ninguna)'}

## MEDICIONES YA HECHAS (no las recalcules)

- Posts leídos: ${m.posts} (${m.freePosts} gratis, ${m.paidPosts} de pago)
- Cadencia: un post cada ${m.cadenceMedianDays} días de mediana, con huecos de ${m.cadenceMinDays} a ${m.cadenceMaxDays}
- Último post: hace ${m.daysSinceLast} días
- Longitud: de ${m.wordsMin} a ${m.wordsMax} palabras (mediana ${m.wordsMedian})
- Reacciones y comentarios: ${m.reactions} y ${m.comments}, o sea ${m.engagementPerPost} por post

## HALLAZGOS QUE YA SE MUESTRAN APARTE (no los repitas)

${findings.map((f) => `- [${f.severity}] ${f.fact}`).join('\n') || '- (ninguno)'}
${nicheBlock}
## SUS ÚLTIMOS TÍTULOS

${titles}`;
}
