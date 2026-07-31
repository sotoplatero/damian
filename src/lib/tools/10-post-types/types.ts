/**
 * Los 10 tipos de post que genera el tool.
 *
 * `id` es la clave que devuelve el modelo en su JSON. Si tocas un `id` aquí,
 * tócalo también en `prompt.ts` — el modelo se guía por esta misma lista.
 *
 * El orden importa: el primero (`practico`) es el que se regala sin pedir email.
 *
 * Los tipos, el para-qué y el cómo salen del artículo de Neal O'Grady
 * "The 10 Types of Posts". Están traducidos y condensados, no calcados: el
 * `hint` es lo que se le pasa al modelo para que escriba ese post, así que dice
 * cómo se hace el tipo, no qué es. Si tocas un `hint`, comprueba antes que sigue
 * diciendo lo que dice la fuente.
 *
 * Cada tipo lleva un `example`: un post entero de ese tipo, escrito a mano. En
 * el artículo, cada tipo va acompañado de una imagen con un ejemplo real (posts
 * de Justin Welsh, Jon Brosio, Lara Acosta, Rob Hoffman...). Esas capturas no se
 * pueden traer ni pegar aquí, así que están reescritas: un ejemplo propio por
 * tipo, todos sobre EL MISMO tema (preparar tu primer 10K) para que se vea la
 * idea del artículo —el mismo tema contado de diez formas— y para que el molde
 * de cada tipo quede claro. El tema del ejemplo es aposta uno cualquiera y
 * lejano: sirve para enseñar la FORMA, no para que el modelo copie el tema.
 *
 * El `example` se usa en dos sitios: se le pasa al modelo como muestra de la
 * forma (prompt.ts) y se enseña en las tarjetas bloqueadas de la página, para
 * que quien entra vea de qué va cada tipo aunque su propio texto vaya al correo.
 *
 * A diferencia de los 7 frameworks, un tipo de post no tiene pasos: cada uno
 * produce UN post entero de una tacada. Por eso aquí no hay `steps`.
 */
export type PostType = {
	id: string;
	/** Nombre tal y como se ve en pantalla. */
	name: string;
	/** Para qué sirve mejor. Una línea. Se muestra bajo el nombre. */
	bestFor: string;
	/** Cómo se escribe ese post. Se lo pasamos al modelo; no se enseña en pantalla. */
	hint: string;
	/** Un post de muestra del tipo, sobre otro tema, para ver el molde. Se enseña y se le pasa al modelo. */
	example: string;
};

