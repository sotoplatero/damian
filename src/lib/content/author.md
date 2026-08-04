---
# Textos de /author y /author/[author]. Edítalos aquí; no hay copy en los .svelte.
#
# ESTA TARJETA LLEGA A ALGUIEN QUE NO LA HA PEDIDO. Halaga o sitúa, nunca
# corrige. Si una línea suena a auditoría, está mal escrita: para auditar ya
# está /tool/newsletter.
#
# Por eso NO existe aquí ninguna clave sobre el hueco más largo sin publicar.
# Se descartó a propósito: es el único dato que se lee como reproche, y además
# el que las importaciones de archivo corrompen más (medido: 182 semanas de
# silencio falso en una publicación y 56 en otra, las dos inventadas por
# fechas importadas).
#
# Los suscriptores solo salen si la publicación los enseña en su portada. Si no
# los enseña, no se dice nada: ni el número, ni una etiqueta vaga, ni un hueco.

title: El Wrapped de tu Substack
description: Pega la dirección de un newsletter de Substack y sal con la tarjeta de su historia.
urlPlaceholder: tunewsletter.substack.com
urlButton: Ver la tarjeta
reading: Leyendo su archivo
download: Descargar la tarjeta
restart: Probar con otra

# --- Etiquetas de las cifras ---
# Cortas a propósito: van al lado de un icono y un número grande, no de una
# frase. El contexto lo da el icono, no el texto.
labelPosts: posts
labelStreak: semanas de racha
labelStreakLive: semanas, y sigue activa
labelWords: palabras
labelNovels: ≈ {n} novelas
labelLikes: likes
labelConversation: comentarios
labelFrequency: al mes
labelMostLiked: Más gustado
labelMostCommented: Más comentado
labelLongest: Más largo
labelBestMonth: Su mejor mes
labelWordsTop: Sus palabras
labelYears: Por año
labelHeatmap: Constancia
labelDay: Su día
labelSplit: Gratis / pago
labelSubscribers: suscriptores
labelHeadlineLength: Titulares de {n} caracteres de media.
labelSince: desde
labelInProgress: en curso
labelFree: gratis
labelPaid: pago

# --- Tics del titular ---
signatureQuestion: {n} de cada 10 de sus titulares son una pregunta.
signatureNumber: {n} de cada 10 de sus titulares llevan un número.
signatureColon: {n} de cada 10 de sus titulares llevan dos puntos.
# --- Avisos honestos ---
# Se enseñan cuando toca y no se esconden en un pie: son parte del dato.
noteUtc: Las horas y los días se calculan en UTC.
noteImported: Tiene {n} posts más de un archivo importado, con fechas que no se pueden usar para medir tiempo.
noteTruncated: Su archivo es más largo de lo que se ha podido leer de una vez. Esto sale de los primeros {n} posts.
noteFeed: Substack no ha dejado leer su archivo completo. Esto sale de sus últimos {n} posts, y por eso faltan los likes, los comentarios y el reparto entre gratis y pago.

# --- Firma ---
signature: Hecho por Damian Soto

# --- Errores ---
errorNotSubstack: Esto no parece un Substack. ¿Es la dirección correcta?
errorNotFound: No hay ninguna publicación en esa dirección.
errorBlocked: Substack no ha dejado leer esta publicación ahora mismo. Prueba en un rato.
errorRateLimit: Has mirado muchas por hoy. Vuelve en un rato.
errorTooNew: Esta publicación acaba de empezar. Con {n} posts todavía no hay historia que contar.
---

Pega la dirección de un newsletter de Substack y sale la tarjeta de todo lo que
ha publicado: cuántas semanas seguidas lleva, cuántas palabras ha escrito y qué
post le funcionó mejor.

Solo lee lo que Substack ya enseña en público. No hace falta entrar en ninguna
cuenta.
