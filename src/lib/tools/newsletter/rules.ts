import type { NewsletterSnapshot, PostBody } from '$lib/server/newsletter';
import type { Measurements } from './checks';
import { normalizeQuoteText, verifyQuote } from '$lib/tools/quotes';

/**
 * Las reglas medidas, y el candado del canal abierto.
 *
 * DOS ORÍGENES, UNA SOLA FORMA DE SALIDA (`AuditItem`):
 *
 *   1. **Medido** (`RULES`, aquí). Lo contable. Determinista, no puede alucinar un
 *      número, y la propuesta va escrita a mano porque la ruta del ajuste en
 *      Substack es la que es y un modelo se la inventaría.
 *   2. **Abierto** (lo escribe el modelo leyendo los números enteros). Sin lista
 *      de preguntas y sin número fijo de hallazgos.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ EL CANAL ABIERTO Y NO UN CUESTIONARIO
 *
 * Antes había cinco reglas de juicio con forma `aplica: true/false`. Se cambiaron
 * porque un cuestionario **solo encuentra lo que a alguien se le ocurrió
 * preguntar**, y lo que de verdad le duele a un autor no está en esa lista.
 *
 * La prueba está en la auditoría de referencia escrita a mano (no está en el
 * repo, ver CLAUDE.md): de sus diez hallazgos, el cuestionario encontraba tres.
 * Uno de los que se le escapaban era que todos los enlaces del archivo salían por
 * el redirector de un proveedor antiguo, con un identificador de suscriptor
 * colgando de la URL — nadie iba a escribir una regla para eso, y es exactamente
 * el tipo de cosa que hace daño. Y encima el `aplica: true/false` presionaba al
 * modelo a opinar sobre las cinco reglas aunque no hubiera nada que decir.
 *
 * EL CANDADO: `verifyQuote`. Todo hallazgo abierto trae una cita literal, y se
 * comprueba contra el material que se le pasó ANTES de aceptarlo. Sin este
 * candado el canal abierto llena el informe de cosas plausibles y falsas —
 * medido: al escribir la auditoría de referencia, un patrón mal puesto produjo
 * seis erratas de puntuación que resultaron ser un artefacto de quitar etiquetas
 * HTML. La real era una.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * NO HAY NOTA, Y NO HAY `impact`. Se quitaron los dos por lo mismo: eran
 * aritmética que no se podía defender. Ver el comentario de `tally` en este
 * fichero y el de `checks.ts`. Lo que ordena el informe es la gravedad.
 */

/**
 * Las cinco dimensiones. Agrupan, ya no puntúan.
 *
 * `buscadores` desapareció como dimensión: era el 20% del informe midiendo lo
 * que no hace ninguna de las publicaciones más leídas. Lo que quedó de ella vive
 * en `conversion`, porque que te encuentren es el paso de antes de que te dejen
 * el correo.
 */
export const DIMENSIONS = {
	promesa: 'Promesa',
	prueba: 'Prueba',
	constancia: 'Constancia',
	contenido: 'Contenido',
	conversion: 'Conversión'
} as const;

export type Dimension = keyof typeof DIMENSIONS;

/** `oportunidad` es lo que nadie hace y por eso está libre. No es un fallo. */
export type Severity = 'grave' | 'medio' | 'leve' | 'oportunidad';

/**
 * El esfuerzo, en tiempo y no en un número.
 *
 * "Esfuerzo 3/10" no le dice nada a nadie; "dos minutos" sí, y es lo que decide
 * si algo se hace hoy o nunca. Es un enum y no una escala para que el modelo
 * elija entre tres cosas concretas en vez de inventar una cifra.
 */
export type Effort = 'minutos' | 'tarde' | 'semanas';

export const EFFORT_LABEL: Record<Effort, string> = {
	minutos: 'diez minutos',
	tarde: 'una tarde',
	semanas: 'unas semanas'
};

/**
 * Un hallazgo con su arreglo escrito. Es lo único que se puede renderizar.
 *
 * `propuesta` no es opcional: una regla que solo describe no compila, y un
 * hallazgo abierto que llega sin propuesta se descarta. Salió de auditar informes
 * que decían "mejora la experiencia de usuario".
 */
