<script lang="ts">
	import { marked } from 'marked';
	import { onMount } from 'svelte';
	import homeRaw from '$lib/content/home.md?raw';
	import { tools } from '$lib/tools/list';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import { parseCopy } from '$lib/content';

	const { t, body } = parseCopy(homeRaw);
	const html = marked.parse(body) as string;

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

		// #3 — a wink for whoever opens the console.
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

<!-- #4 — the line that knows the time. Reserves its height to avoid layout shift. -->
<p class="greeting muted">{greeting}</p>

<article class="prose prose-xl prose-neutral max-w-none">
	<!-- Sales copy (editable in src/lib/content/home.md) -->
	{@html html}
</article>

<!--
	Alta en la lista: el formulario de Substack. El nuestro (mismo diseño que la
	página, y da de alta en Resend vía /api/subscribe) está guardado en
	$lib/components/SubscribeForm.svelte, sin usar.
-->
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

<!--
	Las cositas. Segunda puerta del funnel: también captan emails, así que la
	sección tiene peso propio en vez de ir como nota al pie. Los tools se editan
	en src/lib/tools/list.ts; los textos de la sección, en home.md.
-->
<section class="section">
	<h2 class="section-title">{t.toolsTitle}</h2>
	<p class="section-intro">{t.toolsIntro}</p>

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

<style>
	/* #4 — reserve one line so filling the greeting on mount doesn't shift the page */
	.greeting {
		min-height: 1.25rem;
		margin-bottom: 0.75rem;
	}
</style>
