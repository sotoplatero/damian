import { STYLE } from '$lib/tools/voice';
import type { NewsletterSnapshot, PostBody } from '$lib/server/newsletter';
import { DIMENSIONS, type AuditItem } from './rules';
import type { Measurements } from './checks';

/**
 * Lo que se le pide al modelo: que LEA los números y diga qué está mal.
 *
 * UNA SOLA LLAMADA. Antes había dos —diagnóstico gratis, arreglos de pago— y se
 * unieron: la parte cara es leer los números, y eso hay que hacerlo igual para
 * que existan los hallazgos que se enseñan antes del muro. Partirlo en dos
 * ahorraba tokens de salida y duplicaba los de entrada. El informe completo sigue
 * sin bajar al navegador: se guarda en el servidor y solo viaja por correo.
 *
 * LO IMPORTANTE DE ESTE FICHERO, Y COSTÓ LLEGAR A ELLO:
 *
 * **Se le manda el texto de los números, entero.** Antes se le mandaba un resumen
 * de nuestras propias expresiones regulares —«sin botón de suscripción, 22
 * enlaces, cierra así…»— y por eso no encontraba nada que no estuviera ya
 * previsto en una regla. Medido contra la auditoría de referencia escrita a mano
 * (no está en el repo, ver CLAUDE.md): de sus diez hallazgos, el cuestionario
 * cerrado encontraba tres y el canal abierto cuatro.
 *
 * **No hay lista de preguntas.** Hay áreas en las que mirar y permiso explícito
 * para no devolver nada. Un `aplica: true/false` por regla presiona al modelo a
 * fabricar un hallazgo por regla.
 *
 * **Toda cita se verifica contra el material.** Por eso `auditMessage` devuelve
 * el mensaje Y el pajar en la misma llamada: si se construyeran por separado
 * podrían divergir y la verificación dejaría de significar nada.
 */

const ROLE = `Eres un auditor de newsletters. Te contratan para decir qué está mal y qué
hacer, no para describir lo que se ve. Directo, concreto, y sin regañar por regañar.`;

/** Cuánto texto de cada número se manda, y cuánto en total. */
const CHARS_PER_ISSUE = 9000;
const CHARS_TOTAL = 50000;

const GUARDRAILS = `## LO QUE NO HACES

- **No cuentas nada.** Los números te llegan medidos. No los recalcules, no los
  redondees, no te inventes otros. Si necesitas una cifra, usa la que te dan tal cual.
- **No te inventas rutas de ajustes de Substack.** Si no te la han dado, no la escribas:
  di qué hay que cambiar sin decir en qué pantalla.
- **No repites los hallazgos medidos que te vienen dados, ni una variante suya.** Ya se
  muestran aparte, y están calibrados contra publicaciones reales. Si tu hallazgo es "el
  botón no promete nada" y en esa lista ya hay algo sobre el botón, el tuyo sobra — y si le
  pones más gravedad que la que tiene ahí, estás contradiciendo una medición.
- **No afirmas que algo es ilegal.** Este informe se manda solo, sin que nadie lo revise
  antes. Si una práctica va contra una norma o una recomendación de estilo, describe la
  práctica y el arreglo, y di que la recomendación existe — no dictes una conclusión
  jurídica.
- **No felicitas por cumplir.** "Tienes logo" no es un elogio.
- No hablas de aperturas, bajas ni suscriptores: desde fuera no se ven y no los tienes.`;

const RUBRIC = `## CÓMO SE GRADÚA

- **grave** — algo está ROTO, no flojo. Solo estas tres formas cuentan: se pierde o se
  expone información, algo va a dejar de funcionar solo con el tiempo, o hay un riesgo
  legal o de daño a alguien. Nada que sea cuestión de redacción, de persuasión o de "podría
  estar mejor escrito" es grave. **Si tu hallazgo se arregla escribiendo mejor, no es
  grave.**
- **medio** — cuesta suscriptores o confianza, pero no rompe nada.
- **leve** — se nota si te fijas y se arregla en un rato.
- **oportunidad** — no es un fallo. Es algo que no hace nadie en el sector y por eso está
  libre.

Si dudas entre dos niveles, elige el más bajo. Un informe con un grave falso vale menos que
uno sin graves: el que lo lee deja de creerse el resto.`;

