<script lang="ts">
	import { onMount } from 'svelte';
	import { tools } from '$lib/tools/list';
	import PageMeta from '$lib/components/PageMeta.svelte';

	/*
	 * ── NOTAS PARA DAMIAN (editoriales, en español a propósito) ─────────────
	 *
	 * Todo el copy de la home vive en este componente, escrito como HTML normal.
	 * Antes pasaba por src/lib/content/home.md + frontmatter + marked; se quitó
	 * porque era demasiada maquinaria para una carta.
	 *
	 * 0. DATOS CONFIRMADOS POR TI (no los cambies sin querer): salida 6pm de
	 *    Surinam, desembarco 9pm del día siguiente = 27 horas en el bote. Tres
	 *    aviones hasta Porto Alegre y a Uruguay en auto. Un año hasta volver a
	 *    estar con tus hijos. Ahora vives en Canadá: Uruguay fue el final de la
	 *    travesía, no dónde acabaste.
	 *
	 * 1. EL ALTA la hace el iframe de Substack: va directa allí y este repo no
	 *    ve el email. No hay cron; los NN.md de src/lib/emails son borradores
	 *    para posts de Substack (00.md es el correo de bienvenida que deberías
	 *    pegar en los ajustes de Substack). El formulario propio y /api/subscribe
	 *    se eliminaron en agosto 2026 por no usarse; están en el historial de git
	 *    si el iframe cae. Las herramientas dan de alta en Resend directamente
	 *    con subscribe() del servidor.
	 *
	 * 2. LAS HERRAMIENTAS se editan en src/lib/tools/list.ts: añades un objeto
	 *    y aparece sola. La sección no lleva título a propósito: "Herramientas"
	 *    sobraba con el subtítulo diciendo "yo me construyo las mías".
	 *
	 * 3. FALTAN PRUEBAS. Ni un cliente, ni una cifra. Una línea real —"esto se
	 *    lo monté a un taller de Montevideo"— vale más que medio texto. Va justo
	 *    antes de "déjame tu email".
	 *
	 * 4. LA FOTO ya está optimizada: 1100x1100 WebP, 108 KB. El original está en
	 *    src/lib/assets/los-sotos-original.jpg.
	 *
	 * 5. POR QUÉ ESTÁ ESCRITO ASÍ. Es "SIN DECÍRSELO A MIS AMIGOS", nunca "a
	 *    nadie": "a nadie" mete a tu mujer en el mismo saco y la salida se lee
	 *    como un abandono. Ella lo sabía. No lo toques. Y "no te cuento esto
	 *    para que me tengas lástima" es la línea que salva la historia de sonar
	 *    a queja: si la quitas, recorta la historia.
	 *
	 * 6. LA HOME ES "HACEDOR PRIMERO" PERO EL TITULAR HABLA DEL CLIENTE.
	 *    "Me hago las herramientas que no encuentro" se probó y se descartó:
	 *    hablaba de ti. El titular nombra SU problema y las herramientas de
	 *    debajo son la réplica. El subtítulo tiene dos tiempos y los dos hacen
	 *    falta: "yo me construyo las mías" (réplica, elegida por ti) y "tú
	 *    puedes hacerte las tuyas" (la tesis que la historia demuestra). En
	 *    afirmativo a propósito: en pregunta el lector no técnico se contesta
	 *    "no" y se va. Sin "cada semana": sonaba a calendario.
	 *
	 * 7. TITULARES ALTERNATIVOS:
	 *    - La herramienta que necesitas no existe.
	 *    - Estás pagando por software que podrías hacerte en una tarde.
	 *    - Cada semana me hago una herramienta. Te cuento cómo.
	 *    - Me hago las herramientas que no encuentro. Y te las dejo aquí.  (descartado: habla de mí)
	 *    - Desde el Amazonas hasta tu buzón.
	 * ─────────────────────────────────────────────────────────────────────────
	 */

	const toolsIntro =
		'Estas son las que uso yo para trabajar. Las dejo aquí por si te sirven. La lista crece.';

	// #4 — the line that "knows" the time. Computed in the browser (local hour),
	// so it always matches the visitor. Empty on the server to avoid a wrong guess.
	let greeting = $state('');

	function timeGreeting(): string {
		const h = new Date().getHours();
		if (h < 6) return 'Las tantas de la madrugada y aquí sigues, dándole vueltas al negocio. Lo sé.';
		if (h < 13) return 'Es por la mañana y ya andas buscando cómo quitarte trabajo de encima. Bien.';
		if (h < 20) return 'Media tarde, y en vez de estar con el negocio, buscas cómo hacer que se lleve solo. Vas bien.';
		return 'Es de noche y sigues pensando en el negocio. Lo sé.';
	}

	onMount(() => {
		greeting = timeGreeting();

		// A wink for whoever opens the console.
		console.log(
			'%cSi has abierto esto, tú y yo nos vamos a entender.%c\nResponde al primer correo que te mando y dime qué automatizarías.',
			'font-size:14px;font-weight:700;color:#171717',
			'font-size:13px;color:#737373'
		);
	});
