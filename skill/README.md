# El skill de damiansoto.me

`damiansoto/` es el skill que se distribuye en <https://damiansoto.me/skill>. Se instala así:

```
npx skills add https://damiansoto.me/skill
```

## Lo que hace falta para que esa línea funcione, medido contra el CLI de verdad

`skill/build.mjs` genera las tres cosas. Ninguna es opcional y las tres se descubrieron
fallando:

1. **Un índice en `/skill/.well-known/agent-skills/index.json` Y otro en la raíz.** El CLI
   (vercel-labs/skills) descubre por `.well-known` antes de plantearse descargar la URL, pero
   **con una URL que lleva ruta no cae al índice de la raíz**: «Not falling back to the root
   skills index because that would install every skill the host publishes». El de la raíz
   sirve para `npx skills add https://damiansoto.me` a secas.
2. **El `digest`, que es el sha256 del zip, y el CLI lo comprueba.** Por eso el índice se
   genera y no se escribe a mano: un zip nuevo con el digest viejo hace fallar la instalación
   de todo el mundo, y el error que sale no menciona el digest.
3. **El zip va PLANO, con `SKILL.md` en la raíz.** Tras comprobar el digest el CLI hace
   `files.get("SKILL.md")` sobre lo extraído y devuelve null si no está ahí. Con todo dentro
   de `damiansoto/` la instalación fallaba con un «No matching skills» que no dice nada de
   esto. La contrapartida es que descomprimirlo a mano necesita carpeta de destino:
   `unzip -d ~/.claude/skills/damiansoto`.

El `name` y la `description` del índice salen del propio `SKILL.md`, porque son los que el
CLI enseña al instalar y tenerlos en dos sitios es tenerlos distintos. El nombre tiene que
casar con `^[a-z0-9-]+$` y la descripción no puede pasar de 1024 caracteres; `build.mjs`
comprueba las dos cosas antes de escribir nada.

**`claude skill add` no existe.** En Claude Code 2.1.268 hay `claude plugin`, no
`claude skill`: la instalación desde una URL la hace `npx skills add`, o se descomprime el
zip a mano.

## Publicar una versión

Es volver a comprimirlo encima de `static/damiansoto-skill.zip`, igual que con
`cervantes.zip`. **Regenera también los dos índices, así que no lo hagas a mano:**

```
node --experimental-strip-types skill/build.mjs
```

El flag hace falta porque `build.mjs` importa `src/lib/tools/archive/zip.ts`, que es
TypeScript. Lo importa en vez de traerse otro escritor de zip porque ese ya existe y ya está
probado: su test lee los bytes de vuelta y los infla con `node:zlib`.

**El zip no lleva versión en el nombre a propósito**, por lo mismo que Cervantes: un enlace
mandado por correo hace meses tiene que seguir dando el último.

## EL SKILL NO REIMPLEMENTA LAS HERRAMIENTAS. LAS LLAMA.

Es la decisión que da forma a todo lo demás, y hubo una primera versión que hizo lo contrario:
portó los prompts, los nueve formatos de nota, los diez tipos de post y las reglas de voz a
ficheros markdown dentro del skill, y escribía las notas con el modelo de quien lo usaba.
Funcionaba y estaba mal por tres motivos, en este orden:

1. **No capturaba una sola dirección.** Las herramientas de este sitio están partidas por el
   muro del correo porque esa es la contrapartida. Un skill que las regala entera y
   gratuitamente por fuera vacía el motivo de que existan.
2. **Eran dos productos que se separan solos.** Un prompt tocado en `src/` y no en el skill
   son dos herramientas con el mismo nombre dando resultados distintos, y nada que lo avise.
3. **Repartía texto de otros.** Seis de los diez tipos de post se anclan en posts reales de
   Naval Ravikant, Lara Acosta y Neal O'Grady. En el sitio se le pasan al modelo y no se
   pintan nunca; un skill se descomprime y se abre con un editor.

Así que `scripts/damiansoto.mjs` es un cliente HTTP de los endpoints que ya existen —el mismo
protocolo que usa `src/lib/tools/client.ts` desde el navegador— y el muro sigue donde estaba:
el paso gratis sale por la terminal, el `unlock` pide la dirección, la da de alta en Resend y
manda la otra mitad al correo. **En la terminal no sale nunca la mitad de pago, igual que en la
web.**

`DAMIANSOTO_URL` apunta el cliente a otro sitio. Es como se prueba contra `localhost:5173` sin
tocar nada.

## De dónde sale cada archivo

Ya casi nada está duplicado: los prompts viven solo en `src/`. Lo que queda portado a mano es
esto, y **si tocas la fuente, mira si el cambio está también aquí**:

| Archivo del skill | Fuente en el sitio |
|---|---|
| `scripts/damiansoto.mjs` | los contratos de `tool/{repurpose,10-post-types,substack-about}` y los códigos de error de `src/lib/tools/client.ts` |
| `scripts/archivo.mjs` | `src/lib/server/substack-archive.ts` + `src/lib/tools/archive/html.ts` |
| `reference/sitio.md` | la home, `tools/list.ts` y `resources/list.ts` |

Las tres fichas de `reference/` que llaman al sitio describen la forma de la petición y de la
respuesta, no el contenido. **Si cambias el cuerpo que espera un `unlock`, el skill se rompe en
silencio y con un error que parece del usuario** (`incomplete_article`).

## Lo que se quedó fuera, y por qué

- **Las postales** (`/postcard`) son PNG pintados con satori y tipografías propias.
- **La auditoría de newsletter** (`/tool/newsletter`) está sin listar en la propia web mientras
  se rehace su mitad de juicio.
- **`/tool/archive` es la excepción a todo lo de arriba: ese sí es local.** Su trabajo son
  cientos de peticiones a Substack y ni una al modelo, así que hacerlo pasar por el servidor
  costaría ancho de banda para nada y heredaría el tope de 150 cuerpos que la web tiene por la
  paciencia de una pestaña abierta. Es el único sin correo y el único que no cuesta nada.