/** El esquema estricto no admite campos opcionales, así que todo va requerido. */
function strictObject(properties: Record<string, unknown>) {
	return {
		type: 'object',
		properties,
		required: Object.keys(properties),
		additionalProperties: false
	};
}

const STRING = { type: 'string' };

export function auditPrompt(): string {
	return `${ROLE}

Recibes lo que una newsletter de Substack enseña desde fuera, unas mediciones ya hechas y
**el texto completo de varios números**. Los lees y dices qué está mal.

${STYLE}

${GUARDRAILS}

## PRIMERO: DE QUÉ VA Y PARA QUIÉN

Di de qué crees que va **con tus palabras**, para que quien lo lea compruebe si has
acertado. Ahí está el valor: se va a leer descrito por un desconocido. Si los títulos van
cada uno por su lado, dilo sin rodeos.

Y quién es la persona concreta que se suscribiría. No un segmento de marketing
("emprendedores"), sino alguien reconocible: qué hace, en qué punto está y qué está
intentando resolver. Esto es lo que más le va a sorprender, porque nadie se lo dice.

Y un veredicto de dos frases cortas: lo que funciona y lo que falla, en ese orden. Ejemplo
de la forma: "Se entiende qué haces. No para quién."

## LUEGO: LOS HALLAZGOS

Lee los números como los leería alguien que va a decir la verdad. No hay lista de cosas que
comprobar y **no hay número de hallazgos que alcanzar**: devuelve los que puedas sostener.

**Un array vacío es una respuesta válida y esperada.** Si la publicación está bien, dilo
con un array vacío. No fabriques un problema para parecer útil: el que lee esto va a
intentar arreglar lo que le digas, y mandarle a arreglar algo que no está roto le cuesta
tiempo y nos cuesta la credibilidad.

**Lee los números antes que la portada.** La portada la ve cualquiera; lo que nadie revisa
es lo que sale enviado cada día. Un informe entero sacado del subtítulo y de los botones es
un informe flojo.

Y la vara de medir de cada hallazgo es una sola: **¿esto le sirve de algo a quien escribe
esta newsletter?** No si es cierto, no si es listo: si al leerlo va a cambiar algo mañana.
Lo que no pase ese filtro, fuera.

## ANTES DE LLAMARLO FALLO, PREGÚNTATE SI TIENE UN MOTIVO

Quien escribe esto lleva meses o años en ello y sabe cosas de su producto que tú no sabes
desde fuera. Muchas de las rarezas que vas a ver son decisiones tomadas a propósito: una
migración a medias, una herramienta heredada, un formato que le funciona con su gente.

Si algo raro puede tener una explicación razonable que tú no puedes ver, **o no lo informas,
o lo informas diciendo qué le va a costar y dejando que decida él** — nunca como una
torpeza. Llamar descuido a una decisión deliberada es la forma más rápida de que cierre el
correo y no vuelva.

## CADA HALLAZGO LLEVA UNA CITA LITERAL, Y SE COMPRUEBA

\`cita\` es un fragmento **copiado exactamente** del material que te he dado: del texto de
un número, de un título, del subtítulo, de la biografía o de una URL. Se comprueba por
comparación de cadenas contra el original **antes de aceptar el hallazgo**, y si no
aparece, el hallazgo entero se descarta.

Así que: copia, no parafrasees, no resumas y no arregles la ortografía de lo que copias. Y
que tenga al menos quince caracteres, porque una palabra sola no prueba nada.

**La cita tiene que DEMOSTRAR el hallazgo, no solo existir.** Si dices que no se ve la
cadencia, la cita no puede ser el nombre del remitente: tiene que ser el sitio donde
debería estar la cadencia y no está, o la frase que la deja ambigua. Una cita que no
sostiene lo que afirmas es peor que ninguna, porque parece prueba y no lo es.

Si no puedes citar algo que lo demuestre, **no lo informes.**

${RUBRIC}

## CÓMO SE ESCRIBE

- \`hecho\`: qué pasa, en una frase, sin adjetivos.
- \`propuesta\`: qué hacer. **Escrito, no descrito.** Si el arreglo es un texto —un
  subtítulo, un asunto, un pie— va escrito entero y listo para copiar. Una sola cosa por
  hallazgo: si se te ocurren tres, elige la que más mueve.
  **Nunca dejes un hueco para que lo rellene él.** Nada de corchetes con instrucciones del
  tipo "[pon aquí tu dato]": si no tienes el dato, escribe la propuesta de otra manera que
  sí puedas completar tú con lo que has leído. El que recibe esto quiere copiar y pegar.
- \`dimension\`: una de ${Object.keys(DIMENSIONS).join(', ')}.
- \`esfuerzo\`: minutos, tarde o semanas.`;
}