export type AuditItem = {
	/** El `id` de la regla medida, o `abierto` si lo encontró el modelo leyendo. */
	rule: string;
	dimension: Dimension;
	severity: Severity;
	/** Qué pasa, en una frase y sin adjetivos. */
	hecho: string;
	/** El dato que lo prueba, o la cita literal del original si es abierto. */
	evidencia?: string;
	/** Qué hacer, escrito: dónde se toca y qué se pone. */
	propuesta: string;
	effort: Effort;
	origen: 'medido' | 'abierto';
};

/** Lo que devuelve una regla medida cuando encuentra algo. `null` si no aplica. */
export type Evaluation = { hecho: string; evidencia?: string; propuesta: string };

export type AuditContext = {
	snapshot: NewsletterSnapshot;
	m: Measurements;
	/**
	 * Cuerpos de los posts muestreados. Se bajan en los dos pasos.
	 *
	 * Puede llegar vacío si la descarga falla, y entonces las reglas que lo
	 * necesitan (`needsBodies`) no salen. Eso es correcto: mejor un hallazgo menos
	 * que uno inventado.
	 */
	bodies: PostBody[];
};

export type Rule = {
	id: string;
	dimension: Dimension;
	severity: Severity;
	effort: Effort;
	/** Si necesita el cuerpo de los posts: se salta cuando no se han podido bajar. */
	needsBodies?: boolean;
	evaluate: (ctx: AuditContext) => Evaluation | null;
};

// --- Umbrales, todos con su motivo ---

const TITLE_MAX = 60;
const SLUG_WORDS_MAX = 5;
const SUBSTACK_ORANGE = '#FF6719';
/**
 * Sin publicar más de esto, desde fuera parece abandonado.
 *
 * Vive aquí y no en `checks.ts` para que las importaciones vayan en un solo
 * sentido: `checks.ts` toma valores de este fichero, y este solo toma tipos de
 * aquel (que se borran al compilar). Así no hay ciclo en tiempo de ejecución.
 */
export const ABANDONED_DAYS = 45;
/** Textos de botón que no prometen nada. */
const GENERIC_CTA = ['suscribirse', 'suscríbete', 'subscribe', 'sign up', 'registrarse'];

const STOPWORDS = new Set([
	'el','la','los','las','un','una','unos','unas','de','del','al','a','en','y','o','que','con',
	'por','para','su','sus','se','lo','mi','tu','es','the','of','to','in','and','or','for'
]);

function slugWords(slug: string): string[] {
	return slug.split('-').filter(Boolean);
}

/**
 * CTA duro: el widget de suscripción o un botón insertado en el cuerpo. Son las
 * clases que pone el propio editor de Substack, así que no hay que adivinar.
 */
const CTA_HARD =
	/subscribe-widget|button-wrapper|captioned-button-wrap|data-component-name="[^"]*Subscribe|href="[^"]*\/subscribe/i;

/**
 * CTA blando: la invitación a responder o la pregunta de cierre. Cuenta como CTA
 * porque es lo que hace la publicación que mejor va del conjunto medido.
 */
const CTA_SOFT =
	/respóndeme|respondeme|responde a este|contéstame|contestame|escríbeme|escribeme|cuéntame|cuentame|dímelo|dimelo|qué opinas|que opinas|deja un comentario|reply/i;

