---
# UI strings for /course/[slug]. Shared by EVERY course: nothing about Cris or
# about money belongs here. Anything specific to one course lives in
# src/lib/courses/<creator>/course.ts.
#
# src/lib/courses/report.ts reads this same file for the email labels, the way
# newsletter/report.ts does. That's what stops the screen and the email from
# calling the same thing by two different names. If you delete a key the email
# falls back to a default and stops matching the screen: change it, don't remove it.
#
# The creator is never named in these strings. Attribution is one credit line
# (creditPrefix, filled in by the runner) and the reference links. A course that
# name-drops every paragraph reads like a summary about someone, not a course.

# --- Cover ---
disclaimerLabel: Antes de empezar
startButton: Empezar
# The one credit line. The runner appends the publication and the creator's name.
creditPrefix: Curso construido sobre el contenido de

# --- Navigation ---
moduleCounter: Módulo {n} de {total}
next: Siguiente
back: Atrás
finishStep: Terminar

# --- Why "Siguiente" is still disabled ---
# A dead button that explains nothing reads as broken. These sit next to it.
# {amount} is formatted as euros by the runner; {n} is a count.
pendingEstimateGuess: Contesta con una cifra para seguir.
pendingEstimateRows: Pon al menos un gasto y pulsa «Ver la cifra».
pendingBudgetIncome: Pon lo que te entra al mes.
pendingBudgetShort: Te faltan {amount}. Baja alguna categoría.
pendingBudgetOver: Te sobran {amount}. Ese dinero también tiene que ir a algún sitio.
pendingCasesOne: Te queda una por contestar.
pendingCasesMany: Te quedan {n} por contestar.

# --- References. The chip on each link: what's open and what needs a subscription. ---
refsTitle: De dónde sale esto
refFree: Abierto
refPaid: Suscriptores

# --- Cases ---
# Never "correct" or "wrong". The course explains a mechanism; it does not grade
# what anyone does with their money. Swap these for right/wrong answers and the
# whole framing goes with them.
caseAnswer: La respuesta
caseYours: Tu respuesta
caseAgree: Has dado con ello
caseDiffer: No va por ahí

# --- Estimate ---
# The guess is MONTHLY. It used to be annual and that was the wrong question:
# the annual figure is exactly the one nobody has, which is what the module
# teaches. See the comment on estimateVerdict in engine.ts before changing it.
estGuessPlaceholder: Euros al mes
estGuessButton: Seguir
estGuessLabel: Lo que creías
estRealLabel: Lo que suman de verdad
estAnnualLabel: Y eso, al año
estPerYear: al año
estPerMonth: al mes
estConceptPlaceholder: Concepto
estAmountPlaceholder: €/mes
estAddRow: Añadir otro
estRemove: Quitar
estCompute: Ver la cifra
estBreakdown: Uno a uno, al año
estBreakdownNote: Ninguno de estos es un error. La pregunta no es si son caros, es si los has elegido.
estUnnamed: Sin nombre

# --- Budget ---
budAmountPlaceholder: €
budRate: Estás apartando el {rate}% de lo que entra.
budOverspentHint: No cuadra: hay más salidas que entradas. Algo tiene que bajar, y esa es la decisión.
budLeftoverHint: Todavía sobra. Ese dinero también tiene que ir a algún sitio, aunque sea al ahorro.
budIncome: Lo que entra
budSavings: Lo que apartas
budCategories: Y el resto
budUnbalancedNote: Esto no llegó a cuadrar del todo.

# --- The email wall ---
# It does not send a score. It sends what the person did and the links: see the
# long note in report.ts for why there is no grade.
gateTitle: Te lo mando por correo
gateBody: Tus cifras, lo que has contestado y los enlaces para seguir leyendo. Para que no dependa de esta pestaña.
gateNote: Sin nota y sin valoración. Son tus números, no un examen.
gatePlaceholder: tu@email.com
gateButton: Mándamelo
gateSending: Enviando...
sentTitle: Va para tu correo
sentBody: Si en un par de minutos no lo ves, mira en spam.

# --- Report ---
reportSkipped: Este módulo te lo saltaste.

# --- Errors ---
errorInvalidEmail: Ese email no parece válido.
errorDisposable: Eso es un buzón de usar y tirar. Dame uno de verdad, que es donde te lo mando.
errorSendFailed: No he podido enviarte el correo. Inténtalo otra vez.
errorRateLimit: Has pedido unos cuantos ya. Espera un rato y vuelve.
errorGeneric: Algo ha fallado por mi parte. Inténtalo otra vez.
errorOffline: No se pudo conectar. Revisa tu conexión.
---
