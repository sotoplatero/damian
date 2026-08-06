# Mapa de Oscar Feito — material para una herramienta

**Estado:** investigación cerrada. Sin código, sin decisión tomada.
**Fecha:** 6 de agosto de 2026.
**Fuente:** <https://oscarfeito.substack.com/>

Esto no es un plan. Es el inventario de lo que hay ahí dentro, para que nadie
vuelva a leerlo desde cero cuando toque construir.

---

## Cobertura de la investigación

- **El archivo completo**, 27 posts, vía `/api/v1/archive`. Cabe en dos páginas
  (23 + 4), así que no hizo falta el paseo largo de `substack-archive.ts`.
- **10 posts leídos enteros**, los de más tracción y los que parecían tener
  estructura aprovechable. Todos completos: **no tiene ni un solo post de pago**,
  los 27 son `audience: everyone`.
- **No se han leído enteros** los 17 restantes. Son los primeros meses, piezas de
  500-800 palabras, más motivacionales que operativas («No Eres Un Impostor», «No
  Esperes A Tenerlo Todo Claro», «No Necesitas Más Cursos»). El inventario de abajo
  no depende de ellos.

El endpoint que sirve el cuerpo es `/api/v1/posts/<slug>` — devuelve `body_html`
lleno. Ojo, **no** `/api/v1/posts/by-slug/<slug>`, que es el que 302 (ya está
anotado en `src/lib/server/newsletter.ts`).

---

## Qué es la publicación

Del 16 de enero al 29 de julio de 2026. Semanal, sin fallar una sola semana salvo
un salto a mediados de julio. Todo gratis. El recuento de suscriptores está oculto.

Su bio: *«Te ayudo a crear un negocio personal para generar ingresos sin dejar tu
trabajo. Autor de El Código Secreto de Substack.»*

Un solo tema, tratado como un temario ordenado: propuesta de valor → primer cliente
→ contenido → captación → oferta → precio → email. Y **crece**: empezó en 600
palabras y termina en 2.000-3.300.

**Su audiencia es la tuya.** Creadores hispanohablantes montando algo en Substack.
Eso es lo que hace que esto merezca una mirada y no sea investigación de mercado
genérica.

### El archivo entero

| Fecha | Post | Pal. | ❤️ | 💬 |
|---|---|---|---|---|
| 16 ene | 🛡️ Tu Antídoto Anticrisis | 605 | 21 | 15 |
| 23 ene | Manual De Instrucciones | 1251 | 43 | 2 |
| 29 ene | El Error De Querer Ayudar Demasiado | 577 | 6 | 4 |
| 04 feb | La Visibilidad Que Vende De Verdad | 737 | 8 | 0 |
| 11 feb | Cómo Crear Un Negocio Personal Sin Exponerte En Redes | 657 | 21 | 8 |
| 18 feb | ¿Crees Que No Tienes Nada Valioso Que Vender? | 780 | 13 | 0 |
| 25 feb | Lo Único Que Necesitas Saber Para Vender | 1350 | 9 | 0 |
| 05 mar | Cómo Convertir Lo Que Sabes En Algo Vendible | 819 | 7 | 2 |
| 12 mar | Cómo Conseguir Tu Primer Cliente En Modo Fácil | 523 | 6 | 0 |
| 18 mar | Mejor Susurrar A Cien Que Gritar A Mil | 585 | 7 | 0 |
| 25 mar | **Cómo Explicar Tu Propuesta De Valor** ★ | 814 | 15 | 1 |
| 07 abr | No Esperes A Tenerlo Todo Claro | 801 | 18 | 8 |
| 14 abr | **Cómo Presentar Ofertas Irresistibles** ★ | 2336 | 19 | 2 |
| 22 abr | De Visibilidad A Ventas | 580 | 22 | 12 |
| 30 abr | Por Qué Tu Negocio No Despega | 701 | 9 | 4 |
| 06 may | Las Herramientas Mínimas Para Crear Tu Negocio Personal | 915 | 8 | 5 |
| 14 may | **La Fórmula Universal Para Crear Contenido** ★ | 1703 | 26 | 2 |
| 21 may | **Cómo Escribir Ganchos Magnéticos** ★★ | 2036 | **53** | **23** |
| 28 may | Substack: ¿La Plataforma Perfecta…? | 2115 | 11 | 8 |
| 04 jun | No Eres Un Impostor | 2031 | 15 | 5 |
| 11 jun | **No Persigas Clientes, Atrae Suscriptores** ★ | 3017 | 15 | 6 |
| 18 jun | **Cómo Vender Por Email** ★ | 3274 | 13 | 4 |
| 25 jun | **La Escalera De Valor** ★ | 2251 | 13 | 2 |
| 02 jul | No Necesitas Más Cursos | 1970 | 9 | 7 |
| 09 jul | **Cómo Atraer Y Vender Con Historias** ★ | 2158 | 13 | 7 |
| 16 jul | **Cómo Fijar Tus Precios** ★ | 2001 | 9 | 3 |
| 29 jul | **Lo Que Aprendí Enviando Emails** ★ | 2243 | 10 | 0 |