/** El final del cuerpo, sin etiquetas: es donde vive el CTA de cierre. */
function tail(html: string, chars = 1500): string {
	return html.slice(-chars).replace(/<[^>]+>/g, ' ');
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * LA SEVERIDAD SE CALIBRA CONTRA PUBLICACIONES REALES. NO LA SUBAS SIN DATOS.
 *
 * Medido en julio de 2026 sobre kloshletter.substack.com,
 * nadaimporta.substack.com, liderar.substack.com y fleetstreet.substack.com (dos
 * de ellas con insignia de bestseller):
 *
 *   - `showIntroModule`: **false en 4 de 4.** Es el estado de serie de los
 *     diseños `newspaper` y `magaziney`. NO hay regla para esto.
 *   - `no_index` / `no_follow`: false en 4 de 4. Nadie se lo pone. La regla
 *     existe y casi nunca salta, y así está bien: cuando salta, importa.
 *   - `has_recommendations`: true en 4 de 4, pero `show_recs_on_homepage` solo en
 *     3 de 4. La regla mira lo segundo, que es lo que se ve.
 *   - Testimonios en la página de bienvenida: 0, 2, 2 y 3. **La mayoría los
 *     usa**, así que no tenerlos sí es un hueco.
 *   - CTA duro dentro de los posts: 0/3, 0/3, 1/3 y 1/3. **Nadie lo hace de forma
 *     consistente**, así que es `oportunidad` y no un fallo. Y el post más
 *     reciente de Kloshletter no lleva ninguno pero cierra con «Respóndeme a este
 *     correo»: la regla solo salta si no hay NI duro NI blando.
 *   - Subtítulo de más de 160 caracteres (lo que corta Google): 3 de 4. Tan común
 *     que no es un defecto; se enseña como evidencia y no como hallazgo.
 *   - `search_engine_title` y `search_engine_description`: 0 de 5. Títulos de más
 *     de 60 caracteres: 5 de 5, y las que mejor van más largos. Botón
 *     "Suscribirse" de serie: las 5.
 *
 * La muestra son CUATRO publicaciones: sirve para descartar lo que hace todo el
 * mundo, no para afinar una severidad concreta. Si aparece un caso que desmienta
 * una, hay con qué cambiarla — con datos, no por intuición.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const RULES: Rule[] = [
	// --- CONSTANCIA: lo único de la lista que de verdad mata ---
	{
		id: 'sin-publicaciones',
		dimension: 'constancia',
		severity: 'grave',
		effort: 'tarde',
		evaluate: ({ m }) =>
			m.posts === 0
				? {
						hecho: 'No hay ninguna publicación.',
						propuesta:
							'Publica una. Cuenta cómo has llegado hasta aquí y qué vas a mandar cada semana: es el post que más se lee de cualquier newsletter y solo se puede escribir al principio.'
					}
				: null
	},
	{
		id: 'historial-corto',
		dimension: 'constancia',
		severity: 'medio',
		effort: 'semanas',
		evaluate: ({ m }) =>
			m.posts > 0 && m.posts < 3
				? {
						hecho:
							m.posts === 1
								? 'Solo hay una publicación: aún no hay historial que juzgar.'
								: `Solo hay ${m.posts} publicaciones: aún no hay historial que juzgar.`,
						propuesta:
							'Llega a cinco antes de tocar nada más. Con menos no hay forma de saber qué funciona y qué fue casualidad.'
					}
				: null
	},
	{
		id: 'abandonada',
		dimension: 'constancia',
		severity: 'grave',
		effort: 'tarde',
		evaluate: ({ m }) =>
			m.posts >= 3 && m.daysSinceLast > ABANDONED_DAYS
				? {
						hecho: `Hace ${m.daysSinceLast} días que no se publica. Desde fuera esto parece abandonado.`,
						evidencia:
							'Es lo único de esta lista que hace que un lector nuevo se vaya sin suscribirse.',
						propuesta: `Manda uno esta semana y reconoce el hueco en la primera línea: «Llevo ${m.daysSinceLast} días sin escribir. Te cuento por qué». Rinde más que volver como si no hubiera pasado nada.`
					}
				: null
	},
	{
		id: 'cadencia-irregular',
		dimension: 'constancia',
		severity: 'medio',
		effort: 'tarde',
		evaluate: ({ m }) =>
			m.posts >= 3 &&
			m.daysSinceLast <= ABANDONED_DAYS &&
			m.cadenceMaxDays >= m.cadenceMedianDays * 3 &&
			m.cadenceMaxDays - m.cadenceMinDays > 7
				? {
						hecho: 'La cadencia es irregular: el lector no sabe cuándo esperarte.',
						evidencia: `huecos de ${m.cadenceMinDays} a ${m.cadenceMaxDays} días, mediana ${m.cadenceMedianDays}`,
						propuesta: `Elige un día fijo y escríbelo en el subtítulo (Settings → Publication details → Short description). Con tu ritmo actual, uno cada ${m.cadenceMedianDays} días es lo que ya estás cumpliendo. «Los martes» es una promesa que se puede cumplir; «cuando tenga algo» no.`
					}
				: null
	},
	{
		id: 'longitud-inestable',
		dimension: 'constancia',
		severity: 'leve',
		effort: 'tarde',
		evaluate: ({ m }) =>
			m.posts >= 3 && m.wordsMin > 0 && m.wordsMax > m.wordsMin * 4
				? {
						hecho: 'La longitud baila mucho de un post a otro: cuesta saber a qué te comprometes.',
						evidencia: `de ${m.wordsMin} a ${m.wordsMax} palabras`,
						propuesta: `Ponte un suelo y un techo alrededor de tu mediana (${m.wordsMedian} palabras) y respétalo. Lo que se sale por arriba se parte en dos entregas.`
					}
				: null
	},

	// --- PROMESA: qué se lleva, para quién, cada cuánto ---
	{
		id: 'sin-nombre',
		dimension: 'promesa',
		severity: 'grave',
		effort: 'minutos',
		evaluate: ({ snapshot }) =>
			!snapshot.name.trim()
				? {
						hecho: 'La publicación no tiene nombre.',
						propuesta:
							'Settings → Publication details → Name. Dos o tres palabras que se puedan repetir de memoria.'
					}
				: null
	},
	{
		id: 'nombre-con-espacios',
		dimension: 'promesa',
		severity: 'medio',
		effort: 'minutos',
		evaluate: ({ snapshot }) =>
			snapshot.name.trim() && snapshot.name !== snapshot.name.trim()
				? {
						hecho: 'El nombre lleva espacios sobrantes.',
						evidencia: `${JSON.stringify(snapshot.name)} — se cuela en el asunto de cada correo que envías`,
						propuesta:
							'Settings → Publication details → Name. Borra el espacio del principio o del final y guarda. Dos minutos.'
					}
				: null
	},
	{
		id: 'sin-subtitulo',
		dimension: 'promesa',
		severity: 'grave',
		effort: 'minutos',
		evaluate: ({ snapshot }) =>
			!snapshot.tagline.trim()
				? {
						hecho: 'No hay subtítulo: el nombre tiene que explicarse solo, y casi nunca puede.',
						propuesta:
							'Settings → Publication details → Short description. Una frase con qué manda esto, para quién y cada cuánto. Substack la usa también como descripción en Google, así que la misma sirve para las dos cosas.'
					}
				: null
	},
	{
		id: 'sin-descripcion-buscadores',
		dimension: 'promesa',
		severity: 'medio',
		effort: 'minutos',
		evaluate: ({ snapshot }) =>
			snapshot.tagline.trim() && !snapshot.metaDescription.trim()
				? {
						hecho: 'La portada no tiene descripción para buscadores.',
						evidencia: 'Sin ella, Google elige un trozo del texto a su gusto.',
						propuesta:
							'Settings → Publication details → Short description. Substack la usa también como descripción de la portada, así que la misma frase te sirve para las dos cosas.'
					}
				: null
	},
	{
		id: 'sin-remitente',
		dimension: 'promesa',
		severity: 'leve',
		effort: 'minutos',
		// Solo salta si está VACÍO. Que el remitente sea distinto del nombre de la
		// publicación NO es un fallo: Kloshletter manda como "Carlos de Kloshletter"
		// y es la que mejor va del conjunto medido.
		evaluate: ({ snapshot }) =>
			!snapshot.emailFromName.trim() && snapshot.posts.length > 0
				? {
						hecho: 'No hay nombre de remitente: en la bandeja sales solo como la publicación.',
						propuesta:
							'Settings → Emails → Sender name. Pon tu nombre y el de la publicación juntos, del tipo «Carlos de Kloshletter». Se abre más un correo de una persona que de una marca.'
					}
				: null
	},

	// --- PRUEBA: por qué alguien debería creerte ---
	{
		id: 'sin-biografia',
		dimension: 'prueba',
		severity: 'medio',
		effort: 'minutos',
		evaluate: ({ snapshot }) =>
			!snapshot.authorBio.trim()
				? {
						hecho: 'El autor no tiene biografía. Nadie sabe por qué debería creerte.',
						evidencia: 'La tienen las 4 publicaciones medidas.',
						propuesta:
							'Settings → tu perfil → Bio. Tres frases: qué haces, por qué sabes de esto y qué manda esta newsletter. Sin currículum ni «apasionado de».'
					}
				: null
	},
	{
		// 3 de 4 publicaciones medidas SÍ tienen testimonios (0, 2, 2, 3). Se queda
		// en `oportunidad` y no en `medio` porque cuatro publicaciones no dan para
		// subirlo: haría falta ver que las que los tienen convierten mejor, y eso
		// desde fuera no se ve.
		id: 'sin-testimonios',
		dimension: 'prueba',
		severity: 'oportunidad',
		effort: 'tarde',
		evaluate: ({ snapshot, m }) =>
			snapshot.welcomeBlurbs === 0 && m.posts >= 5
				? {
						hecho: 'No hay ni un testimonio en la página de bienvenida.',
						evidencia:
							'3 de las 4 publicaciones medidas los tienen. Es lo que más pesa cuando alguien duda.',
						propuesta:
							'Settings → Welcome page → Testimonials. Pide a tres lectores que digan en una frase por qué la leen: responde a tu propio correo preguntándolo, que es donde ya te contestan. Vale una frase de cada uno con su nombre.'
					}
				: null
	},
	{
		id: 'sin-recomendaciones-en-portada',
		dimension: 'prueba',
		severity: 'oportunidad',
		effort: 'minutos',
		evaluate: ({ snapshot, m }) =>
			!snapshot.showRecsOnHomepage && m.posts >= 5
				? {
						hecho: 'Las recomendaciones no se ven en tu portada.',
						evidencia: '3 de las 4 publicaciones medidas las enseñan.',
						propuesta:
							'Settings → Recommendations → activa mostrarlas en la portada. Recomienda tú a tres publicaciones de tu tema: la mayoría devuelve la recomendación, y de ahí sale el crecimiento más barato que hay en Substack.'
					}
				: null
	},
	{
		id: 'nada-legible-sin-pagar',
		dimension: 'prueba',
		severity: 'medio',
		effort: 'minutos',
		evaluate: ({ m }) =>
			m.posts >= 3 && m.freePosts === 0
				? {
						hecho: 'Ningún post se puede leer sin pagar.',
						evidencia: `los ${m.posts} leídos están detrás del muro`,
						propuesta:
							'Abre los dos o tres que más interacción tienen: en cada uno, ⋯ → Manage → Audience → Everyone. Nadie paga por algo que no ha podido probar, y esos son justo los que mejor te venden.'
					}
				: null
	},

	// --- CONTENIDO: si el archivo cumple lo que promete la portada ---
	{
		id: 'posts-sin-subtitulo',
		dimension: 'contenido',
		severity: 'medio',
		effort: 'minutos',
		evaluate: ({ m }) =>
			m.posts >= 3 && m.postsWithSubtitle < m.posts
				? {
						hecho: 'Hay posts sin subtítulo. Es la segunda línea que decide si se abre el correo.',
						evidencia: `${m.postsWithSubtitle} de ${m.posts} lo tienen`,
						propuesta:
							'En el editor, el campo gris justo debajo del título. Si lo dejas vacío, Substack mete ahí las primeras palabras del texto, que casi nunca son las que venden.'
					}
				: null
	},
	{
		id: 'sin-interaccion',
		dimension: 'contenido',
		severity: 'medio',
		effort: 'semanas',
		evaluate: ({ m }) =>
			m.posts >= 3 && m.reactions === 0 && m.comments === 0
				? {
						hecho: 'Ni una reacción ni un comentario en los últimos posts.',
						propuesta:
							'Termina el próximo con una pregunta concreta —no «¿qué opinas?»— y responde a todo el que conteste el primer día. Los comentarios arrancan cuando se ve que hay alguien al otro lado.'
					}
				: null
	},
	{
		id: 'interaccion-cayendo',
		dimension: 'contenido',
		severity: 'medio',
		effort: 'semanas',
		evaluate: ({ m }) =>
			m.posts >= 6 &&
			m.engagementFirstHalf > 0 &&
			m.engagementSecondHalf < m.engagementFirstHalf * 0.6
				? {
						hecho: 'La interacción está cayendo.',
						evidencia: `de ${m.engagementFirstHalf} a ${m.engagementSecondHalf} por post entre tu mitad más antigua y la más reciente`,
						propuesta: m.bestPost
							? `Tu post con más respuesta es «${m.bestPost.title}» (${m.bestPost.engagement}). Escribe el siguiente sobre eso mismo, un paso más adentro. La caída suele ser que te has ido del tema que funcionaba.`
							: 'Vuelve al tema de tus posts con más respuesta. La caída suele ser que te has ido de lo que funcionaba.'
					}
				: null
	},

	// --- CONVERSIÓN: lo que decide que alguien deje su correo ---
	{
		// Rarísimo (0 de 4), y cuando pasa se lleva por delante todo lo demás de
		// buscadores. Por eso la regla existe aunque casi nunca salte.
		id: 'no-indexable',
		dimension: 'conversion',
		severity: 'grave',
		effort: 'minutos',
		evaluate: ({ snapshot }) =>
			snapshot.noIndex || snapshot.noFollow
				? {
						hecho: snapshot.noIndex
							? 'Le has dicho a Google que no te indexe.'
							: 'Le has dicho a Google que no siga tus enlaces.',
						evidencia:
							'Con esto puesto, nada de lo que escribas aparece en una búsqueda. Es un interruptor, no un ajuste fino.',
						propuesta:
							'Settings → Publication details → Search engine indexing. Quítalo y guarda. Un minuto, y es lo primero de esta lista.'
					}
				: null
	},
	{
		id: 'boton-generico',
		dimension: 'conversion',
		severity: 'oportunidad',
		effort: 'minutos',
		evaluate: ({ snapshot }) => {
			const cta = snapshot.buttons.map((b) => b.toLowerCase().trim());
			return cta.length && cta.some((b) => GENERIC_CTA.includes(b))
				? {
						hecho: 'El botón dice "Suscribirse" y no promete nada.',
						evidencia:
							'Es el que Substack pone por defecto y lo llevan las 5 publicaciones medidas. Decir qué llega y cada cuánto convierte mejor que un trámite.',
						propuesta:
							'El de la portada lo fija Substack, pero el que insertas dentro de un post sí lleva el texto que quieras (en el editor: Button → Button text). Ahí pon qué llega y cada cuánto.'
					}
				: null;
		}
	},
	{
		// La más delicada del registro. Ver la calibración: nadie pone CTA duro de
		// forma consistente, y la que mejor va no pone ninguno — cierra invitando a
		// responder. Solo salta si NO hay ni duro ni blando.
		id: 'posts-sin-cta',
		dimension: 'conversion',
		severity: 'oportunidad',
		effort: 'minutos',
		needsBodies: true,
		evaluate: ({ bodies }) => {
			if (bodies.length < 2) return null;
			const withCta = bodies.filter((b) => CTA_HARD.test(b.html) || CTA_SOFT.test(tail(b.html)));
			return withCta.length === 0
				? {
						hecho: 'Ninguno de tus posts pide nada al terminar.',
						evidencia: `revisados los ${bodies.length} más recientes: ni botón insertado ni invitación a responder`,
						propuesta:
							'Cierra el próximo con una sola cosa: o un botón (en el editor, Button → Button text, con qué llega y cada cuánto) o una pregunta concreta con «respóndeme a este correo». Las dos funcionan; ninguna de las dos es «gracias por leer».'
					}
				: null;
		}
	},
	{
		id: 'sin-logo',
		dimension: 'conversion',
		severity: 'medio',
		effort: 'minutos',
		evaluate: ({ snapshot }) =>
			!snapshot.hasLogo
				? {
						hecho: 'No hay logo.',
						evidencia: 'Lo tienen las 4 publicaciones medidas.',
						propuesta:
							'Settings → Publication details → Logo, cuadrado y de 256×256 como mínimo. Es lo que aparece junto a tu nombre en la bandeja de Gmail.'
					}
				: null
	},
	{
		id: 'color-de-fabrica',
		dimension: 'conversion',
		severity: 'leve',
		effort: 'minutos',
		evaluate: ({ snapshot }) =>
			snapshot.brandColor?.toUpperCase() === SUBSTACK_ORANGE
				? {
						hecho: 'El color de acento es el naranja de fábrica de Substack.',
						evidencia:
							'Lo llevan 3 de las 5 publicaciones medidas, así que no desentona. Es identidad, no urgencia.',
						propuesta: 'Settings → Publication details → Accent color. Un minuto.'
					}
				: null
	},
	{
		id: 'sin-secciones',
		dimension: 'conversion',
		severity: 'oportunidad',
		effort: 'minutos',
		evaluate: ({ m }) =>
			!m.sections.length && m.posts >= 10
				? {
						hecho: 'No hay secciones: con este volumen el archivo es una lista plana.',
						evidencia: `${m.posts} posts sin agrupar`,
						propuesta:
							'Settings → Sections. Dos o tres, no diez, y que se distingan de un vistazo. Sirven para que alguien pueda suscribirse solo a una parte.'
					}
				: null
	},
	{
		// Las 4 reglas de buscadores colapsadas en una.
		id: 'buscadores-sin-usar',
		dimension: 'conversion',
		severity: 'oportunidad',
		effort: 'minutos',
		evaluate: ({ m, snapshot }) => {
			if (!m.posts) return null;
			const sinSeo = m.seoTitlesFilled === 0 && m.seoDescriptionsFilled === 0;
			const parcial = m.seoTitlesFilled < m.posts || m.seoDescriptionsFilled < m.posts;
			if (!sinSeo && !parcial) return null;

			const extra: string[] = [];
			if (m.titlesOverLimit) {
				extra.push(
					`${m.titlesOverLimit} de tus títulos pasan de ${TITLE_MAX} caracteres y Google los corta (el más largo mide ${m.longestTitle})`
				);
			}
			const conStop = snapshot.posts.filter((p) =>
				slugWords(p.slug).some((w) => STOPWORDS.has(w.toLowerCase()))
			);
			if (m.slugsTooLong || conStop.length) {
				extra.push(
					`${m.slugsTooLong} de ${m.posts} URLs pasan de ${SLUG_WORDS_MAX} palabras y llevan artículos`
				);
			}

			return {
				hecho: sinSeo
					? 'Los campos de título y descripción para buscadores están vacíos en todos los posts.'
					: 'Hay posts sin título o descripción para buscadores.',
				evidencia: [
					sinSeo
						? 'Ninguna de las 5 publicaciones medidas los usa, incluidas dos de las más leídas de España. Por eso está libre: es tráfico de Google que nadie recoge.'
						: `títulos ${m.seoTitlesFilled}/${m.posts}, descripciones ${m.seoDescriptionsFilled}/${m.posts}`,
					...extra
				].join('. '),
				propuesta:
					`En cada post: ⋯ → Manage → SEO. Son dos campos aparte del título de verdad, así que el título del post no cambia: te quedas con los dos. El de buscadores por debajo de ${TITLE_MAX} caracteres y la descripción entre 150 y 160. Empieza por los tres que más interacción tienen, que son los que más tráfico dejan.` +
					(m.slugsTooLong
						? ' Y en los próximos, antes de publicar: ⋯ → Manage → URL slug, tres o cuatro palabras sin artículos. En los ya publicados NO lo cambies, que rompes los enlaces que otros te han puesto.'
						: '')
			};
		}
	}
];

/** El orden del informe: por gravedad, y dentro de cada nivel como venían. */
const SEVERITY_ORDER: Record<Severity, number> = {
	grave: 0,
	medio: 1,
	leve: 2,
	oportunidad: 3
};

export function bySeverity(a: AuditItem, b: AuditItem): number {
	return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
}

/** Corre las reglas medidas. Las que necesitan cuerpos se saltan solas si no hay. */
export function runMeasured(ctx: AuditContext): AuditItem[] {
	const items: AuditItem[] = [];

	for (const rule of RULES) {
		if (rule.needsBodies && !ctx.bodies.length) continue;
		const found = rule.evaluate(ctx);
		if (!found) continue;

		items.push({
			rule: rule.id,
			dimension: rule.dimension,
			severity: rule.severity,
			effort: rule.effort,
			origen: 'medido',
			...found
		});
	}

	return items.sort(bySeverity);
}

/** Lo que devuelve el modelo por cada hallazgo abierto, antes de verificarlo. */
export type RawOpenFinding = {
	dimension?: string;
	severity?: string;
	hecho?: string;
	cita?: string;
	propuesta?: string;
	esfuerzo?: string;
};

/**
 * El candado del canal abierto: la cita tiene que existir en el material.
 *
 * Es una comparación de cadenas, barata y brutal. Un hallazgo cuya cita no
 * aparece se cae entero — no se intenta rescatar, porque si el modelo se inventó
 * la prueba no hay razón para creerse el resto.
 *
 * `verifyQuote` y `normalizeQuoteText` viven en `$lib/tools/quotes` — `repurpose`
 * necesita el mismo candado y duplicarlo habría sido pedir que las dos copias
 * dejaran de coincidir con el tiempo.
 */

const SEVERITIES = new Set<string>(['grave', 'medio', 'leve', 'oportunidad']);
const EFFORTS = new Set<string>(['minutos', 'tarde', 'semanas']);

/**
 * Convierte lo que devolvió el modelo en hallazgos, descartando lo que no se
 * sostiene: sin hecho, sin propuesta, con dimensión o gravedad inventadas, o con
 * una cita que no aparece en el material.
 *
 * Devuelve también los descartados y por qué, para poder verlo en los logs: si un
 * día la mitad se cae, hay que saberlo y no enterarse por un informe corto.
 */
export function openFindings(
	raw: RawOpenFinding[] | undefined,
	haystack: string
): { items: AuditItem[]; dropped: string[] } {
	const items: AuditItem[] = [];
	const dropped: string[] = [];
	const normalized = normalizeQuoteText(haystack);

	for (const f of raw ?? []) {
		const hecho = f.hecho?.trim();
		const propuesta = f.propuesta?.trim();
		const cita = f.cita?.trim();

		if (!hecho || !propuesta) {
			dropped.push(`sin hecho o sin propuesta: ${JSON.stringify(hecho ?? '')}`);
			continue;
		}
		if (!f.dimension || !(f.dimension in DIMENSIONS)) {
			dropped.push(`dimensión inválida (${f.dimension}): ${hecho}`);
			continue;
		}
		if (!f.severity || !SEVERITIES.has(f.severity)) {
			dropped.push(`gravedad inválida (${f.severity}): ${hecho}`);
			continue;
		}
		if (!cita || !verifyQuote(cita, normalized)) {
			dropped.push(`cita no encontrada en el original: ${hecho}`);
			continue;
		}

		items.push({
			rule: 'abierto',
			dimension: f.dimension as Dimension,
			severity: f.severity as Severity,
			hecho,
			evidencia: cita,
			propuesta,
			effort: f.esfuerzo && EFFORTS.has(f.esfuerzo) ? (f.esfuerzo as Effort) : 'tarde',
			origen: 'abierto'
		});
	}

	return { items, dropped };
}

/**
 * El resumen del informe: estado, recuentos y nada más.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AQUÍ HABÍA UNA NOTA SOBRE 100. SE QUITÓ, Y NO POR IMPRECISA.
 *
 * Se probaron dos fórmulas y las dos fallaron por el mismo motivo de fondo:
 *
 *   1. Sumar las penalizaciones de los hallazgos. Con ~14 reglas funcionaba; al
 *      ampliar el conjunto, nadaimporta.substack.com —39.000 suscriptores,
 *      bestseller, ningún hallazgo grave— sacaba **2 sobre 100**.
 *   2. Promediar cinco dimensiones. Una publicación abandonada 101 días
 *      aprobaba con 71.
 *
 * El defecto es estructural: **cualquier agregado sobre los hallazgos empeora
 * cuando el descubrimiento mejora.** Con un canal abierto, el número de hallazgos
 * es variable y no acotado, así que una nota castigaría a la publicación por que
 * nosotros auditemos mejor. Y la prueba final: el tool le daba 92 a Kloshletter
 * donde la auditoría escrita a mano de la misma publicación le daba 55.
 *
 * Lo que queda es defendible frase a frase: un estado que sale de una regla de
 * una línea, y recuentos, que son hechos y no juicios. Si alguien vuelve a querer
 * un número, tiene que resolver primero el problema de arriba.
 * ─────────────────────────────────────────────────────────────────────────
 */
export type Tally = {
	/** `roto` si hay algo grave, `fugas` si hay fallos y `sano` si solo queda terreno libre. */
	state: 'roto' | 'fugas' | 'sano';
	total: number;
	grave: number;
	medio: number;
	leve: number;
	oportunidad: number;
	/** Cuántos son fallos de verdad, o sea todo menos `oportunidad`. */
	defects: number;
	/** Cuántos se hacen hoy: minutos de trabajo y no son terreno libre. */
	quickWins: number;
	byDimension: Record<Dimension, { total: number; worst: Severity | null }>;
};

export function isQuickWin(item: Pick<AuditItem, 'effort' | 'severity'>): boolean {
	return item.effort === 'minutos' && item.severity !== 'oportunidad';
}

export function tally(items: AuditItem[]): Tally {
	const count = (s: Severity) => items.filter((i) => i.severity === s).length;
	const grave = count('grave');
	const medio = count('medio');
	const leve = count('leve');
	const oportunidad = count('oportunidad');

	const byDimension = {} as Tally['byDimension'];
	for (const dimension of Object.keys(DIMENSIONS) as Dimension[]) {
		const mine = items.filter((i) => i.dimension === dimension).sort(bySeverity);
		byDimension[dimension] = { total: mine.length, worst: mine[0]?.severity ?? null };
	}

	return {
		state: grave > 0 ? 'roto' : medio + leve > 0 ? 'fugas' : 'sano',
		total: items.length,
		grave,
		medio,
		leve,
		oportunidad,
		defects: grave + medio + leve,
		quickWins: items.filter(isQuickWin).length,
		byDimension
	};
}
