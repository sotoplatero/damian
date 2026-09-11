# Descarga el archivo de una newsletter

Portado de `/tool/archive` de damiansoto.me, que entrega un zip. Aquí entrega una carpeta.

**Este es el único que no llama al sitio.** Los otros tres son clientes de damiansoto.me:
piden el correo y la mitad de pago llega a la bandeja. Este no. El trabajo entero ocurre en la
máquina de quien lo usa, contra Substack, así que no cuesta nada, no pide dirección y no tiene
mitad de pago. También es el que llega más lejos: la web se para en 150 cuerpos y aquí
`--todo` baja los mil trescientos.

**Es para leer la newsletter DE OTRO** —la que quieres estudiar, guardar o pasarle a un
modelo. El archivo propio lo exporta Substack con un botón desde los ajustes, así que si quien
te lo pide es el autor de la publicación, dile eso primero: es más rápido, sale completo y trae
también los posts de pago.

## Cómo se usa

```
node scripts/archivo.mjs <publicacion> [--out CARPETA] [--max N] [--todo]
```

`scripts/archivo.mjs` está en la carpeta del skill, un nivel por encima de esta. No tiene
dependencias y necesita Node 18 o más nuevo.

- **`<publicacion>`** — cualquiera de estas formas vale: `kloshletter`,
  `kloshletter.substack.com`, `https://www.honest-broker.com`, o incluso un post suelto: se
  queda con el origen.
- **`--out`** — dónde dejarlo. Por defecto, una carpeta con el nombre del dominio.
- **`--max N`** — cuántos cuerpos bajar. Por defecto 150.
- **`--todo`** — sin tope. Un archivo de 1.300 posts tarda unos dieciséis minutos.

Lánzalo en segundo plano si la publicación es grande y ve contando lo que salga.

## Qué deja en la carpeta

- **`indice.csv`** — todos los posts del archivo, completo, con fecha, título, acceso,
  palabras, reacciones, comentarios, republicaciones y URL. Esto es barato: una petición por
  cada cincuenta posts.
- **`posts/`** — un markdown por cuerpo, numerado y fechado, del más nuevo al más viejo. Caro:
  **una petición por post**, porque el cuerpo no viene en el archivo.
- **`LEEME.md`** — qué hay, qué falta y de quién es. Dice el número real, no el pretendido: un
  archivo que dice ser el archivo entero de alguien y calladamente no lo es es peor que uno que
  dice «estos 43 de sus 340».

## Por qué 150 por defecto

Es una decisión de producto, no un techo técnico, y confundir las dos cosas ya salió mal una
vez. Nada impide bajar 1.306 posts: medido, tarda unos dieciséis minutos. Pero 150 posts son,
**medido contra publicaciones reales, más o menos el último año** —los 150 más nuevos de
honest-broker.com van de agosto de 2025 a agosto de 2026, y su último año son 147—, y su coste
está acotado sea cual sea el ritmo de la publicación. Un recuento además no se deja engañar por
las fechas importadas: 436 posts de esa publicación dicen ser del año 2000.

## Lo que hay que decirle a quien lo pide

- **Los posts de pago salen recortados o vacíos.** Esto lee lo mismo que un visitante
  cualquiera y no inicia sesión en ninguna parte. En el índice salen marcados.
- **Lo que hay dentro es de su autor.** El `LEEME.md` lo dice con su nombre, y no se quita.
  Sirve para leer, buscar y estudiar; no para republicar.
- **Si el script se para con un 429**, Substack está frenando. Espera un rato largo —se despeja
  en medio minuto desde un cubo descansado, pero si acabas de bajar cientos de páginas tardará
  más— y vuelve a lanzarlo. No lo reintentes en bucle.

## Después

Lo normal es que quien pide esto quiera algo con ello. Ofrécelo: buscar cómo abre sus posts,
sacar los temas que repite, medir su cadencia, o darle el material a `distribuir-articulo` para
repartir uno de los artículos.