★ = leído entero. **Ganchos dobla en reacciones al segundo y triplica en
comentarios.** Es su pieza, y no está cerca.

---

## El hallazgo: sus posts terminan en un prompt para copiar

Tres de los diez leídos cierran con un prompt entero para pegar en ChatGPT, con
huecos `[PEGA AQUÍ …]`: **Ganchos**, **Ofertas Irresistibles** y **No Persigas
Clientes**. El de ganchos además entrega un `.md` descargable con 75 fórmulas y
dice, literalmente:

> «Lo puedes utilizar como archivo de contexto o como base para desarrollar una
> Skill en ChatGPT Codex o Claude CoWork.»

Está describiendo una herramienta que no ha construido. Su lector tiene que
descargar un archivo, abrir otra pestaña, pegar un prompt de 25 líneas y rellenar
cinco huecos. Ahí se cae la gente. **Ese es el hueco entero**, y es exactamente la
forma que ya tienen los tools de este repo.

---

## Inventario de material enumerable

Lo que sirve para un tool es lo que se puede numerar. Esto es todo lo que hay:

| Post | Qué enumera |
|---|---|
| Ganchos Magnéticos | **10 tipos de gancho con mecanismo explicado** (+75 en su lead magnet descargable) |
| Propuesta De Valor | **fórmula de 4 huecos**: público / problema / transformación / barrera |
| Fórmula Universal | 3 piezas de toda pieza de contenido: gancho / desarrollo / CTA |
| Ofertas Irresistibles | **10 bloques de página de ventas**: titular, apertura, situación actual, consecuencias, solución, transformación, bonus, garantías, CTA, acelerante |
| Cómo Vender Por Email | **10 elementos de secuencia**: identificación, resultado, miedo, esperanza, autoridad, soluciones erróneas, contenido, reversión de riesgo, FAQs, limitaciones |
| Historias | 5 pasos: ángulo emocional → buscar la historia → estructura → adaptar al medio → pulir |
| Precios | 4 métodos (mercado / horas / lo que quieres ganar / valor) + 4 palancas de valor percibido |
| Lead Magnet | 5 palancas de valor percibido (nombre, especificidad, privado, valor monetario, participación) + 5 preguntas de elección |
| Escalera De Valor | 3 cajones (visibilidad / confianza / conversión) + 3 niveles de escalera |
| Enviando Emails | 8 lecciones (no es estructura, es opinión — no sirve para un tool) |

### Los 10 tipos de gancho

Con su mecanismo, tal y como los explica. Esto es la materia prima:

