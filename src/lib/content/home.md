---
# OJO: estos textos del formulario YA NO SE USAN en la home. El alta la hace
# el iframe de Substack. Solo vuelven a valer si pones el formulario propio
# ($lib/components/SubscribeForm.svelte) y le pasas estos valores.
placeholder: tu@email.com
button: Mándame el primero
sending: Enviando...
success: Míralo en tu correo. Ya está ahí.
error: Algo falló al enviar. Inténtalo de nuevo en un momento.
errorOffline: No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.
errorNotConfigured: El formulario aún no está configurado. Inténtalo de nuevo más tarde.
signature: Damian Soto

# Sección de herramientas (debajo del formulario)
toolsTitle: Herramientas
toolsIntro: Las que uso yo para trabajar. Me las hago para facilitarme la vida y las dejo aquí por si te sirven. Esta lista va a ir creciendo.

# ─────────────────────────────────────────────────────────────
# NOTAS PARA TI (esto no se publica: las líneas con # se ignoran)
#
# 0. DATOS CONFIRMADOS POR TI (no los cambies sin querer):
#    Salida 6pm de Surinam, desembarco 9pm del día siguiente = 27 horas
#    en el bote. Tres aviones hasta Porto Alegre y a Uruguay en auto.
#    Un año hasta volver a estar con tus hijos.
#
# 1. CÓMO FUNCIONA EL ALTA
#    La home usa el iframe de Substack: el alta va directa allí y este repo
#    no ve el email. Ya NO hay cron; 00-03.md no los envía nadie, son tus
#    borradores para los posts de Objeto Brillante (00.md es el que deberías
#    poner como correo de bienvenida en Substack).
#
#    Sigue existiendo la otra vía, sin usar: SubscribeForm.svelte contra
#    /api/subscribe, que guarda en Resend y manda 00.md al momento. El tool
#    /tool/7-frameworks SÍ la usa: da de alta en Resend, no en Substack.
#
# 2. LAS HERRAMIENTAS se editan en src/lib/tools/list.ts. Añades un objeto y
#    aparece sola en la home. El título y la entradilla de la sección están
#    aquí arriba (toolsTitle / toolsIntro).
#
# 3. FALTAN PRUEBAS. Ni un cliente, ni una cifra. Una línea real —"esto se lo
#    monté a un taller de Montevideo"— vale más que medio texto de abajo.
#    Va justo antes de "Déjame tu email".
#
# 4. LA FOTO ya está optimizada: 1100x1100 WebP, 108 KB (antes 801 KB).
#    El original sin tocar está en src/lib/assets/los-sotos-original.jpg.
#
# 5. POR QUÉ ESTÁ ESCRITO ASÍ
#    La historia va primero porque es lo único que nadie más puede contar.
#
#    ES "SIN DECÍRSELO A MIS AMIGOS", NUNCA "A NADIE".
#    "A nadie" mete a tu mujer en el mismo saco y la salida se lee como un
#    abandono. Ella lo sabía. No lo toques.
#
#    "No te cuento esto para que me tengas lástima" es la línea que salva
#    la historia de sonar a queja. Si la quitas, recorta la historia.
#
# 6. TITULARES ALTERNATIVOS:
#    - Del Amazonas a tu buzón.
#    - Veintisiete horas en un bote para acabar escribiéndote un email
#      a la semana.
# ─────────────────────────────────────────────────────────────
---

# Desde el Amazonas hasta tu buzón.

En 2022 salí de Cuba en un avión a Surinam. Solo. Sin decírselo a mis amigos. Dejando atrás a mi mujer y a mis dos hijos.

Estuve en Amazonas en un bote junto a 24 cubanos por más de 27 horas escondido para llegar a Brasil. Tres vuelos para llegar a Porto Alegre en la frontera sur. Y finalmente entré a Uruguay.

Y todo comenzó. Buscar trabajo. Donde vivir. Trámites. 

<img src="/los-sotos.webp" alt="Damian Soto con sus dos hijos" width="1100" height="1100" loading="lazy" decoding="async">

Estos son los míos. Tardé un año en volver a verlos.

No te cuento esto para que me tengas lástima.

Te lo digo porque solo quien ha dejado todo y empieza de cero sabe que nada es imposible.

Para eso escribo el **Objeto Brillante** donde te cuento cómo armar tu carpeta de herramientas IA que trabajan para tí. 

No escribo bonito. Escribo lo que sé.

Si lo que quieres es una master class, 10 prompts o una plantilla, cierra la pestaña y olvidame. No soy tu maestro

Pero si quieres la historia completa, déjame tu email. 

Si te canso, un clic y desaparezco.

**Damian**
