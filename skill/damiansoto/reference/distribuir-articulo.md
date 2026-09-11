# Distribuir un artículo en nueve notas

Es `/tool/repurpose` de damiansoto.me, llamado desde aquí. **Tú no escribes las notas: las
escribe el sitio.** Enséñalas tal cual.

## Paso gratis — las cinco que salen por aquí

```
node scripts/damiansoto.mjs repartir <url-del-articulo>
```

Tarda hasta un par de minutos: el servidor descarga el artículo, lo analiza y escribe cinco
notas, y reintenta una vez si el conjunto no pasa sus propias comprobaciones.

Devuelve un JSON con:

- **`pieces`** — las cinco notas. Cada una con su `id`, su `text` y su `ancla`, que es el
  material exacto del artículo sobre el que está construida.
- **`article`** — el análisis: tema, tesis, público, ideas, pruebas, escenas, tensiones, la
  frase literal verificada y la voz detectada.
- **`confidence`** — `baja` si aquello no parecía un artículo completo. **Si viene `baja`,
  dilo**: es el aviso de que la entrada daba poco.
- **`site`** y **`url`** — el dominio y la URL final que leyó, que puede no ser la que pegaron.

Los cinco ids, para que puedas titularlos:

| `id` | Qué es |
|---|---|
| `cifra` | Un número del artículo y lo que ese número deja ver |
| `escena` | Un momento concreto, contado como ocurrió |
| `caso` | El ejemplo con nombre propio |
| `leccion` | Una acción concreta con el dato que la justifica |
| `cita` | La frase literal del artículo, comentada |

Enséñalas bajo este título, que es el de la web:

> **Lo que tu artículo ya dice**
> Cada una lleva encima un dato, un nombre o una escena de tu texto.

El `ancla` no se enseña salvo que la pidan: es la costura, no el producto.

## Paso de pago — las otras cuatro, al correo

Las cuatro que faltan son las que van MÁS ALLÁ del artículo: una consecuencia, la objeción que
el texto no responde, dónde deja de valer y una pregunta abierta. **No salen por la terminal.**

Antes de pedir el correo, di las dos cosas:

> Las otras cuatro van a tu correo, no salen por aquí. Y esa dirección queda dada de alta en
> Objeto Brillante, la newsletter de Damian; te borras en un clic desde cualquier envío.

Con el sí:

```
node scripts/damiansoto.mjs repartir --email tu@correo.com
```

No lleva la URL otra vez: el script reenvía al servidor el análisis y las cinco notas que ya
tenía guardadas. Si contesta que falta parte del artículo, es que se perdió ese estado: repite
el paso gratis.

El correo llega con las nueve, no solo con las cuatro, y con el aviso de que esas cuatro son
una lectura del texto y no el texto. **Ese aviso importa** y conviene repetirlo aquí: quien las
publique lo hará con su nombre encima y tiene derecho a saber cuáles son inferencia.

## Lo que no hay que hacer

- **No escribas tú las cuatro de pago.** Ni «de muestra», ni «mientras llega el correo». El
  sitio es el que las escribe y el que cobra por ellas con la dirección.
- **No retoques las cinco gratis.** Están comprobadas contra el artículo por el servidor:
  ancla distinta cada una, sin duplicados, con su cifra o su nombre dentro cuando el material
  lo tenía. Cambiar una palabra rompe eso sin que se note.
- **No inventes el resultado si el sitio no contesta.** Di que no contesta.
