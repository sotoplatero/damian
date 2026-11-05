# El copy de la home — decidido

**Fecha:** 20 de septiembre de 2026
**Para:** la sesión que monte esto en `src/routes/+page.svelte`
**Estado:** el copy está cerrado. El diseño NO.

Este documento es autosuficiente: no hace falta leer la conversación de la que
salió. Lo de arriba son las decisiones cerradas; lo de abajo, el texto listo
para pegar.

---

## 1. De quién es esta página

**Es la página personal de Damian Soto.** No es la web de Objeto Brillante.

Objeto Brillante es la newsletter que Damian escribe, y es el negocio — pero el
sitio es suyo, y la newsletter es una de las cosas que hace. La chapa de arriba
dice **Damian Soto**; Objeto Brillante aparece nombrada, no como propietaria del
sitio.

Esto se hizo mal en un pase anterior (la página entera montada como si fuera la
marca de la newsletter). No repetirlo.

## 2. A quién le habla

**A quien escribe una newsletter**, y lo dice en el titular.

Hasta ahora la home hablaba de «tu negocio» y no decía la palabra *newsletter*
ni una vez, mientras las cinco herramientas del sitio eran **todas** de Substack:
postal, archivo, «Acerca de», distribuir, diez posts. Ni una le sirve a un
fontanero. El sitio estaba escrito para un público y construido para otro.

Perfil del lector: tiene una newsletter, tiene un trabajo encima, no quiere
convertirse en programador, y repite cosas a mano cada semana.

**Pendiente fuera de este repo:** el «Acerca de» de Substack todavía dice
«freelancers, negocios de una persona». Se contradice con esta página. Hay que
reescribirlo o esto se vuelve a desalinear.

## 3. La tesis que NO va en la página

Damian tiene una tesis de fondo —construir su newsletter construyendo las
herramientas con las que la hace, y con eso aprovechar la trampa del «vivo de
escribir sobre vivir de escribir» para salir de la suya— y **es privada**.

Es la estrategia, no el mensaje. Una estrategia nombrada en voz alta deja de
funcionar, y escribirla convierte la página en una pelea contra el mismo
movimiento que está usando.

**Regla dura: la página no tiene enemigo.** No nombra a nadie, no dice «a
diferencia de», no comenta el negocio de las newsletters y no explica el método
por el que existe. Si aparece un titular del tipo «todos te enseñan a vivir de tu
newsletter, yo…», ese es exactamente el texto que hay que borrar.

## 4. Decisiones cerradas

| Decisión | Estado |
|---|---|
| A quién habla | A quien tiene una newsletter, explícito en el titular |
| Titular | «Todo lo que repites a mano en tu newsletter puede dejar de repetirse» |
| La historia de Cuba | **Fuera.** Sobrevive una sola línea (ver §6) |
| La credencial | Que las herramientas están ahí, funcionan y son gratis |
| El 9-5 | Entra como credencial abajo, no como promesa en el titular |
| Números fijos | **Prohibidos.** Nada de «cinco herramientas» |
| El alta | El iframe de Substack. Dos veces en la página |
| Orden | titular → herramientas → alta → quién escribe esto → alta |

### Por qué no hay números

Mañana son diez y el copy miente. Lo que hace el trabajo es **«sale una nueva
cada semana»**, que además es una razón para suscribirse — y un inventario no lo
es.

### La fila que falta

El índice de herramientas termina en una fila **sin enlace**: la del sábado que
viene. Convierte el crecimiento en algo que se ve en lugar de algo que se
promete, y pone el motivo de dejar el correo dentro del índice en vez de en un
bloque aparte pidiéndolo.

Se numera sola con `tools.length + 1`. **Cuenta solo herramientas**, no
descargas: las descargas llevan «ZIP» en la casilla del número, así que la cuenta
que el lector ve va 01..05 y la siguiente es 06. Sumando las dos listas salía un
08 debajo de un 05, que se lee como una lista rota.

---

## 5. El alta: solo el iframe. Medido.

**No existe forma de dar de alta en Substack desde un formulario nuestro.**
Comprobado en el navegador, 20 de septiembre de 2026:

| Intento | Resultado |
|---|---|
| `fetch` cross-origin a `/api/v1/free` | **503** de Cloudflare |
| POST de formulario desde nuestro dominio | redirige a la portada y **no da de alta a nadie** |
| POST de formulario **desde el dominio de Substack** | `{"error":"Activa JavaScript para suscribirte a este boletín infomativo"}` |
| `substack.com/subscribe?email=…` | **No hay campo de email**: sale el muro de pago (CA$27/mes) |

`nojs=true` no es la puerta que su nombre promete: rechaza cualquier POST de
formulario y exige JavaScript. El alta la hace el JS de su propia página,
mismo origen. **El iframe es lo único que pone un suscriptor en la lista.**

Consecuencias de diseño:

- El iframe **no se puede estilar**: está en otro dominio. El botón amarillo, el
  diamante azul y el título subrayado son suyos y se quedan. Diséñalo
  enmarcándolo (un hueco hundido con nuestro titular encima), nunca fingiendo
  que es nuestro.
- Sale **dos veces**: una detrás de las herramientas y otra al final de la carta.
  No es un descuido — es la misma puerta para quien necesitaba leerlo todo antes
  de decidir. La segunda con `loading="lazy"`.

---

## 6. EL COPY

> Todo lo que sigue va tal cual. Las cabeceras en **negrita** son los `<h2>` de
> la página.

### Titular

