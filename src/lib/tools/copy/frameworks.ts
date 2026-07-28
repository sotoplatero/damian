/**
 * Los 7 frameworks de copywriting que genera el tool.
 *
 * `id` es la clave que devuelve el modelo en su JSON, y `steps[].key` las claves
 * de cada bloque dentro de un framework. Si tocas un `key` aquí, tócalo también
 * en `prompt.js` — el modelo se guía por esta misma lista.
 *
 * El orden importa: el primero (`pasp`) es el que se regala sin pedir email.
 */
export type FrameworkStep = {
	key: string;
	/** Nombre del paso tal y como se ve en pantalla. */
	label: string;
	/** Qué tiene que hacer ese paso. Se lo pasamos al modelo y se muestra en las tarjetas bloqueadas. */
	hint: string;
};

export type Framework = {
	id: string;
	name: string;
	/** Para qué sirve mejor. Una línea. */
	bestFor: string;
	steps: FrameworkStep[];
};

export const frameworks: Framework[] = [
	{
		id: 'pasp',
		name: 'PAS(P)',
		bestFor: 'El caballo de batalla. Anuncio, email corto, post.',
		steps: [
			{ key: 'problema', label: 'Problema', hint: 'Nombra el dolor concreto del cliente' },
			{ key: 'agitacion', label: 'Agitación', hint: 'Hurga en él: qué le cuesta seguir así' },
			{ key: 'solucion', label: 'Solución', hint: 'Presenta la oferta como el remedio' },
			{ key: 'prueba', label: 'Prueba', hint: 'Demuestra que funciona' }
		]
	},
	{
		id: 'bab',
		name: 'BAB',
		bestFor: 'Lo más simple. Bio, cabecera de una landing.',
		steps: [
			{ key: 'antes', label: 'Antes', hint: 'Dónde está hoy el cliente' },
			{ key: 'despues', label: 'Después', hint: 'Dónde podría estar' },
			{ key: 'puente', label: 'Puente', hint: 'Cómo lo lleva tu oferta de uno a otro' }
		]
	},
	{
		id: 'story',
		name: 'Storytelling (Pixar)',
		bestFor: 'Caso de éxito, email de historia.',
		steps: [
			{ key: 'erase', label: 'Érase una vez', hint: 'Quién es el protagonista' },
			{ key: 'cadaDia', label: 'Cada día', hint: 'Su rutina, su normalidad' },
			{ key: 'hastaQue', label: 'Hasta que un día', hint: 'Lo que lo rompe todo' },
			{ key: 'porEso1', label: 'Por eso', hint: 'Primera consecuencia' },
			{ key: 'porEso2', label: 'Por eso', hint: 'Segunda consecuencia' },
			{ key: 'finalmente', label: 'Hasta que al final', hint: 'Cómo se resuelve, con tu oferta dentro' }
		]
	},
	{
		id: 'aida',
		name: 'AIDA',
		bestFor: 'Como PAS, pero con un cierre claro.',
		steps: [
			{ key: 'atencion', label: 'Atención', hint: 'Un titular, una pregunta o un dato que frene el scroll' },
			{ key: 'interes', label: 'Interés', hint: 'Engánchalo con algo que le toque' },
			{ key: 'deseo', label: 'Deseo', hint: 'Que se vea usándolo' },
			{ key: 'accion', label: 'Acción', hint: 'Qué hace ahora, y que sea una sola cosa' }
		]
	},
	{
		id: 'pastor',
		name: 'PASTOR',
		bestFor: 'Carta de ventas larga o secuencia de varios emails.',
		steps: [
			{ key: 'problema', label: 'Problema', hint: 'El reto al que se enfrenta' },
			{ key: 'amplificar', label: 'Amplificar', hint: 'Qué pasa si no lo arregla' },
			{ key: 'solucion', label: 'Solución', hint: 'Tu forma de resolverlo' },
			{ key: 'testimonio', label: 'Testimonio', hint: 'Alguien a quien ya le funcionó' },
			{ key: 'oferta', label: 'Oferta', hint: 'Qué se lleva exactamente' },
			{ key: 'respuesta', label: 'Respuesta', hint: 'Qué tiene que hacer para conseguirlo' }
		]
	},
	{
		id: 'cuatroP',
		name: "Las 4 P's",
		bestFor: 'Cuando vendes una transformación.',
		steps: [
			{ key: 'promesa', label: 'Promesa', hint: 'La afirmación grande, concreta' },
			{ key: 'imagen', label: 'Imagen', hint: 'Que se vea con el problema ya resuelto' },
			{ key: 'prueba', label: 'Prueba', hint: 'Datos o testimonios que la sostengan' },
			{ key: 'empujon', label: 'Empujón', hint: 'Por qué hoy y no la semana que viene' }
		]
	},
	{
		id: 'prune',
		name: 'PRUNE',
		bestFor: 'El raro. La analogía lo hace memorable.',
		steps: [
			{ key: 'punto', label: 'Punto', hint: 'Suéltalo de entrada' },
			{ key: 'razon', label: 'Razón', hint: 'Por qué es así' },
			{ key: 'revelacion', label: 'Revelación', hint: 'La prueba, con números si los hay' },
			{ key: 'analogia', label: 'Analogía', hint: 'Es como... — que se le quede grabado' },
			{ key: 'salida', label: 'Salida', hint: 'El cierre y la llamada a la acción' }
		]
	}
];

/** El que se regala sin pedir email. */
export const freeFramework = frameworks[0];

/** Los que quedan detrás del muro. */
export const gatedFrameworks = frameworks.slice(1);

export function findFramework(id: string): Framework | undefined {
	return frameworks.find((f) => f.id === id);
}
