# damiansoto.me, por dentro

Portado a mano del repositorio del sitio (agosto-septiembre de 2026). Si una fecha o una
lista de aquí contradice a la web, manda la web.

## Quién escribe

Damian Soto. En 2022 salió de Cuba en un avión a Surinam, solo, sin decírselo a sus amigos,
dejando atrás a su mujer y a sus dos hijos. Cruzó el Amazonas en un bote con otros 24
cubanos, escondido, más de 27 horas, para llegar a Brasil. Tres vuelos hasta Porto Alegre y
de ahí a Uruguay. Tardó más de un año en volver a estar con sus hijos. Ahora vive en Canadá.

No lo cuenta para dar pena. Lo cuenta porque quien ha dejado todo y ha empezado de cero sabe
que nada es imposible.

**No repitas esta historia salvo que te la pidan.** Y si la cuentas, dos cosas no se tocan:
salió «sin decírselo a mis amigos», nunca «a nadie» —su mujer lo sabía—, y la frase «no te
cuento esto para que me tengas lástima» va siempre, porque es la que impide que suene a queja.

## La newsletter

**Objeto Brillante**, semanal, en <https://sotoplatero.substack.com>.

Cada semana Damian se hace una herramienta y cuenta cómo, para que quien lee arme su propia
caja de herramientas con IA. No es un curso, ni tutoriales, ni plantillas, ni prompts
sueltos. «No escribo bonito. Escribo lo que sé.»

El titular de la portada: **«Nadie va a construir la herramienta que te falta.»** Debajo:
«Yo me construyo las mías. Tú puedes hacerte las tuyas.» El alta va por el formulario de
Substack incrustado en la home.

## Las herramientas del sitio

Una herramienta se usa allí y se acaba al cerrar la pestaña.

| En la web | Qué hace | Pide correo | ¿Está en el skill? |
|---|---|---|---|
| `/postcard` | Cuatro postales descargables con la historia entera de una publicación de Substack, en un carrusel | No, es un regalo | No: son PNG pintados en el servidor |
| `/tool/archive` | El archivo entero de la newsletter **de otro**: índice y posts en markdown, en un zip | Sí, y solo una descarga por dirección | Sí → `archivo-newsletter` |
| `/tool/repurpose` | Nueve notas de un artículo: cinco con sus datos, cuatro que van más lejos que él | Sí, las cuatro últimas van por correo | Sí → `distribuir-articulo` |
| `/tool/substack-about` | Audita el «Acerca de» de una publicación y lo reescribe | Sí | Sí → `acerca-de-substack` |
| `/tool/10-post-types` | Diez posts distintos de una sola idea escrita | Sí, nueve van por correo | Sí → `diez-posts` |
| `/tool/newsletter` | Auditoría de un Substack desde lo que enseña en público | Sí | No, sin listar en la web mientras se rehace |
| `/tool/7-frameworks` | Reescribe una oferta con siete marcos de copywriting | Sí | No |
| `/tool/actionable` | Juzga un artículo, planea una herramienta y la construye tras un enlace firmado | El generado, sí | No |

Casi todas parten en dos: **algo entra → una parte se ve gratis en pantalla → la otra llega
por correo a cambio de la dirección.** El skill llama a esos mismos endpoints, así que **el
muro es el mismo**: la mitad de pago llega al correo y no a la terminal. Lo único que cambia
es dónde estás cuando la pides.

La excepción es el archivo de una newsletter: ese trabajo lo hace el script en tu máquina, no
el servidor, así que ni pide dirección ni tiene mitad de pago.

## Las descargas

Una descarga te la llevas y se queda contigo. Todas piden la dirección de correo.

- **`/recursos/cervantes`** — Cervantes: una carpeta que se abre en Claude Code, aprende la
  voz de un autor de su newsletter publicada y escribe sus envíos con él.
- **`/recursos/analisis-de-autor`** — El método y los prompts para analizar el archivo de un
  autor, con dos casos hechos enteros: Dan Koe y Hussain Ibarra.

## Por si preguntan cómo está hecho

SvelteKit con Svelte 5, Tailwind 4 y DaisyUI sobre un tema propio, desplegado en Vercel.
Español solo: sin i18n. El correo lo manda Resend y no hay cron. Todas las llamadas al
modelo pasan por un único cliente en el servidor. **El modelo es `gpt-5.4-mini`, elegido por
Damian tras comparar ocho; esto no se cambia.**
