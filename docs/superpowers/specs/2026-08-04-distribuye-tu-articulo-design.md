# Distribuye tu artículo

## Objetivo

Reorientar `/tool/repurpose` para que distribuya un artículo mediante nueve notas breves y reutilizables. Las notas no pertenecen a ninguna red social concreta: exploran ideas, ángulos y estilos diferentes del artículo y pueden publicarse en el contexto que mejor encaje.

La herramienta se llamará **Distribuye tu artículo** y su promesa será:

> Convierte un artículo en nueve notas breves, con distintas ideas, ángulos y extensiones, para seguir llevándole lectores.

## Experiencia

El usuario pega la URL de un artículo publicado. La herramienta lo lee, analiza su contenido y genera tres notas gratuitas. Las seis restantes se entregan por correo después de pedir la dirección del usuario.

La página y el correo no mencionarán Substack, X, LinkedIn ni límites propios de plataformas. Una nota corta podrá servir como tweet y una más desarrollada en otro contexto, pero ninguna se escribirá para una red concreta.

Las notas tendrán longitudes diferentes. Podrán ser una sola frase o varios párrafos breves, con un máximo de 700 caracteres, incluidos espacios, saltos de línea y URL. Nunca tendrán la estructura o el desarrollo de un artículo.

## Repertorio editorial

Las nueve funciones serán:

1. **Idea central:** expresa la tesis más fuerte de forma autónoma.
2. **Detalle revelador:** toma un dato, ejemplo o escena pequeña que contiene algo mayor.
3. **Contradicción:** presenta lo que el artículo cuestiona o coloca al revés de lo esperado.
4. **Historia:** extrae una escena o experiencia concreta.
5. **Consecuencia:** desarrolla una implicación sustentada por el artículo.
6. **Lección práctica:** convierte una idea en algo que el lector puede hacer o cambiar.
7. **Pregunta:** transforma una tensión real en una conversación.
8. **Cita comentada:** acompaña una frase literal verificada con una observación breve.
9. **Puerta al artículo:** abre curiosidad y conduce al texto completo.

Las tres notas gratuitas serán Idea central, Contradicción y Lección práctica. Las otras seis quedarán bloqueadas hasta la entrega por correo.

Cada función define la misión editorial, no una plantilla. El modelo decide la idea concreta, estructura, ritmo, extensión y uso del enlace. Las nueve notas deben abrir entradas diferentes al artículo; no pueden repetir una idea cambiando las palabras.

## Uso de la URL

Muchas notas podrán incluir la URL original porque el propósito del producto es distribuir el artículo. El enlace no se reservará para una sola pieza ni se impondrá en todas.

El modelo decidirá, según cada nota:

- si el enlace mejora su función;
- dónde colocarlo;
- si necesita una transición natural o puede aparecer solo;
- si debe omitirse para que la nota funcione mejor.

Se evitarán fórmulas mecánicas como «nuevo post», «link en comentarios» o llamadas genéricas sin relación con el contenido.

## Análisis y generación

El flujo conservará dos llamadas al modelo:

1. La llamada gratuita analiza el artículo y escribe las tres notas visibles.
2. La llamada de entrega reutiliza el análisis, escribe las otras seis y propone una orientación breve para alternarlas.

El análisis recogerá:

- tesis principal;
- ideas secundarias;
- pruebas, cifras y ejemplos reales;
- escenas o experiencias narradas;
- citas literales verificables;
- rasgos de la voz del autor;
- URL final del artículo.

El modelo podrá formular interpretaciones e implicaciones nuevas si están sustentadas por el texto. No podrá inventar cifras, experiencias, resultados, citas ni posturas atribuibles al autor.

## Voz del autor

Las notas conservarán la voz detectada en el artículo: idioma, registro, ritmo, formalidad, primera o tercera persona y vocabulario característico.

`repurpose` no debe heredar reglas que impongan español de España, tuteo o la voz directa general del sitio cuando contradigan al texto fuente. Las reglas universales contra escritura artificial se separarán de las reglas de personalidad. El objetivo es limpiar los tics del modelo sin borrar la personalidad del autor.

## Antipatrones de texto generado por IA

Tanto el prompt interno como el prompt manual incluirán una sección explícita que exija:

- variar longitud y construcción de frases;
- evitar comienzos y cierres repetidos entre notas;
- repetir la palabra precisa cuando resulte natural, sin buscar sinónimos decorativos;
- usar verbos normales y lenguaje concreto;
- evitar tríadas automáticas, paralelismos perfectos y enumeraciones artificiales;
- no abusar de fragmentos ni párrafos de una sola línea;
- evitar falsas oposiciones como «no se trata de X, sino de Y»;
- no cerrar siempre con moralejas, resúmenes o preguntas;
- eliminar introducciones, contexto genérico y conclusiones innecesarias;
- prohibir vocabulario inflado, clichés, emojis y hashtags;
- evitar ganchos de plantilla como «Nadie habla de esto», «Te cuento por qué» o «Esto lo cambia todo»;
- no convertir todas las notas en copy agresivo;
- conservar irregularidades reconocibles cuando formen parte de la voz del autor.

## Correo y prompt adjunto

El correo contendrá las nueve notas completas, el nombre y propósito de cada una y una orientación breve para alternar ideas y extensiones. No impondrá días, plataformas ni un calendario.

Se adjuntará `prompt-distribuye-tu-articulo.txt`. Será autocontenido y reproducirá el repertorio, las reglas de fidelidad, la libertad de uso de URL, los límites de extensión y los antipatrones de IA. Tendrá espacios claros para pegar la URL y el texto completo del artículo, sin asumir que el LLM usado manualmente puede abrir enlaces.

## Errores y controles

Si la fuente no parece un artículo completo, la interfaz mostrará una advertencia de confianza baja. La herramienta solo entregará notas sustentadas por el material disponible y nunca inventará contenido para completar el repertorio.

Los controles del servidor verificarán:

- nueve identificadores conocidos y únicos en el resultado completo;
- longitud máxima de 700 caracteres por nota, incluidos espacios, saltos de línea y URL;
- citas literales contra el texto leído;
- URL válida cuando aparezca;
- ausencia de contenido extra que convierta una nota en artículo.

Una respuesta incompleta o inválida del modelo se tratará como fallo de generación, no como una entrega correcta.

## Verificación

La implementación se comprobará con:

- pruebas de las funciones de saneamiento y validación;
- renderizado de la página en móvil y escritorio;
- verificación del contenido y nombre del archivo `.txt` adjunto;
- `pnpm check`, sin introducir errores adicionales a los dos ya documentados;
- una ejecución real del flujo gratuito y del flujo de correo después de modificar los prompts, porque los errores de la API no aparecen en el chequeo de tipos.

## Fuera de alcance

- Selección de una red social o adaptación específica por plataforma.
- Calendario automático de publicación.
- Número variable de notas.
- Generación de artículos nuevos o ampliaciones del artículo fuente.
- Invención de pruebas o datos para completar una nota.
