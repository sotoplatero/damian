import type { Course } from '../types';

/**
 * "El dinero no desaparece" — built on the content of Cris, Una Chica en Finanzas.
 *
 * The strings below are Spanish because they are course content. Everything
 * around them is English. See the Language section of CLAUDE.md.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHERE THIS CAME FROM
 *
 * From reading her archive, not from guessing what she writes about. There was
 * an earlier six-module map (emergency fund → couples → idle money → index funds
 * → mortgage → second home) and it was WRONG, for two reasons you only see by
 * looking at what she actually publishes:
 *
 *   1. She already sells a course: "Los Primeros 100.000€ sin Cuentos Chinos",
 *      €6.50/month. This does not compete with it. It feeds it.
 *   2. It treated her as an investing-and-property writer. She isn't. Her spine
 *      is budgeting and spending control. Investing and mortgages show up almost
 *      only as READER QUESTIONS in "Resuelvo tus dudas", not as what she teaches.
 *      That map built three of six modules on the thinnest part of her content —
 *      and on the part every other finance writer already covers.
 *
 * HER THESIS, IN HER WORDS: "el problema no es la disciplina. Es el diseño."
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THREE RULES WHEN EDITING THIS FILE
 *
 *   - HER NAME DOES NOT APPEAR IN THE BODY. Not in the intros, not in the
 *     reveals, not in the disclaimer. Attribution is the one credit line the
 *     runner prints at the foot of the page, plus the reference links. A course
 *     that name-drops every paragraph reads as a summary about someone; this
 *     reads as a course. And for the same reason there are NO VERBATIM QUOTES:
 *     an unattributed quote would be publishing her sentences as ours.
 *   - NO ANSWER IS INVENTED. Every `reveal` comes from a post that was actually
 *     read. A fourth candidate case was dropped because its answer sat behind
 *     the paywall and could not be checked: three true cases beat four with one
 *     guessed. If you can't verify the reading, there is no case.
 *   - EVERY MODULE CARRIES REFERENCES, and the `paid` ones are the point. They
 *     are the handoff to what she sells, and the only metric she can judge in
 *     two minutes.
 * ─────────────────────────────────────────────────────────────────────────
 */

const SUB = 'https://unachicaenfinanzas.substack.com';