</script>

<PageMeta
	title="Objeto Brillante — Damian Soto"
	description="Un email a la semana con algo que he hecho con IA en un negocio real y que funciona. Sin cursos, sin tutoriales. Yo te cuento lo que hago."
/>

<!-- The line that knows the time. Reserves its height to avoid layout shift. -->
<p class="greeting muted">{greeting}</p>

<article class="prose prose-xl prose-neutral max-w-none">
	<h1>Nadie va a construir la herramienta <mark>que te falta.</mark></h1>
	<p>Yo me construyo las mías. Tú puedes hacerte las tuyas.</p>
</article>

<!-- The tools, right after the headline: the proof before the ask. No section
     title — the list follows the subheading directly and the intro line joins. -->
<section class="section" aria-label="Herramientas">
	<p class="section-intro">{toolsIntro}</p>

	<ul class="mt-6 space-y-3">
		{#each tools as tool, index (tool.href)}
			<li>
				<a href={tool.href} class="box-link">
					<span class="tool-index">{String(index + 1).padStart(2, '0')}</span>
					<span class="box-title">{tool.name}</span>
					<span aria-hidden="true" class="tool-arrow">↗</span>
					<p class="box-text">{tool.blurb}</p>
				</a>
			</li>
		{/each}
	</ul>
</section>

<!-- The story, a credential now: it ends where the signup begins.
     `prose-quiet` keeps its first paragraph as body text, not as a lead. -->
<article class="prose prose-xl prose-neutral prose-quiet section max-w-none">
	<p>
		En 2022 salí de Cuba en un avión a Surinam. Solo. Sin decírselo a mis amigos. Dejando atrás a
		mi mujer y a mis dos hijos.
	</p>
	<p>
		Estuve en Amazonas en un bote junto a 24 cubanos por más de 27 horas escondido para llegar a
		Brasil. Tres vuelos para llegar a Porto Alegre en la frontera sur. Y finalmente entré a
		Uruguay.
	</p>
	<p>Ahora estoy en Canadá.</p>
	<p>
		<img
			src="/los-sotos.webp"
			alt="Damian Soto con sus dos hijos"
			width="1100"
			height="1100"
			loading="lazy"
			decoding="async"
		/>
	</p>
	<p>Estos son los míos. Tardé mas de un año en volver a verlos.</p>
	<p>No te cuento esto para que me tengas lástima.</p>
	<p>Te lo digo porque solo quien ha dejado todo y empieza de cero sabe que nada es imposible.</p>
	<p>
		Para eso escribo <strong>Objeto Brillante</strong>: cada semana me hago una herramienta como
		las de arriba y te cuento cómo, para que armes tu propia caja de herramientas IA que trabajen
		para ti.
	</p>
	<p>No escribo bonito. Escribo lo que sé.</p>
	<p>
		Si lo que quieres es una master class, 10 prompts o una plantilla, cierra la pestaña y
		olvidame. No soy tu maestro
	</p>
	<p>Pero si quieres la historia completa, déjame tu email.</p>
	<p>Si te canso, un clic y desaparezco.</p>
	<p><strong>Damian</strong></p>
</article>

<!-- The signup: Substack's own form. -->
<section class="mt-10">
	<div class="embed-shell">
		<iframe
			src="https://sotoplatero.substack.com/embed"
			title="Suscríbete a Objeto Brillante"
			width="100%"
			height="320"
			frameborder="0"
			scrolling="no"
		></iframe>
	</div>
</section>

<style>
	/* Reserve one line so filling the greeting on mount doesn't shift the page */
	.greeting {
		min-height: 1.25rem;
		margin-bottom: 0.75rem;
	}
</style>