export const postTypes: PostType[] = [
	{
		id: 'practico',
		name: 'Práctico',
		bestFor: 'Demuestra que sabes. Un paso a paso de cómo se hace.',
		hint: 'Un paso a paso de cómo hacer algo concreto de tu tema. Que quien lo lea pueda ponerse a hacerlo sin quedarse atascado. Arranca con "Cómo" o "Así hago". Los pasos en orden, cada uno una acción clara.',
		example: `Cómo pasar de cero a correr 10K sin lesionarte.

Corre tres días a la semana, nunca dos seguidos.
Empieza cada salida andando cinco minutos.
Sube el tiempo, no la velocidad: cinco minutos más cada semana.
El día que aguantes 40 minutos seguidos, estás a un mes del 10K.`
	},
	{
		id: 'observacion',
		name: 'Observación',
		bestFor: 'Algo que has visto en tu sector y que nadie más cuenta.',
		hint: 'Una cosa que has notado en tu sector y que otros no están diciendo. Enseña cómo ves tú el mundo. Es una idea, no un tutorial: corta, un solo pensamiento, sin pasos.',
		example: `Casi nadie deja de correr por las piernas. Lo deja por la cabeza.

La primera semana duele todo y parece que no avanzas. Ahí se cae la mayoría.
El cuerpo aguanta más de lo que crees. El que entrena la cabeza, termina.`
	},
	{
		id: 'contraste',
		name: 'Esto vs. aquello',
		bestFor: 'Comparas dos formas de hacerlo y una gana.',
		hint: 'Compara dos cosas: dos formas de hacerlo, el antes y el después, lo que la gente cree contra lo que pasa de verdad. Tú controlas cómo se ve la mala opción y cómo se ve la buena. La buena es hacia donde llevas al lector.',
		example: `Correr rápido pocos días contra correr lento muchos días.

El que sale a tope dos veces por semana acaba reventado y lo deja.
El que trota flojo cuatro veces llega al 10K sin enterarse.
Despacio se llega antes. Suena raro, pero es así.`
	},
	{
		id: 'motivacion',
		name: 'Motivación',
		bestFor: 'No les falta saber más. Les falta que alguien les empuje.',
		hint: 'La gente no necesita más información, necesita que la empujen a moverse. Apunta a lo que quiere de verdad y no siempre dice: estatus, dinero, tiempo libre. Dile que es posible. "Yo lo hice, tú también." Que se sienta capaz al terminar de leer.',
		example: `No necesitas las zapatillas caras ni el reloj bueno. Necesitas salir hoy.

Hay gente con la mitad de tu fondo cruzando metas de 10K cada domingo.
Si ellos pueden, tú puedes. Ponte lo que ya tienes y sal por la puerta.`
	},
	{
		id: 'analisis',
		name: 'Análisis',
		bestFor: 'Desmontas un tema o un caso por dentro.',
		hint: 'Desmonta por dentro un tema, una empresa, una persona o un formato de tu sector. Aquí no dices cómo lo harías tú: analizas cómo lo hizo otro, cómo ha cambiado con los años o qué efecto tiene. Va en profundidad.',
		example: `Por qué casi todos los planes de 10K que hay por internet te lesionan.

Están hechos para gente que ya corría, así que suben el volumen demasiado rápido.
No respetan la regla de no subir más de un 10% por semana.
Por eso la gente aguanta tres semanas y acaba con la rodilla tocada.`
	},
	{
		id: 'lista',
		name: 'Lista',
		bestFor: 'Una lista útil de tu sector. Se guarda y se comparte.',
		hint: 'Una lista de cosas de tu sector: libros, herramientas, gente a seguir, errores que se repiten. Cada punto en su línea, con un porqué corto de para qué le sirve a quien lee. Sin relleno entre puntos.',
		example: `Cinco cosas que sí valen la pena para tu primer 10K:

Unas zapatillas de tu número, probadas andando. Lo demás da igual.
Un plan de ocho semanas, no de cuatro: al cuerpo hay que darle tiempo.
Correr con alguien, para que el día flojo te saque de casa.
Un domingo fijo en el calendario. Sin fecha, no hay carrera.`
	},
	{
		id: 'contracorriente',
		name: 'A contracorriente',
		bestFor: 'Una opinión con pinchos. Divide y atrae a tu tribu.',
		hint: 'Una opinión fuerte y con pinchos: algo se está haciendo mal, o debería hacerse de otra forma. Di lo que los tuyos piensan y no se atreven a decir. Sin miedo a molestar a los del otro bando: esa es la gracia.',
		example: `Correr no es caro. Lo caro es la industria que le han montado encima.

No te hace falta el reloj de 400 euros ni las mallas de compresión.
Te hace falta salir por la puerta. Lo demás es que gastes en vez de correr.`
	},
	{
		id: 'caso',
		name: 'Caso de éxito',
		bestFor: 'El que menos gusta y el que más vende.',
		hint: 'Una prueba de que lo tuyo funciona: un cliente contento, un resultado, un testimonio. Cuenta su problema y cómo lo resolviste. Si en los datos no hay una prueba real, deja un hueco entre corchetes para que la ponga la persona; no te la inventes.',
		example: `Marta llegó diciendo que ella "no servía para correr".

Le costaba subir dos pisos sin ahogarse.
Ocho semanas después cruzó su primer 10K. No cambió de cuerpo, cambió de plan.
[Pon aquí un caso tuyo real: nombre, de dónde salía y en cuánto lo consiguió.]`
	},
	{
		id: 'historia',
		name: 'Historia personal',
		bestFor: 'Una historia tuya. Conecta y vende sin vender.',
		hint: 'Una historia tuya, mejor si es normal y cualquiera se ve en ella. Usa el molde de Pixar: érase una vez, cada día, hasta que un día, por eso, por eso, hasta que al final. Muestra lo que pasó, no lo expliques.',
		example: `Yo tampoco servía para correr.

Cada día me prometía empezar el lunes, y cada lunes lo dejaba para el siguiente.
Hasta que un médico me dijo que tenía el corazón de alguien diez años mayor.
Por eso salí a andar. Luego a trotar. Luego, sin darme cuenta, corría.
El día que crucé mi primer 10K lloré. Ahora ayudo a que otros lleguen a llorar igual.`
	},
	{
		id: 'meme',
		name: 'Meme',
		bestFor: 'Hace reír a los tuyos y refuerza tu punto de vista.',
		hint: 'Un texto con gracia para los tuyos, no para cualquiera con dedos. Adapta un formato de meme a tu tema, o suelta una frase con remate que haga reír y pensar a la vez. Que refuerce tu punto de vista. Como es solo texto: si hace falta, describe la imagen entre paréntesis y debajo va el texto del meme. Una o dos líneas, no más.',
		example: `(Foto de alguien reventado tirado en el sofá)

Yo: mañana salgo a correr sin falta.
El mañana: lleva tres años sin llegar.`
	}
];

/** El que se regala sin pedir email. */
export const freePostType = postTypes[0];

/** Los que quedan detrás del muro. */
export const gatedPostTypes = postTypes.slice(1);

export function findPostType(id: string): PostType | undefined {
	return postTypes.find((type) => type.id === id);
}