export function auditSchema() {
	return {
		name: 'auditoria',
		strict: true,
		schema: strictObject({
			veredicto: STRING,
			loQueSeEntiende: STRING,
			paraQuien: STRING,
			hallazgos: {
				type: 'array',
				items: strictObject({
					dimension: { type: 'string', enum: Object.keys(DIMENSIONS) },
					severity: { type: 'string', enum: ['grave', 'medio', 'leve', 'oportunidad'] },
					esfuerzo: { type: 'string', enum: ['minutos', 'tarde', 'semanas'] },
					hecho: STRING,
					cita: STRING,
					propuesta: STRING
				})
			}
		})
	};
}

export type Audited = {
	veredicto: string;
	loQueSeEntiende: string;
	paraQuien: string;
	hallazgos: {
		dimension?: string;
		severity?: string;
		esfuerzo?: string;
		hecho?: string;
		cita?: string;
		propuesta?: string;
	}[];
};

/**
 * Todo lo observado, medido y leído, formateado para el modelo.
 *
 * Devuelve `input` (lo que se manda) y `haystack` (contra qué se verifican las
 * citas). Salen de la misma función a propósito: si se construyeran aparte
 * podrían dejar de coincidir, y entonces una cita legítima se rechazaría o una
 * inventada pasaría.
 */
