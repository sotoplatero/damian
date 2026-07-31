/**
 * Los nueve formatos en los que se reparte un artículo.
 *
 * `id` es la clave que devuelve el modelo en su JSON. Si tocas un `id` aquí, el
 * prompt se entera solo: `prompt.ts` se construye a partir de esta lista.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AQUÍ NO HAY FUENTE QUE AUDITAR, Y ES A PROPÓSITO.
 *
 * `7-frameworks` y `10-post-types` sacan sus definiciones de un artículo concreto,
 * y ahí un `hint` no se toca sin volver a la fuente. Esta herramienta NO: los nueve
 * formatos son nuestros, para no quedar atados a un solo contenido. Al pie de la
 * página se citan dos referencias —Vilma Núñez y Natalia Papiol— como crédito de
 * lectura, no como esqueleto. Las fórmulas de gancho vienen del motor de Cervantes,
 * que es material propio: se adapta, no se cita.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * El `hint` dice CÓMO se escribe el formato, no qué es: es lo que lee el modelo.
 *
 * El `example` es nuestro, y los nueve van sobre EL MISMO tema ajeno (preparar un
 * primer 10K, igual que en `10-post-types/types.ts`) para que se lea como «el mismo
 * artículo, nueve piezas» y quede lejos del tema de cualquier usuario: lo que tiene
 * que copiar el modelo es la forma, no el asunto. Cada `example` se usa dos veces —
 * como ancla en el prompt y en la tarjeta bloqueada de la página.
 *
 * `needsQuote` marca las dos piezas que se apoyan en una frase literal del artículo.
 * Las dos están detrás del muro por un motivo técnico, no comercial: la frase se
 * verifica contra el artículo DESPUÉS de que el modelo responda, y en el paso gratis
 * la pieza y la frase salen de la misma llamada — la comprobación llegaría cuando la
 * cita ya está en pantalla. Detrás del muro se verifica antes de escribirlas.
 */

export type Channel = 'substack' | 'x' | 'linkedin';

/** El orden en que se agrupan los canales en la página y en el correo. */
export const CHANNELS: { id: Channel; name: string }[] = [
	{ id: 'substack', name: 'Notas de Substack' },
	{ id: 'x', name: 'Posts de X' },
	{ id: 'linkedin', name: 'Posts de LinkedIn' }
];

export type Format = {
	id: string;
	channel: Channel;
	/** Lo que se lee en la tarjeta. */
	name: string;
	/** Para qué sirve esta pieza, en una línea. Se enseña en pantalla y en el correo. */
	bestFor: string;
	/** Cómo se escribe. Esto es lo que lee el modelo. */
	hint: string;
	/** Nuestro, sobre otro tema. Se enseña en las tarjetas bloqueadas. */
	example: string;
	/** Tope de la plataforma, cuando lo hay de verdad. */
	maxChars?: number;
	/** Se apoya en una frase literal del artículo. */
	needsQuote?: boolean;
	/** Puede llevar el enlace al artículo. Solo el teaser. */
	linksToArticle?: boolean;
};

/** Las tres que se regalan: una por canal, y ninguna que dependa de una cita. */
const FREE_IDS = ['nota-pregunta', 'x-corto', 'in-gancho'];