export const course: Course = {
	slug: 'el-dinero-no-desaparece',
	title: 'El dinero no desaparece',
	tagline: 'Va a algún sitio. El problema es que no sabes dónde.',

	creator: {
		name: 'Cris',
		publication: 'Una Chica en Finanzas',
		url: SUB
	},

	disclaimer:
		'Esto no es asesoramiento financiero. Son ejercicios para que hagas cuentas con ' +
		'tus propios números y decidas tú. Nadie aquí sabe cuánto ganas, qué debes ni a ' +
		'qué te dedicas, así que ninguna de las decisiones se toma sola.',

	handoff: {
		title: 'Hasta aquí llega esto',
		text:
			'Has cerrado la ecuación una vez, con tus números. El método completo —la ' +
			'plantilla, las categorías y lo que hace que no lo abandones en febrero— está ' +
			'contado entero en el curso del que sale todo esto. Aquí solo te lo hemos hecho ' +
			'notar.',
		reference: {
			title: 'Los Primeros 100.000€ sin Cuentos Chinos',
			url: `${SUB}/subscribe`,
			audience: 'paid'
		}
	},

	modules: [
		/* ───────────────────────── 1 ───────────────────────── */
		{
			id: 'bucket',
			title: 'El cubo con agujeros',
			intro:
				'Un cubo de playa agujereado: da igual cuánta agua eches si no tapas los ' +
				'agujeros. Antes de mirar los tuyos, arriésgate a una cifra.',
			interaction: {
				kind: 'estimate',
				// SE PREGUNTA AL MES, NO AL AÑO. Ver el comentario de `estimateVerdict`:
				// la cifra anual es justo la que nadie tiene, y pedirla de entrada era
				// contradecir lo que el módulo enseña. El ×12 llega al final.
				guessLabel: '¿Cuánto se te va cada mes en gastos pequeños que se repiten?',
				guessHint:
					'A ojo y sin mirar la cuenta. Suscripciones, cuotas, cargos automáticos, ' +
					'lo de siempre. En euros al mes.',
				rowsLabel: 'Ahora ponlos uno a uno, en euros al mes.',
				rowsHint:
					'No hace falta que estén todos ni que la cifra sea exacta. Con los que te ' +
					'vengan a la cabeza ya funciona.',
				suggestions: [
					'Netflix',
					'Spotify',
					'Gimnasio',
					'Café de camino al trabajo',
					'Tarifa del móvil',
					'Peluquería',
					'Eso que no recuerdas haber contratado'
				],
				revealUnder:
					'Al mes te habías quedado corto, y suele pasar por lo mismo: no por ' +
					'equivocarte en lo que cuesta cada cosa, sino por olvidarte de dos o tres. ' +
					'Pero mira la cifra de abajo, que es la que casi nadie tiene en la cabeza. ' +
					'Cuarenta euros al mes de cualquier cosa —una manicura, un café diario, una ' +
					'suscripción que ya no usas— son 480€ al año.',
				revealOver:
					'Al mes te has pasado, que es más raro y dice algo bueno: ya sospechabas de ' +
					'estos cargos. Aun así, mira la cifra de abajo. Esa es la que no se piensa ' +
					'nunca, porque el banco te la cobra en trozos de diez euros.',
				revealClose:
					'Al mes le has acertado, así que ya miras dónde va tu dinero. La cifra que ' +
					'probablemente no habías puesto nunca es la de abajo: la misma cantidad, ' +
					'contada como se decide de verdad.'
			},
			references: [
				{
					title: 'Tu problema no es que gastes mucho',
					url: `${SUB}/p/tu-problema-no-es-que-gastes-mucho`,
					audience: 'paid'
				},
				{
					title: '1.700€ a plazos. Hoy ni lo pensamos.',
					url: `${SUB}/p/1700-a-plazos-hoy-ni-lo-pensamos`,
					audience: 'paid'
				},
				{
					title: 'Empieza aquí',
					url: `${SUB}/p/empieza-aqui-a30`,
					audience: 'free'
				}
			]
		},

		/* ───────────────────────── 2 ───────────────────────── */
		{
			id: 'budget',
			title: 'Tu yo del pasado',
			intro:
				'Un presupuesto que sale de la versión ideal de ti se abandona en febrero. ' +
				'Este sale de lo que gastaste de verdad. Y el ahorro se pone primero, antes ' +
				'que los gastos: ahí está toda la diferencia.',
			interaction: {
				kind: 'budget',
				incomeLabel: 'Lo que te entra al mes, limpio',
				incomeHint: 'Nómina, ingresos, lo que sea. La cifra con la que cuentas de verdad.',
				savingsLabel: 'Lo que vas a ahorrar cada mes',
				savingsHint:
					'Esto va aquí, antes de los gastos, y no al final. El ahorro no es lo que ' +
					'sobra: es una categoría más, como el alquiler o el supermercado. Si lo ' +
					'dejas para el final pones lo que sobre, y lo que sobra es cero.',
				categoriesLabel:
					'Y ahora los gastos, con lo que gastaste de media los últimos tres meses',
				categories: [
					{ id: 'housing', label: 'Vivienda', hint: 'Alquiler o hipoteca, comunidad, seguro.' },
					{ id: 'utilities', label: 'Suministros', hint: 'Luz, agua, gas, internet, móvil.' },
					{
						id: 'groceries',
						label: 'Supermercado',
						hint: 'La compra de casa, sin contar salir a comer.'
					},
					{
						id: 'transport',
						label: 'Transporte',
						hint: 'Gasolina, abono, seguro y mantenimiento del coche.'
					},
					{
						id: 'leisure',
						label: 'Restaurantes y ocio',
						hint: 'Aquí es donde se miente. Si fueron 200€, pon 200€, no 80€.'
					},
					{
						id: 'shopping',
						label: 'Compras y caprichos',
						hint: 'Ropa, cosas para casa, lo del módulo anterior.'
					},
					{ id: 'other', label: 'Otros', hint: 'Lo que no encaja arriba y sabes que existe.' }
				],
				overspentLabel: 'Te faltan',
				leftoverLabel: 'Te sobran',
				balancedLabel: 'La ecuación cierra',
				reveal:
					'Eso es todo lo que hace un presupuesto: obligarte a decidir una vez, en ' +
					'frío, en lugar de descubrirlo a final de mes. Si para cuadrarlo has tenido ' +
					'que bajar una categoría, esa decisión la acabas de tomar tú y no el día 28.'
			},
			references: [
				{
					title: 'Tu yo del pasado es tu mejor guía',
					url: `${SUB}/p/tu-yo-del-pasado-es-tu-mejor-guia`,
					audience: 'paid'
				},
				{
					title: 'El presupuesto no es una dieta para tu cuenta corriente',
					url: `${SUB}/p/el-presupuesto-no-es-una-dieta-para`,
					audience: 'paid'
				}
			]
		},

		/* ───────────────────────── 3 ───────────────────────── */
		{
			id: 'design',
			title: '¿Disciplina o diseño?',
			intro:
				'Tres situaciones reales de gente que preguntó qué hacer. Antes de leer la ' +
				'respuesta, decide tú. No hay una regla que sirva para todo el mundo, pero en ' +
				'cada una hay algo que sí se puede señalar.',
			interaction: {
				kind: 'cases',
				items: [
					{
						id: 'two-weeks',
						situation:
							'«Sé que debería ahorrar más pero cada vez que lo intento duro dos ' +
							'semanas y lo abandono. ¿Es un problema de disciplina o hay algo más?»',
						question: '¿Qué está fallando aquí?',
						options: [
							{ id: 'a', label: 'La disciplina. Hay que apretar más y aguantar el tirón.' },
							{ id: 'b', label: 'El método: está ahorrando a final de mes.' },
							{ id: 'c', label: 'El sueldo. Con lo que gana no da para ahorrar.' }
						],
						answerId: 'b',
						reveal:
							'No es fuerza de voluntad. Ahorrar a final de mes no funciona porque el ' +
							'cerebro se gasta lo que ve disponible, y a final de mes no queda nada ' +
							'que apartar. La alternativa es el preahorro: una transferencia ' +
							'automática el día que cobras, antes de gastar nada. Es lo mismo que no ' +
							'tener cerveza en la nevera — no se resiste la tentación, se quita de en ' +
							'medio. Y se empieza por una cifra pequeña, porque una que duele se ' +
							'abandona en dos semanas. Otra vez.'
					},
					{
						id: 'fund-never-grows',
						situation:
							'«Cada vez que consigo ahorrar algo para el fondo de emergencia, me toca ' +
							'meter mano en él por algún imprevisto y siento que no avanzo nunca.»',
						question: '¿Qué le dirías?',
						options: [
							{ id: 'a', label: 'Que no avanza porque le falta constancia.' },
							{
								id: 'b',
								label:
									'Que el fondo está funcionando — y que parte de esos imprevistos no lo son.'
							},
							{ id: 'c', label: 'Que no lo toque hasta tenerlo lleno del todo.' }
						],
						answerId: 'b',
						reveal:
							'Dos cosas. La primera: tirar del fondo de emergencia no es fracasar, es ' +
							'el fondo haciendo su trabajo. Para eso está. La segunda es la que casi ' +
							'nadie ve — buena parte de esos «imprevistos» son perfectamente ' +
							'previsibles. Un electrodoméstico tiene una vida útil conocida y Hacienda ' +
							'es segura. Eso no va al fondo de emergencia: va a provisiones aparte. ' +
							'Una lavadora de 600€ que dura 8 años son 6€ al mes. Y lo de Hacienda, ' +
							'lo que pagaste el año pasado dividido entre doce. Así el fondo deja de ' +
							'absorber cosas que nunca fueron emergencias.'
					},
					{
						id: 'second-home',
						situation:
							'«Me han subido el sueldo 800€ al mes. No somos muy ahorradores, así que ' +
							'me planteo comprar una segunda vivienda para alquilarla más adelante.»',
						question: '¿Dónde está el problema?',
						options: [
							{ id: 'a', label: 'En ningún sitio, si la hipoteca no pasa del 30% del sueldo.' },
							{ id: 'b', label: 'En la frase «no somos muy ahorradores».' },
							{ id: 'c', label: 'En que con 800€ no se compra una segunda vivienda.' }
						],
						answerId: 'b',
						reveal:
							'Lo del 30% es una métrica razonable, así que el número no es lo que hace ' +
							'saltar la alarma. Es la frase de en medio. Comprar para alquilar porque ' +
							'no se sabe ahorrar es usar una hipoteca como ahorro forzoso, y una ' +
							'hipoteca no perdona un mes malo. Primero se resuelve por qué esos 800€ ' +
							'no se quedan en ningún sitio. La segunda vivienda es una conversación ' +
							'posterior.'
					}
				]
			},
			references: [
				{
					title: 'Resuelvo tus dudas (I)',
					url: `${SUB}/p/resuelvo-tus-dudas-i`,
					audience: 'paid'
				},
				{
					title: 'Resuelvo tus dudas (II)',
					url: `${SUB}/p/resuelvo-tus-dudas-ii`,
					audience: 'paid'
				},
				{
					title: 'El día que tu lavadora y tu coche se mueran a la vez',
					url: `${SUB}/p/el-dia-que-tu-lavadora-y-tu-coche`,
					audience: 'paid'
				}
			]
		},

		/* ───────────────────────── 4 ───────────────────────── */
		{
			id: 'frivolous',
			title: 'Lo frívolo no es el objeto',
			intro:
				'El último módulo desmonta lo que casi todo el mundo traía al entrar aquí: ' +
				'que ahorrar consiste en recortar. No lo es. Y un caso real lo demuestra ' +
				'mejor que cualquier argumento.',
			interaction: {
				kind: 'cases',
				items: [
					{
						id: 'coffee-vs-wine',
						situation:
							'Alguien repasa sus gastos recurrentes. Mantiene el Nespresso de 45€ al ' +
							'mes y cancela una suscripción de vino de 40€ al mes. Casi el mismo ' +
							'dinero, decisiones opuestas.',
						question: '¿Qué distingue una de la otra?',
						options: [
							{ id: 'a', label: 'El precio: 45€ y 40€ no son lo mismo.' },
							{ id: 'b', label: 'Que una es necesidad y la otra un capricho.' },
							{
								id: 'c',
								label: 'Que una la eligió, y la otra era un cargo que seguía corriendo.'
							}
						],
						answerId: 'c',
						reveal:
							'Ninguna de las dos es una necesidad y las dos cuestan lo mismo. La ' +
							'diferencia es que una estaba decidida y la otra solo pasaba. Por eso la ' +
							'pregunta de este curso nunca es «¿cuánto cuesta?» sino «¿lo he decidido ' +
							'yo?». Un gasto caro y elegido no es un problema. Uno barato en piloto ' +
							'automático sí lo es, aunque no aparezca en ninguna lista de recortes.'
					},
					{
						id: 'netflix',
						situation:
							'Un Netflix de 10€ al mes. Lleva años cobrándose y lo has visto en el ' +
							'extracto cien veces sin hacer nada.',
						question: '¿Qué es lo que hace que por fin decidas sobre él?',
						options: [
							{ id: 'a', label: 'Nada: 10€ al mes no es el problema, hay cosas mayores.' },
							{ id: 'b', label: 'Verlo al año —120€— y decidir sobre esa cifra.' },
							{ id: 'c', label: 'Cancelarlo, porque todo gasto recurrente sobra.' }
						],
						answerId: 'b',
						reveal:
							'Fíjate en que las otras dos opciones se parecen más de lo que aparentan: ' +
							'ninguna decide nada. Una lo deja correr y la otra recorta por norma. El ' +
							'movimiento es cambiar la unidad —10€ al mes no significan nada y 120€ al ' +
							'año sí— y decidir sobre la cifra que sí significa algo. Sobre 120€ al ' +
							'año puedes decir que sí perfectamente. Lo que no puedes es no haberlo ' +
							'mirado.'
					},
					{
						id: 'what-now',
						situation:
							'Ya tienes tu cifra del primer módulo y tu presupuesto del segundo. ' +
							'Delante tienes la lista entera de lo que se te va cada mes.',
						question: '¿Qué haces con ella?',
						options: [
							{ id: 'a', label: 'Recortar todo lo que puedas hasta que la cifra baje.' },
							{ id: 'b', label: 'Elegir cuáles se quedan porque los quieres y cuáles se van.' },
							{ id: 'c', label: 'Guardarla y no volver a mirarla: solo genera culpa.' }
						],
						answerId: 'b',
						reveal:
							'La primera opción es una dieta, y las dietas se abandonan por la misma ' +
							'razón: la prohibición se te vuelve en contra. La tercera es exactamente ' +
							'lo que tenías antes de empezar. Gastar dinero no es malo. Lo que se ' +
							'busca aquí no es que gastes menos, es que cada euro que sale de tu ' +
							'cuenta sea una decisión tuya. A veces eso hace que gastes menos. A veces ' +
							'solo hace que dejes de sentirte mal por lo que gastas a propósito.'
					}
				]
			},
			references: [
				{
					title: 'El presupuesto no es una dieta para tu cuenta corriente',
					url: `${SUB}/p/el-presupuesto-no-es-una-dieta-para`,
					audience: 'paid'
				},
				{
					title: 'El guía de mi Luna de Miel me llamó pobre y se rió en mi cara',
					url: `${SUB}/p/el-guia-de-mi-luna-de-miel-me-llamo`,
					audience: 'free'
				}
			]
		}
	]
};
