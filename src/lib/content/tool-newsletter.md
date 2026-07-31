---
# Textos de /tool/newsletter. Edítalos aquí; no hay copy escrito en el .svelte.
urlPlaceholder: tunewsletter.substack.com
urlButton: Evaluar
urlScanning: Leyendo...
restart: Probar con otra

# --- El estado ---
# NOTA: report.ts lee estas mismas claves para el correo. Si cambias una
# etiqueta aquí, cambia en los dos sitios a la vez, que es justo lo que se
# quería: antes la pantalla decía «De qué va tu newsletter» y el correo «Lo que
# se entiende», y parecían dos informes distintos.
#
# YA NO HAY NOTA SOBRE 100. Se quitó porque cualquier número agregado sobre los
# hallazgos empeora cuando el tool encuentra más cosas, y porque se desviaba 37
# puntos de la auditoría escrita a mano (docs/auditoria-de-referencia.md). El
# motivo largo está en `tally`, en src/lib/tools/newsletter/rules.ts.
readLine: Auditado {site}.
stateNote: Ordenado por gravedad, no por dimensión: lo de arriba es lo que más cuesta dejar sin arreglar.

# --- Las cifras ---
labelPosts: Posts
labelEvery: Cada
labelLast: Último
labelEngagement: Interacción

# --- La tarjeta que ve quien comparte el enlace ---
labelCard: Así te ve quien comparte tu enlace
cardNoImage: Sin imagen: la tarjeta sale como un enlace de texto pelado
cardNoName: (sin nombre)
cardNoTagline: (sin subtítulo: aquí no sale nada)

# --- Los bloques de juicio ---
labelAudience: Para quién escribes
audienceNote: Esto sale solo de lo que enseñas. Si no es a quien tenías en la cabeza, el problema no es el lector.
labelNiche: De qué va tu newsletter

# --- El primer hallazgo, el único que va completo ---
# {total} se sustituye por el número de hallazgos.
labelFirst: El primero de {total}
labelFix: Cómo se arregla

# --- Lo que queda tapado. {rest} es cuántos son. ---
labelLocked: Los otros {rest}

# --- El muro ---
gateTitle: Con su arreglo escrito, uno por uno
# {rest} y {quickWins} se sustituyen por números.
gateBody: Te mando la auditoría entera por correo: los {rest} hallazgos que quedan, cada uno con la cita de dónde lo he visto y el arreglo escrito. {quickWins} se hacen hoy mismo.
gateBodyClean: No he encontrado nada más, y eso ya es raro. Te mando la auditoría entera de todas formas, con lo que sí se puede afilar escrito y listo para pegar. Dame tu correo.
gatePlaceholder: tu@email.com
gateButton: Mándamelo
gateSending: Enviando...
sentTitle: Va para tu correo
sentBody: El informe completo, enviado. Si en un par de minutos no lo ves, mira en spam.

# --- Errores ---
errorUnreadable: No he podido leer esa dirección. Tiene que ser una publicación de Substack.
errorDisposable: Eso es un buzón de usar y tirar. Dame uno de verdad, que es donde te mando el informe.
errorInvalidEmail: Ese email no parece válido.
errorSendFailed: No he podido enviarte el correo. Inténtalo otra vez.
errorRateLimit: Has evaluado unas cuantas ya. Espera un rato y vuelve.
errorGeneric: Algo ha fallado por mi parte. Inténtalo otra vez.
errorOffline: No se pudo conectar. Revisa tu conexión.
---

# Auditoría de tu newsletter.

**Pega la dirección de tu Substack.** Leo tus últimos números enteros y te digo qué está mal, con qué gravedad y cómo se arregla. El primer hallazgo, con su arreglo escrito, en pantalla.

Cada cosa que señalo va con la cita de dónde lo he visto. Si no puedo citarlo, no te lo cuento. No te pido acceso a tus estadísticas.