export const formats: Format[] = [
	{
		id: 'nota-pregunta',
		channel: 'substack',
		name: 'Nota con pregunta',
		bestFor: 'Abrir conversación con quien ya te lee',
		hint: `Coge la duda que resuelve el artículo y devuélvesela al lector como pregunta abierta, sin resolverla. Dos o tres frases, cada una en su línea y por debajo de 55 caracteres, que es lo que se lee de un golpe en el móvil. Termina preguntando, no afirmando: esta nota vive de lo que contesten.`,
		example: `Llevo tres meses corriendo y sigo sin poder con cinco kilómetros seguidos.

Un amigo me dice que pare y camine treinta segundos cada kilómetro. Que así llego antes a los diez.

Me suena a trampa. ¿Vosotros paráis o aguantáis?`
	},
	{
		id: 'nota-cita',
		channel: 'substack',
		name: 'Nota con cita',
		bestFor: 'Enseñar el artículo por una rendija',
		needsQuote: true,
		hint: `Abre con la frase literal del artículo, sola en su línea y entre comillas. Debajo, dos o tres líneas de por qué la escribiste o de dónde salió. No resumas el artículo: esta nota enseña una frase, no un índice. Si no te han dado una frase literal, escribe la idea con tus palabras y sin comillas.`,
		example: `«El día de la carrera no se gana nada: se cobra lo que hiciste en enero.»

Escribí esa frase después de reventar mi primer 10K por salir a un ritmo que no era el mío.

Lo que se entrena no son las piernas. Es la paciencia.`
	},
	{
		id: 'nota-teaser',
		channel: 'substack',
		name: 'Nota que lleva al artículo',
		bestFor: 'Mandar tráfico al artículo entero',
		linksToArticle: true,
		hint: `Una línea que abra un hueco —lo que el lector todavía no sabe— y otra que diga qué se lleva si entra. Después el enlace, solo en su línea. Nada de «nuevo post», «os dejo por aquí» ni «link en los comentarios». Es la ÚNICA pieza de las nueve que lleva enlace.`,
		example: `Casi todo el que abandona su primer 10K lo deja en la semana cuatro. Y no es por las piernas.

He escrito qué pasa esa semana y qué hacer para que no te pase.

https://ejemplo.com/primer-10k`
	},
	{
		id: 'x-corto',
		channel: 'x',
		name: 'Post corto',
		bestFor: 'La idea que se entiende sin contexto',
		maxChars: 280,
		hint: `Una sola idea del artículo, la que se sostenga sin explicar nada antes. Tiene que caber en 280 caracteres contando espacios y saltos de línea. Sin hashtags, sin enlace y sin segunda parte: si necesita continuar, esta no es la pieza.`,
		example: `Nadie abandona su primer 10K por falta de piernas.

Lo dejan la semana en que entrenar ya no es novedad y todavía no es costumbre.

Esa semana no se corre. Se aguanta.`
	},
	{
		id: 'x-largo',
		channel: 'x',
		name: 'Post largo',
		bestFor: 'El argumento entero, de una vez',
		maxChars: 2500,
		hint: `El argumento del artículo completo, en un post que se lea de arriba abajo. Párrafos de una o dos líneas con una línea en blanco entre ellos. Abre con la afirmación más incómoda del artículo, desarrolla, y cierra con la frase que quieres que la gente repita. Sin numerar, sin enlace y sin anunciar que es un hilo: no lo es, es un post largo que se publica de una vez.`,
		example: `Te vas a apuntar a un 10K y vas a empezar corriendo más de lo que deberías.

Lo sé porque lo hice yo.

Semana uno: sales tres días y vuelves eufórico.

Semana dos: te duele algo y lo ignoras.

Semana cuatro: llueve, no te apetece, y descubres que la motivación se ha ido a otra parte.

Ahí se cae la gente. No en el kilómetro nueve de la carrera.

Lo que funciona es de un aburrimiento insultante: salir despacio, salir corto y salir aunque no toque ganas.

El día de la carrera no se gana nada. Se cobra.`
	},
	{
		id: 'x-cita',
		channel: 'x',
		name: 'La frase, sola',
		bestFor: 'Lo que se retuitea sin leer el resto',
		maxChars: 280,
		needsQuote: true,
		hint: `La frase literal del artículo, sola, sin comillas y sin nada detrás que la explique. Se publica desnuda: si necesita una línea de aclaración, elige otra frase. Si no te han dado una frase literal, escribe la afirmación más rotunda del artículo con tus palabras.`,
		example: `El día de la carrera no se gana nada: se cobra lo que hiciste en enero.`
	},
	{
		id: 'in-gancho',
		channel: 'linkedin',
		name: 'Gancho e historia',
		bestFor: 'Que alguien que no te sigue pulse «ver más»',
		hint: `Las dos primeras líneas son todo: LinkedIn corta ahí con el «ver más», así que ahí va la escena o la afirmación, nunca el contexto. Detrás, la historia en párrafos de una línea, en pasado y con lo que se sintió. Cierra con la frase que resume, sin pedir nada. Sin emojis, sin «¿te ha pasado?» y sin «spoiler:».`,
		example: `Mi primer 10K lo terminé andando.

Había entrenado cuatro meses.

Salí a un ritmo que no era el mío porque el de delante iba a ese, y en el kilómetro seis se me apagó la luz.

Los últimos cuatro los hice mirando el suelo y calculando cuánto quedaba.

Cuando cruzas así no piensas en el tiempo. Piensas en por qué no fuiste a lo tuyo.

Cuatro meses de trabajo tirados en los tres primeros minutos.

Nadie se lesiona por ir despacio.`
	},
	{
		id: 'in-lista',
		channel: 'linkedin',
		name: 'Lista de aprendizajes',
		bestFor: 'Lo que se guarda para después',
		hint: `Una línea de entrada que diga cuántas cosas vienen y de qué. Después un aprendizaje por línea, todos con la misma construcción para que se lean de un barrido, y el más incómodo el último. Nada de numerar con emojis, flechas ni viñetas: línea y punto.`,
		example: `Cinco cosas que aprendí preparando mi primer 10K, y ninguna tiene que ver con correr:

Que la primera semana no cuenta. La primera semana aguanta cualquiera.

Que el día que menos te apetece salir es el que más suma.

Que ir despacio no es entrenar menos, es entrenar sin romperte.

Que el plan que puedes cumplir vale más que el que te impresiona.

Y que si te comparas con el de al lado, sales a su ritmo y acabas andando.`
	},
	{
		id: 'in-caso',
		channel: 'linkedin',
		name: 'Caso con resultado',
		bestFor: 'Demostrar que funciona sin decir que funciona',
		hint: `El resultado primero, en la primera línea, con la cifra si el artículo la trae. Después qué se hizo, en tres o cuatro líneas. El método al final, nunca al principio. Si el artículo NO trae cifras, deja el hueco entre corchetes —«[tu tiempo]», «[X clientes]»— y no lo rellenes: la cifra es de quien escribió el artículo, no tuya.`,
		example: `De no llegar a cinco kilómetros a terminar un 10K en [tu tiempo], en cuatro meses.

Lo que hice: tres salidas por semana, ninguna larga al principio, y una regla — si no puedo hablar mientras corro, voy demasiado rápido.

Sin gimnasio, sin plan de pago y sin reloj caro.

El método, que es lo de menos: correr despacio la mayor parte del tiempo. Eso es todo.`
	}
];

/** Las tres de pantalla, en orden de canal. */
export const freeFormats: Format[] = formats.filter((format) => FREE_IDS.includes(format.id));

/** Las seis del correo. */
export const gatedFormats: Format[] = formats.filter((format) => !FREE_IDS.includes(format.id));

export function findFormat(id: string): Format | undefined {
	return formats.find((format) => format.id === id);
}

/**
 * Agrupa por canal, en el orden de `CHANNELS`, y se salta los canales sin piezas.
 * Lo usan la página y el correo, para que los dos agrupen igual.
 */
export function byChannel(list: Format[]): { channel: Channel; name: string; items: Format[] }[] {
	return CHANNELS.map(({ id, name }) => ({
		channel: id,
		name,
		items: list.filter((format) => format.channel === id)
	})).filter((group) => group.items.length > 0);
}
