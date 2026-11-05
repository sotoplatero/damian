---
name: damiansoto
description: Llama a las herramientas web de damiansoto.me (el sitio de Damian Soto y su newsletter Objeto Brillante) y enseña lo que devuelven. Distribuye un artículo en nueve piezas para LinkedIn o X, saca diez posts de una idea para LinkedIn o X, audita el «Acerca de» de un Substack y descarga el archivo público de una newsletter. Úsalo cuando alguien nombre damiansoto.me, Objeto Brillante o estas herramientas; cuando quiera contenido para LinkedIn o X; cuando pregunte por su página «Acerca de» de Substack; o cuando quiera bajar todo lo que ha publicado una newsletter. No lo uses para escribir, responder o revisar notas de Substack Notes: eso es subnotes.
---

# Las herramientas de damiansoto.me

## Lo primero, porque lo cambia todo

**Este skill no escribe nada. Llama al sitio.** Los prompts, las reglas de voz, los nueve
formatos de nota y los diez tipos de post viven en el servidor de damiansoto.me y no están
aquí. Tú haces la petición y enseñas lo que vuelve.

De ahí salen las tres reglas que no se saltan:

1. **Lo que devuelve el sitio se enseña tal cual.** No lo reescribas, no lo «mejores», no lo
   resumas, no le cambies el orden ni le quites nada. Si algo te parece flojo, dilo aparte y
   deja el texto intacto: quien lo lee tiene que ver lo mismo que vería en la web.
2. **Las herramientas están partidas en dos y la mitad de pago LLEGA AL CORREO.** El paso
   gratis sale por aquí; el otro devuelve «enviado» y nada más. No es un fallo y no hay manera
   de sacarlo por la terminal. Dilo sin rodeos.
3. **Dar el correo da de alta esa dirección en Objeto Brillante.** Se avisa ANTES de pedirlo,
   nunca después: después ya no le sirve de nada saberlo. Y nunca pidas el correo por tu
   cuenta — solo si la persona quiere la otra mitad.

## Elige el trabajo

Cada uno tiene su ficha en `reference/`, junto a este archivo. Léela antes de llamar: cada una
dice qué comando lanzar, qué vuelve y cómo se enseña.

| Lo que te piden | Lee |
|---|---|
| «Tengo un artículo y quiero sacarle notas», «distribúyelo», «repártelo en redes» | `reference/distribuir-articulo.md` |
| «Tengo una idea y quiero varios posts», «diez posts de este tema», «ideas de contenido» | `reference/diez-posts.md` |
| «Mi Acerca de / About de Substack no convierte», «reescribe mi presentación» | `reference/acerca-de-substack.md` |
| «Bájame el archivo de esta newsletter», «quiero leer todo lo que ha publicado X» | `reference/archivo-newsletter.md` |
| «¿Quién es Damian?», «¿qué es Objeto Brillante?», «¿qué hay en el sitio?» | `reference/sitio.md` |

Si lo que piden no está en esa tabla, dilo. No lo improvises desde aquí.

## Los dos scripts

Los dos están en `scripts/`, sin dependencias, con Node 18 o más nuevo.

- **`damiansoto.mjs`** habla con el sitio. Lo usan las tres primeras fichas. El paso gratis
  guarda su respuesta en un fichero temporal, porque el de pago tiene que devolvérsela entera
  al servidor; por eso **el paso de pago no lleva la entrada otra vez, solo `--email`**.
- **`archivo.mjs`** no llama a nadie: baja el archivo de una newsletter contra Substack, en la
  máquina de quien lo usa. Es el único que no pide correo y el único que no cuesta nada.

Si el sitio no contesta, el script lo dice y para. No te inventes el resultado ni tires de
memoria: sin el servidor, estas tres herramientas no se pueden hacer aquí.

## Lo que esto NO hace, y adónde mandar a la persona

- **La auditoría completa de una newsletter** está a medias en el propio sitio mientras se
  rehace su mitad de juicio. → <https://damiansoto.me/tool/newsletter>
- **Cervantes** es una carpeta aparte que aprende tu voz y escribe tus envíos contigo. No es
  esto. → <https://damiansoto.me/recursos/cervantes>
