export const NOTE_MAX_CHARS = 700;

export type NoteFormat = {
	id: string;
	name: string;
	bestFor: string;
	hint: string;
	example: string;
	needsQuote?: boolean;
};

export const FREE_IDS = ['idea-central', 'contradiccion', 'leccion-practica'] as const;

export const formats: NoteFormat[] = [
	{
		id: 'idea-central',
		name: 'Idea central',
		bestFor: 'Hacer circular la tesis más fuerte',
		hint: 'Expresa la tesis más fuerte como una nota autónoma. Elige la extensión y la estructura que la idea pida.',
		example: 'El primer 10K no se prepara aprendiendo a sufrir más. Se prepara aprendiendo a salir más despacio.'
	},
	{
		id: 'detalle-revelador',
		name: 'Detalle revelador',
		bestFor: 'Abrir el artículo desde un dato, ejemplo o escena pequeña',
		hint: 'Aísla un dato, gesto, ejemplo o escena pequeña que deje ver una idea mayor sin resumir el artículo.',
		example: 'En la cuarta semana dejé las zapatillas junto a la puerta. No para acordarme de correr. Para quitarme una excusa.'
	},
	{
		id: 'contradiccion',
		name: 'Contradicción',
		bestFor: 'Mostrar lo que el artículo coloca al revés de lo esperado',
		hint: 'Encuentra una expectativa que el artículo contradiga y haz visible la tensión sin forzar una fórmula de gancho.',
		example: 'Pensaba que prepararme era correr cada vez más. Mejoré cuando empecé a terminar con ganas de seguir.'
	},
	{
		id: 'historia',
		name: 'Historia',
		bestFor: 'Distribuir una escena o experiencia concreta',
		hint: 'Cuenta una escena o experiencia que ya esté en el artículo. Conserva sus hechos y no la conviertas en una moraleja completa.',
		example: 'En el kilómetro seis miré el reloj y supe que había salido al ritmo de otro. Los cuatro restantes los hice andando.'
	},
	{
		id: 'consecuencia',
		name: 'Consecuencia',
		bestFor: 'Desarrollar una implicación sustentada por el texto',
		hint: 'Desarrolla una consecuencia razonable de una idea del artículo. Tiene que poder defenderse con el texto aunque no aparezca escrita literalmente.',
		example: 'Si cada entrenamiento termina al límite, faltar un día parece un fracaso. Y un plan que convierte cada tropiezo en fracaso dura poco.'
	},
	{
		id: 'leccion-practica',
		name: 'Lección práctica',
		bestFor: 'Convertir una idea en algo que el lector pueda aplicar',
		hint: 'Extrae una acción concreta sustentada por el artículo. No inventes un método ni añadas pasos por completar una lista.',
		example: 'Haz la primera salida tan corta que te parezca ridícula. Lo difícil esta semana no es avanzar. Es volver a salir.'
	},
	{
		id: 'pregunta',
		name: 'Pregunta',
		bestFor: 'Convertir una tensión real en conversación',
		hint: 'Convierte una tensión verdadera del artículo en una pregunta que admita respuestas distintas. No la uses como cierre automático.',
		example: '¿Qué te hace abandonar antes un plan: que sea difícil o que deje de ser nuevo?'
	},
	{
		id: 'cita-comentada',
		name: 'Cita comentada',
		bestFor: 'Abrir una rendija al artículo con sus propias palabras',
		hint: 'Usa la cita literal verificada y añade solo el contexto que la haga circular. Si no hay cita verificada, parafrasea sin comillas.',
		example: '«El día de la carrera se cobra lo que hiciste en enero.»\n\nLa escribí después de gastar cuatro meses de trabajo en los tres primeros minutos.',
		needsQuote: true
	},
	{
		id: 'puerta-articulo',
		name: 'Puerta al artículo',
		bestFor: 'Despertar curiosidad y llevar al texto completo',
		hint: 'Abre una curiosidad real y conduce al artículo. Decide cómo introducir la URL según el tono de la nota; no anuncies contenido nuevo de forma genérica.',
		example: 'La semana en que más gente abandona su primer 10K no es la más dura. Es la primera que resulta aburrida.\n\nHe escrito qué cambia ahí y cómo atravesarla:\nhttps://ejemplo.com/primer-10k'
	}
];

export const freeFormats = formats.filter(({ id }) =>
	FREE_IDS.includes(id as (typeof FREE_IDS)[number])
);
export const gatedFormats = formats.filter(
	({ id }) => !FREE_IDS.includes(id as (typeof FREE_IDS)[number])
);
export const GATED_IDS = gatedFormats.map(({ id }) => id);

export function findFormat(id: string): NoteFormat | undefined {
	return formats.find((format) => format.id === id);
}
