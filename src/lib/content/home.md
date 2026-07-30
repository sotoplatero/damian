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

# Tarjeta que se ve al compartir la portada (se dibuja en /og/home.png).
# El título va grande; el tag es la línea de abajo, al lado del dominio.
ogTitle: Objeto Brillante
ogDescription: Un email a la semana con algo que he hecho con IA en un negocio real y que funciona. Sin cursos ni tutoriales.
ogTag: un email a la semana

# Sección de herramientas (debajo del formulario)
toolsTitle: Herramientas
toolsIntro: Las que uso yo para trabajar. Me las hago para facilitarme la vida y las dejo aquí por si te sirven. Esta lista va a ir creciendo.

# ─────────────────────────────────────────────────────────────
# NOTAS PARA TI (esto no se publica: las líneas con # se ignoran)
#
# 0. DATOS CONFIRMADOS POR TI (no los cambies sin querer):
#    Salida 6pm de Surinam, desembarco 9pm del día siguiente = 27 horas
#    en el bote. Tres aviones hasta Porto Alegre y a Uruguay en auto.
#    Un año hasta volver a estar con tus hijos. Ahora vives en Canadá:
#    Uruguay fue el final de la travesía, no dónde acabaste.
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
# 6. EL TITULAR YA NO ANUNCIA LA TRAVESÍA.
#    Antes era "Desde el Amazonas hasta tu buzón" y el titular presentaba la
#    historia. Ahora presenta la idea (la herramienta no existe, hazla), así
#    que la travesía pasa de ser la promesa a ser tu credencial. Sigue
#    encajando —"quien ha dejado todo y empieza de cero sabe que nada es
#    imposible" es justo el argumento de "hazlo tú"— pero el salto del titular
#    al primer párrafo era seco, así que hay una línea puente después del
#    titular: "Ni la que necesito yo. Así que me la hago." Es la que conecta
#    la idea con la historia. Si la quitas, el corte vuelve.
#
# 7. TITULARES ALTERNATIVOS:
#    - Nadie va a construir la herramienta que te falta.
#    - Cada semana me hago una herramienta. Te cuento cómo.
#    - Me hago las herramientas que no encuentro. Y te las dejo aquí.
#    - Estás pagando por software que podrías hacerte en una tarde.
#    - Desde el Amazonas hasta tu buzón.   (el anterior)
# ─────────────────────────────────────────────────────────────
---

# La herramienta que necesitas no existe.

Ni la que necesito yo. Así que me la hago.

En 2022 salí de Cuba en un avión a Surinam. Solo. Sin decírselo a mis amigos. Dejando atrás a mi mujer y a mis dos hijos.

Estuve en Amazonas en un bote junto a 24 cubanos por más de 27 horas escondido para llegar a Brasil. Tres vuelos para llegar a Porto Alegre en la frontera sur. Y finalmente entré a Uruguay.

Ahora estoy en Canadá.

<img src="/los-sotos.webp" alt="Damian Soto con sus dos hijos" width="1100" height="1100" loading="lazy" decoding="async">

Estos son los míos. Tardé mas de un año en volver a verlos.

No te cuento esto para que me tengas lástima.

Te lo digo porque solo quien ha dejado todo y empieza de cero sabe que nada es imposible.

Para eso escribo el **Objeto Brillante** donde te cuento cómo armar tu carpeta de herramientas IA que trabajan para tí. 

No escribo bonito. Escribo lo que sé.

Si lo que quieres es una master class, 10 prompts o una plantilla, cierra la pestaña y olvidame. No soy tu maestro

Pero si quieres la historia completa, déjame tu email. 

Si te canso, un clic y desaparezco.

**Damian**