1. **Descubrimiento contraintuitivo** — revela lo contrario de lo lógico; abre brecha entre creencia y realidad.
2. **Rotura de patrón** — contradice algo que se asume, sin desvelar el matiz.
3. **Pregunta incómoda** — obliga a mirarse al espejo sin atacar de frente.
4. **Poner el dedo en la llaga** — no el problema, sus consecuencias; y sugiere que le pasa a mucha gente, para que no haya culpa.
5. **Promesa práctica** — ventaja concreta. Acelerantes: rápida, novedosa, fácil, fiable.
6. **Error invisible** — convierte una frustración difusa en diagnóstico concreto; crea un «enemigo».
7. **Pensamiento robado** — dice en voz alta lo que el lector no admite en público.
8. **Número específico + contexto inesperado** — el número da precisión, el contexto da curiosidad.
9. **Llamada directa a un perfil preciso** — efecto cóctel: nombra su profesión o situación.
10. **Micro-momento de acción** — abre en mitad de la escena, con tensión, faltando piezas.

Todos comparten una regla que él repite: **ninguno revela todo de golpe.**

---

## Hacia dónde apunta esto

**La candidata: «rescata un post que no funcionó».** Pegas la URL de algo que ya
publicaste y pasó sin pena ni gloria. Se lee, se identifica la tensión real del
texto y **se reescribe solo la entrada**, en varios tipos de gancho. Uno gratis en
pantalla, el resto por email.

Por qué esa:

- Es el tema con más demanda medida en su propia audiencia, y no de poco.
- **La entrada es nueva en este sitio.** Nada de lo que hay trabaja sobre algo que
  el visitante ya publicó: `10-post-types` parte de una idea, `repurpose` trocea un
  artículo. Ninguno da segunda oportunidad a lo que ya está muerto.
- Casi todo está hecho: `scrape.ts` trae la URL con su guardia, `openai.ts` da el
  esquema estricto, la forma «preview libre → resto por email» de `10-post-types`
  se copia entera, `voice.ts` evita que suene a IA. El trabajo real es escribir
  bien los diez tipos.

**Segunda opción: el test de propuesta de valor.** Su fórmula de 4 huecos se puede
*comprobar*, no solo generar: pegas tu bio y te señala cuál de los cuatro falta,
citando tu propio texto. Es la mitad medida del tool de newsletter aplicada a otra
cosa. La pega: pisa terreno de `/tool/substack-about`.

**Descartado: la página de ventas y la secuencia de email.** Se solapan con
`7-frameworks` y con `newsletter`. Serían la quinta variante del mismo molde.

---

## Dos advertencias antes de construir

**El archivo de 75 fórmulas es su lead magnet. No se toca.** Los 10 tipos que sí
publicó, con nombre y mecanismo, están en la misma situación que los frameworks de
Neal O'Grady que ya se reimplementaron aquí: la estructura no es de nadie, los
ejemplos son nuestros. La regla de `types.ts` aplica igual — **los ejemplos de la
página los escribimos nosotros**, y sobre un tema ajeno a lo que va a escribir el
visitante.

Y siendo su audiencia exactamente la nuestra, lo sensato es **citarlo y avisarle**,
no clonarlo en silencio. Es la lógica de `/postcard`: una herramienta que abre una
conversación con otro autor.

**Sería el cuarto tool con muro de email.** Ese es el argumento real en contra, y no
es técnico. Tres de los cuatro listados ya piden la dirección.

---

## Cómo volver a sacar los datos

```powershell
# El archivo entero (avanza por lo recibido, no por el tamaño de página)
$all = @(); $offset = 0
while ($true) {
  $r = Invoke-RestMethod -Uri "https://oscarfeito.substack.com/api/v1/archive?sort=new&limit=50&offset=$offset" `
       -Headers @{ "User-Agent" = "Mozilla/5.0" }
  if (-not $r -or $r.Count -eq 0) { break }
  $all += $r; $offset += $r.Count
}

# El cuerpo de un post (body_html viene vacío en el archivo)
Invoke-RestMethod -Uri "https://oscarfeito.substack.com/api/v1/posts/como-escribir-ganchos-magneticos" `
  -Headers @{ "User-Agent" = "Mozilla/5.0" }
```
