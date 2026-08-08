# Recursos — Cervantes

## Objetivo

Entregar Cervantes (la carpeta que se abre en Claude Code y escribe la newsletter de su
autor) a cambio de un correo, y abrir en el sitio una sección para este tipo de contenido:
descargables que se cambian por una suscripción. Cervantes es el primero; habrá más.

Cervantes se construye en otro repo (`C:\Users\soto\projects\cervantes`) y se publica como
ZIP. Aquí solo se distribuye.

## La sección

`/recursos/<slug>` es donde vive un descargable. La home gana una sección propia para
listarlos, separada de las herramientas: una herramienta se usa en el sitio, un recurso te
lo llevas.

El segmento `recursos` está en español, y la norma del repo es que los segmentos de ruta
vayan en inglés (`tool`, `course`, `author`), reservando el español para lo que *es*
contenido, como el slug de un curso. Es una excepción decidida por Damian el 8 de agosto de
2026, no un descuido.

## La entrega

Con muro de correo, como las herramientas: el formulario suscribe la dirección a la
audiencia de Resend y envía un correo con el enlace de descarga. **No hay descarga en
pantalla.** Quien lo quiere, da su correo.

Eso hay que decirlo antes de pedirlo, no después: la nota bajo el campo dice que Cervantes
es para quien lee Objeto Brillante y que descargarlo es suscribirse. El consentimiento va
delante del botón.

El ZIP vive en `static/cervantes.zip`, servido en `/cervantes.zip`. **Sin versión en la
URL**, a propósito: Cervantes no lleva marcador de versión por diseño (una versión nueva es
una carpeta nueva a la que el autor se muda), así que un enlace enviado hace meses debe
seguir dando la última. Publicar la 4.1 es sobrescribir el fichero.

La URL es adivinable y compartible. Es lo que es cualquier lead magnet, y no justifica
montar tokens firmados para un regalo.

## Piezas

| Fichero | Qué hace |
|---|---|
| `static/cervantes.zip` | Copia de `dist/cervantes-4.0.zip` del repo de Cervantes. |
| `src/lib/resources/list.ts` | Los recursos que la home enseña. Hermano de `tools/list.ts`. |
| `src/routes/recursos/cervantes/+page.svelte` | La página. |
| `src/routes/recursos/cervantes/api/+server.ts` | POST `{ email }` → suscribe y envía. |
| `src/lib/emails/resource-cervantes.md` | El correo de entrega. |
| `src/lib/server/resend.ts` | Una función más: `sendCervantesEmail`. |
| `src/routes/+page.svelte` | La sección nueva. |

### `src/lib/resources/list.ts`

```ts
export type Resource = { name: string; href: string; blurb: string };
export const resources: Resource[] = [ /* Cervantes */ ];
```

Sin `capturesEmail`: un recurso siempre lo pide, por definición. Añadir el siguiente es
meter un objeto aquí, igual que en `tools/list.ts`.

### La página

El patrón de cabecera de herramienta, sin desviarse: `<section class="screen-center">`
envolviendo un `<article class="prose prose-xl prose-neutral max-w-none">` con un `<h1>`
real y **una** frase guía, después el `InlineForm` de correo, después la nota `.muted`.
Toda la copy en un `const t = {...}` del propio fichero.

La nota `.muted` carga dos cosas y nada más: que se abre con Claude Code, y que descargarlo
es suscribirse a Objeto Brillante.

Dos estados. Formulario, y «va para tu correo» en su lugar cuando el envío sale bien. Nada
más: no hay resultado que enseñar ni nada que desbloquear, así que `GateBox` no pinta aquí.

### El endpoint

POST `{ email }`. En orden: formato contra `EMAIL_RE`, `isDisposable`,
`overLimit('toolDelivery', email)` y `overLimit('toolDeliveryPerIp', ip)`, `subscribe(email)`
tolerando `exists`, envío, `{ ok: true }`.

Los códigos de error son los que ya existen — `invalid_email`, `disposable`, `rate_limit`,
`send_failed` — para que `postTool` mapee la copy sin tocar `client.ts`.

Reutiliza los límites de `toolDelivery` en vez de estrenar uno: tres al día por dirección y
diez por IP es lo mismo que pide esta descarga, y un nombre nuevo con los mismos números
sería ruido.

### El correo

Encaja en `sendToolEmail` sin modificarlo: el marcador `{{DOWNLOAD}}` se sustituye por el
enlace. Frontmatter con `subject` y `preheader` como el resto.

El enlace se construye con el **origen de la petición**, y `PUBLIC_SITE_URL` solo lo pisa si
está definida. Al revés que el enlace de baja, que sí confía en la variable: una baja rota se
nota en cuanto alguien la reporta, pero un enlace de descarga roto es el correo entero. Y la
variable **no está en el `.env` local** — el primer envío de prueba salió apuntando a
`/cervantes.zip` sin host delante.

El cuerpo: el enlace, qué necesitas antes de abrirlo, qué pasa al abrir la carpeta (Cervantes
saluda y empieza a preguntar, sin que teclees nada) y el cierre de Objeto Brillante. En
español, y sin darle un comando a nadie — el destinatario no es programador, que es la
restricción que da forma a todo Cervantes.

### La home

Sección nueva con su `section-intro` y las mismas `.box-link`, debajo de las herramientas y
encima de la historia. Ahí es donde alguien que acaba de ver de qué va el sitio ya se ha
ganado que le ofrezcas algo que descargar.

## Fuera de alcance

- Índice en `/recursos`. Con un recurso no hay lista que enseñar; la home ya la hace.
- Enlace de descarga firmado o caducable.
- Versionar la URL del ZIP.
- Automatizar la copia del ZIP desde el repo de Cervantes. Se copia a mano en cada release.

## Verificación

- `pnpm check` — la referencia es 1 error conocido en `places-evaluator`, no cero.
- `pnpm build` — obligatorio: esto toca imports y Vercel construye al hacer push.
- `pnpm dev` y una descarga real: dejar un correo, comprobar que llega y que el enlace baja
  el ZIP entero y se abre.

No hay tests. Los módulos que se añaden son una lista de datos y un endpoint que orquesta
piezas ya probadas; no hay lógica pura que un test pudiera atrapar, y el repo no tiene tests
de componentes a propósito.