> # Todo lo que repites a mano en tu newsletter **puede dejar de repetirse.**
>
> Estas son las que ya no repito yo. Sale una nueva cada semana.

*(La frase marcada en el titular es «puede dejar de repetirse».)*

### El índice de herramientas

**Etiqueta:** El sistema operativo
**Título:** Las herramientas con las que hago Objeto Brillante
**Entradilla:** Las uso cada sábado. No son demos: están terminadas y funcionan con tu publicación. Si alguna te sirve, es tuya.

Las filas salen de `src/lib/tools/list.ts`, numeradas `01`…

**Etiqueta:** Y esto te lo llevas
**Título:** Cosas que se quedan contigo
**Entradilla:** Te las mando al correo y son tuyas, aunque te borres mañana.

Las filas salen de `src/lib/resources/list.ts`, marcadas `ZIP`.

**La fila de cierre**, sin enlace:

> `06` · **La del sábado que viene**
> Todavía no existe. Te llega por correo en cuanto exista.

### El alta (primera vez)

> **Déjame el correo y te llega la del sábado.**
>
> Una a la semana: la herramienta, cómo la hice y qué se rompió. Si te canso, un
> clic y desaparezco.

*(Debajo, el iframe de Substack.)*

### La carta

> **Cómo aparecen**
>
> Cada semana me encuentro haciendo algo a mano dos veces seguidas. Esa es la
> señal. Persigo la idea unos días y, si aguanta el contacto con el problema,
> sale una herramienta.
>
> Si no aguanta, también te lo cuento. Saber qué no funciona te ahorra la misma
> semana que me costó a mí.
>
> **Lo que vas a aprender no es a programar**
>
> Es a mirar lo que haces a mano y ver la herramienta que hay debajo. Después da
> igual con qué la construyas.
>
> Yo empecé a hacérmelas porque muchas veces no tenía con qué pagar las que
> necesitaba.
>
> **Quién escribe esto**
>
> Damian Soto. Administro redes de lunes a viernes y programo por encargo.
> Objeto Brillante sale los sábados. No he dejado nada para hacer esto.
>
> No escribo bonito. Escribo lo que pruebo.

### El alta (segunda vez)

Solo el iframe, sin titular. Ya se pidió arriba.

### La línea que sabe la hora

Va encima del titular, en gris pequeño. Se calcula en el navegador con la hora
local, vacía en el servidor para no adivinar.

- **< 06 h** — Las tantas de la madrugada y aquí sigues, dándole vueltas al próximo envío. Lo sé.
- **< 13 h** — Es por la mañana y ya andas buscando cómo quitarte trabajo de encima. Bien.
- **< 20 h** — Media tarde, y en vez de escribir el envío buscas cómo escribirlo más rápido. Vas bien.
- **resto** — Es de noche y sigues pensando en la newsletter. Lo sé.

### Meta de la página

- **title:** Objeto Brillante — Damian Soto
- **description:** Todo lo que repites a mano en tu newsletter puede dejar de repetirse. Las herramientas con las que hago la mía, gratis, y una nueva cada semana.

---

## 7. Titulares probados y descartados

No los reintentes sin motivo nuevo:

- **Nadie va a construir la herramienta que te falta.** — El anterior. No dice
  *newsletter*, y «nadie» pone al lector a la defensiva.
- **Tu newsletter necesita un sistema operativo.** — Es de Damian y es bueno,
  pero es una **metáfora**: hay que traducirla antes de entender qué ganas.
  Sobrevive como título de la sección de herramientas, que es donde se explica
  sola.
- **Cinco herramientas para tu newsletter.** — El número (§4).
- **Me distrae cada objeto brillante.** — Bueno, pero confiesa el método (§3).
- **Todos te enseñan a vivir de tu newsletter, yo te doy las herramientas.** —
  Prohibido: pone la estrategia en la página y crea un enemigo (§3).

---

## 8. Dos bugs medidos, ya arreglados

Por si alguien los deshace sin querer:

1. **`.letter-heading` no ganaba dentro de `.prose`.** Medido: 18px fuera, 36px
   dentro. Tailwind 4 mete el plugin `typography` en la capa `utilities`, que va
   después de `components`, y **el orden de capas gana a la especificidad** — el
   `:where()` sin especificidad no basta para perder. Arreglado declarando esas
   reglas **fuera de toda capa** al final de `src/app.css`: el CSS sin capa gana
   a todo el CSS con capa. No las muevas dentro de `@layer components` para
   ordenar el archivo.

2. **`app.html` precargaba dos fuentes que el CSS no pedía** (`source-serif-400`
   y `-600`, cuando todo era Public Sans). Dos descargas tiradas en cada página.
   Ahora precarga las dos que se ven en la primera pantalla. Si cambia la
   tipografía, esa línea cambia con ella.

---

## 9. Lo que queda abierto

**El diseño.** Se probaron varios pases y ninguno convenció:

- Tres paletas de la misma página. Rechazado: era la misma estructura pintada de
  tres colores.
- Tres estructuras con una sola paleta (raíl pegado / portada con foto / tabla
  índice). Rechazado: seguían siendo la página de siempre.
- Cuatro variantes del índice. Rechazado por lo mismo.
- Tres mundos desde cero (escritorio tipo sistema operativo / changelog de
  versiones / mapa mental navegable). Rechazado: perdían que la página es de
  Damian, no de la newsletter, y se saltaban este copy.

Lo que hay que respetar en cualquier propuesta nueva: **la página es de Damian
Soto**, el alta es el iframe de Substack, y el copy es el de §6.