export function auditMessage(
	snapshot: NewsletterSnapshot,
	m: Measurements,
	measured: AuditItem[],
	bodies: PostBody[]
): { input: string; haystack: string } {
	const titles = snapshot.posts
		.map((p) => `- "${p.title}"${p.subtitle ? ` — ${p.subtitle}` : ''}`)
		.join('\n');

	// Los números, recortados. Un post de 8.000 palabras no aporta ocho veces más
	// que uno de 1.000, y sin tope una publicación de ensayo largo desborda la
	// entrada. Se avisa del recorte para que no lo lea como un final abrupto.
	let budget = CHARS_TOTAL;
	const issues: string[] = [];
	for (const b of bodies) {
		if (budget <= 0) break;
		const allowance = Math.min(CHARS_PER_ISSUE, budget);
		const cut = b.text.length > allowance;
		const body = cut ? `${b.text.slice(0, allowance)}\n[…recortado aquí…]` : b.text;
		budget -= body.length;
		issues.push(
			`### ${b.date.slice(0, 10)} — ${b.title}\nURL: ${snapshot.url}/p/${b.slug}\n\n${body}`
		);
	}

	// Los enlaces salen aparte porque al convertir a texto plano desaparecen, y sin
	// ellos falta la mitad de lo que un lector recibe. Van sin comentario ninguno:
	// que los lea si le dicen algo.
	const links = bodies.flatMap((b) => {
		const found = [...b.html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
		const external = [...new Set(found.filter((u) => /^https?:/i.test(u)))];
		return external.length ? [`### ${b.slug}\n${external.join('\n')}`] : [];
	});

	// EL ORDEN IMPORTA, y esto sí generaliza: los números van PRIMERO y la portada al
	// final. Medido en dos ejecuciones: con la portada delante, el modelo sacaba cinco
	// hallazgos de seis del subtítulo y de los botones —lo primero que leía— y apenas
	// entraba en los números, que es donde está el producto.
	//
	// Lo que NO hay que hacer es lo que se probó y se quitó: darle pistas de dónde
	// mirar para que salga un hallazgo concreto que ya conoces. Eso es un cuestionario
	// escondido, y sobreajustado a la única publicación que tenías delante.
	const input = `## LOS NÚMEROS, ENTEROS

Esto es lo que de verdad recibe un lector. Aquí está la mayoría de lo que se puede
encontrar, así que léelo antes que nada.

${issues.join('\n\n---\n\n') || '(no se han podido leer)'}

## ENLACES QUE SALEN DE CADA NÚMERO

En el texto de arriba los enlaces no se ven, así que van aquí tal cual.

${links.join('\n\n') || '(no se han podido leer)'}

## LO QUE SE VE EN LA PORTADA

- Dirección: ${snapshot.url}
- Nombre: ${JSON.stringify(snapshot.name)}
- Subtítulo: ${JSON.stringify(snapshot.tagline)}
- Título de la pestaña: ${JSON.stringify(snapshot.pageTitle)}
- Descripción para buscadores: ${JSON.stringify(snapshot.metaDescription)}
- Autor: ${snapshot.authorName || '(sin nombre)'}
- Biografía del autor: ${JSON.stringify(snapshot.authorBio)}
- Remitente en la bandeja: ${snapshot.emailFromName || '(sin poner)'}
- Botones de la portada: ${snapshot.buttons.join(' / ') || '(ninguno)'}
- Secciones: ${m.sections.join(', ') || '(ninguna)'}
- Testimonios en la página de bienvenida: ${snapshot.welcomeBlurbs}
- Recomendaciones visibles en portada: ${snapshot.showRecsOnHomepage ? 'sí' : 'no'}
- Insignia de Substack: ${snapshot.rankingDetail || '(ninguna)'}
- Suscriptores que publica: ${snapshot.subscriberCount ?? '(no los publica)'}

## MEDICIONES YA HECHAS (no las recalcules)

- Posts leídos: ${m.posts} (${m.freePosts} gratis, ${m.paidPosts} de pago)
- La publicación lleva en pie: ${m.monthsLive} meses
- Cadencia: un post cada ${m.cadenceMedianDays} días de mediana, con huecos de ${m.cadenceMinDays} a ${m.cadenceMaxDays}
- Último post: hace ${m.daysSinceLast} días
- Longitud: de ${m.wordsMin} a ${m.wordsMax} palabras (mediana ${m.wordsMedian})
- Reacciones y comentarios: ${m.reactions} y ${m.comments}, o sea ${m.engagementPerPost} por post
- Interacción por post: ${m.engagementFirstHalf} en su mitad más antigua, ${m.engagementSecondHalf} en la más reciente
- El post que más conectó: ${m.bestPost ? `"${m.bestPost.title}" (${m.bestPost.engagement})` : '(sin datos)'}
- El que menos: ${m.worstPost ? `"${m.worstPost.title}" (${m.worstPost.engagement})` : '(sin datos)'}
- Campos de buscador rellenos: ${m.seoTitlesFilled} títulos y ${m.seoDescriptionsFilled} descripciones de ${m.posts}

## HALLAZGOS YA MEDIDOS Y MOSTRADOS (no los repitas)

${measured.map((i) => `- [${i.severity}] ${i.hecho}`).join('\n') || '- (ninguno)'}

## SUS ÚLTIMOS TÍTULOS Y SUBTÍTULOS

${titles || '- (ninguno)'}`;

	// El pajar es todo lo que se le ha enseñado y de lo que puede citar. Se añaden
	// los campos de la portada porque un hallazgo legítimo puede citar el subtítulo
	// o la biografía, no solo el cuerpo de un número.
	const haystack = [
		input,
		snapshot.name,
		snapshot.tagline,
		snapshot.authorBio,
		snapshot.pageTitle,
		snapshot.metaDescription,
		...snapshot.posts.map((p) => `${p.title} ${p.subtitle} ${p.slug}`),
		...bodies.map((b) => `${b.text}\n${b.html}`)
	].join('\n');

	return { input, haystack };
}
