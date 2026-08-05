/**
 * The strings /tool/newsletter shows on screen — AND the section labels the
 * emailed report reuses. report.ts imports this same object on purpose: the
 * screen and the email must name the same blocks the same way. Before this was
 * shared, the screen said «De qué va tu newsletter» and the email «Lo que se
 * entiende», and they read as two different reports.
 *
 * It used to live in src/lib/content/tool-newsletter.md and travel through
 * frontmatter parsing; strings in one module turned out simpler.
 *
 * THERE IS NO SCORE KEY, deliberately: any aggregate number over the findings
 * gets worse as discovery improves, and it drifted 37 points from the
 * hand-written reference audit (not in this repo — it names a real publication
 * and the repo is public; ask Damian for it). The long version lives in
 * `tally`, in ./rules.ts.
 */
export const copy = {
	urlPlaceholder: 'tunewsletter.substack.com',
	urlButton: 'Evaluar',
	urlScanning: 'Leyendo...',
	restart: 'Probar con otra',

	/* The state. */
	readLine: 'Auditado {site}.',
	stateNote:
		'Ordenado por gravedad, no por dimensión: lo de arriba es lo que más cuesta dejar sin arreglar.',

	/* The measured figures. */
	labelPosts: 'Posts',
	labelEvery: 'Cada',
	labelLast: 'Último',
	labelEngagement: 'Interacción',

	/* The share-preview card. */
	labelCard: 'Así te ve quien comparte tu enlace',
	cardNoImage: 'Sin imagen: la tarjeta sale como un enlace de texto pelado',
	cardNoName: '(sin nombre)',
	cardNoTagline: '(sin subtítulo: aquí no sale nada)',

	/* The judgement blocks. */
	labelAudience: 'Para quién escribes',
	audienceNote:
		'Esto sale solo de lo que enseñas. Si no es a quien tenías en la cabeza, el problema no es el lector.',
	labelNiche: 'De qué va tu newsletter',

	/* The first finding, the only one shown whole. {total} is the finding count. */
	labelFirst: 'El primero de {total}',
	labelFix: 'Cómo se arregla',

	/* What stays covered. {rest} is how many. */
	labelLocked: 'Los otros {rest}',

	/* The gate. {rest} and {quickWins} are numbers. */
	gateTitle: 'Con su arreglo escrito, uno por uno',
	gateBody:
		'Te mando la auditoría entera por correo: los {rest} hallazgos que quedan, cada uno con la cita de dónde lo he visto y el arreglo escrito. {quickWins} se hacen hoy mismo.',
	gateBodyClean:
		'No he encontrado nada más, y eso ya es raro. Te mando la auditoría entera de todas formas, con lo que sí se puede afilar escrito y listo para pegar. Dame tu correo.',
	gatePlaceholder: 'tu@email.com',
	gateButton: 'Mándamelo',
	gateSending: 'Enviando...',
	sentTitle: 'Va para tu correo',
	sentBody: 'El informe completo, enviado. Si en un par de minutos no lo ves, mira en spam.',

	/* Errors. */
	errorUnreadable: 'No he podido leer esa dirección. Tiene que ser una publicación de Substack.',
	errorDisposable:
		'Eso es un buzón de usar y tirar. Dame uno de verdad, que es donde te mando el informe.',
	errorInvalidEmail: 'Ese email no parece válido.',
	errorSendFailed: 'No he podido enviarte el correo. Inténtalo otra vez.',
	errorRateLimit: 'Has evaluado unas cuantas ya. Espera un rato y vuelve.',
	errorGeneric: 'Algo ha fallado por mi parte. Inténtalo otra vez.',
	errorOffline: 'No se pudo conectar. Revisa tu conexión.'
};
