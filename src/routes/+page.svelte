<script lang="ts">
	import { onMount } from 'svelte';
	import { tools } from '$lib/tools/list';
	import { resources, resourceHref } from '$lib/resources/list';
	import { PUBLICATION_URL, subscribeUrl } from '$lib/publication';
	import { GAP_MIN, GAP_MAX, isGapRequestValid } from '$lib/gap';
	import { shortDate } from '$lib/issues';
	import { postTool } from '$lib/tools/client';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import InlineForm from '$lib/components/InlineForm.svelte';
	import Arrow from '$lib/components/Arrow.svelte';
	import Mark from '$lib/components/Mark.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/*
	 * ── NOTAS PARA DAMIAN (editoriales, en español a propósito) ─────────────
	 *
	 * 0. DATOS CONFIRMADOS POR TI (no los cambies sin querer): salida 6pm de
	 *    Surinam, desembarco 9pm del día siguiente = 27 horas en el bote. Tres
	 *    aviones hasta Porto Alegre y a Uruguay en auto. Un año hasta volver a
	 *    estar con tus hijos. Ahora vives en Canadá.
	 *
	 * 1. EL CRITERIO (PRODUCT.md, 23 sep 2026): la carta cuenta la historia, el
	 *    sitio hace el trabajo. Aquí no se copia ni se resume ningún envío: se
	 *    enlazan los tres últimos por título y fecha, y se leen solos de Substack
	 *    (+page.server.ts). Si Substack no responde, la lista no se pinta.
	 *
	 * 2. LA HOME NO LLEVA CAMPOS DE HERRAMIENTAS. Cada herramienta y cada descarga
	 *    tiene su página con su campo; aquí cada fila es una puerta y dice qué
	 *    metes (`takes` en src/lib/tools/list.ts). Tres campos en toda la página:
	 *    el alta de arriba, el hueco y el alta de abajo.
	 *
	 * 3. FALTAN PRUEBAS. Ni un cliente, ni una cifra inventada. Una línea real
	 *    —"esto se lo monté a un taller de Montevideo"— vale más que medio texto.
	 *
	 * 4. LAS DOS ALTAS van a la página de Substack con el correo relleno
	 *    (`subscribeUrl`). La de abajo era el iframe de Substack; se cambió porque
	 *    eran 320px de caja blanca ajena encima del cierre en tinta, y el alta es
	 *    la misma: se confirma allí.
	 *
	 * 5. «SIN DECÍRSELO A MIS AMIGOS», nunca «a nadie»: «a nadie» mete a tu mujer
	 *    en el mismo saco. La versión corta de la historia aquí no lo cuenta; si
	 *    vuelve la larga, esa frase va así.
	 *
	 * 6. EL TITULAR HABLA DEL CLIENTE. «Me hago las herramientas que no encuentro»
	 *    se descartó: hablaba de ti. La entradilla va en afirmativo y sin «cada
	 *    semana» (sonaba a calendario); el ritmo lo dice la nota del alta.
	 *
	 * 7. TITULARES ALTERNATIVOS:
	 *    - La herramienta que necesitas no existe.
	 *    - Estás pagando por software que podrías hacerte en una tarde.
	 *    - Pega tu Substack. Mira lo que sale.
	 * ─────────────────────────────────────────────────────────────────────────
	 */

	/*
	 * The two asks share their terms. `note` names Substack out loud because the
	 * button leaves this site, and «te borras en un clic» is the same promise the
	 * download pages make in `SUBSCRIBE_NOTE`, said the same way on purpose.
	 */
	const t = {
		placeholder: 'tu@email.com',
		fieldLabel: 'Tu correo electrónico',
		button: 'Apúntame',
		note: 'Un correo a la semana con la herramienta nueva y cómo la hice. El alta se confirma en Substack, que es donde escribo. Te borras en un clic.'
	};

	let heroEmail = $state('');
	let closeEmail = $state('');

	/*
	 * The gap's copy. It promises the letter and nothing else — no «te aviso»,
	 * which nothing here could keep: no address is asked for and none is stored.
	 */
	const g = {
		title: '¿Qué haces a mano cada semana?',
		text: 'Dímelo. Si la construyo, aparece aquí y la cuento en la carta. No te pido el correo.',
		placeholder: 'Cuadrar facturas a mano',
		fieldLabel: 'La herramienta que te falta',
		button: 'Mándalo',
		busy: 'Mandando...',
		sentTitle: 'Anotado.',
		sentBody: 'Lo leo yo. Si construyo esa, la cuento en la carta.',
		note: `Entre ${GAP_MIN} y ${GAP_MAX} caracteres.`,
		errorLength: `Cuéntamelo un poco mejor: entre ${GAP_MIN} y ${GAP_MAX} caracteres.`,
		errorRateLimit: 'Ya me has mandado unas cuantas hoy. Sigue mañana.',
		errorGeneric: 'Algo ha fallado por mi parte. Inténtalo otra vez.',
		errorOffline: 'No se pudo conectar. Revisa tu conexión.'
	};

	let gapTool = $state('');
	let gapBusy = $state(false);
	let gapError = $state('');
	let gapSent = $state(false);

	async function sendGap() {
		if (!isGapRequestValid(gapTool)) {
			gapError = g.errorLength;
			return;
		}
		gapBusy = true;
		gapError = '';
		try {
			await postTool('/hueco', { tool: gapTool }, { ...g, errorGapLength: g.errorLength });
			gapSent = true;
		} catch (caught) {
			gapError = caught instanceof Error ? caught.message : g.errorOffline;
		} finally {
			gapBusy = false;
		}
	}

	/*
	 * Hand the address to Substack's own subscribe page, prefilled. Another
	 * origin, so `location.assign` and not `goto`.
	 */
	function subscribe(email: string) {
		window.location.assign(subscribeUrl(email));
	}

	// The line that knows the hour. Computed in the browser so it matches the
	// visitor; empty on the server rather than a wrong guess.
	let greeting = $state('');

	function timeGreeting(): string {
		const h = new Date().getHours();
		if (h < 6) return 'Las tantas de la madrugada y aquí sigues, dándole vueltas al negocio. Lo sé.';
		if (h < 13) return 'Es por la mañana y ya andas buscando cómo quitarte trabajo de encima. Bien.';
		if (h < 20) return 'Media tarde y, en vez de estar con el negocio, buscas cómo hacer que se lleve solo. Vas bien.';
		return 'Es de noche y sigues pensando en el negocio. Lo sé.';
	}

	onMount(() => {
		greeting = timeGreeting();

		console.log(
			'%cSi has abierto esto, tú y yo nos vamos a entender.%c\nEscribe damian.ayuda() y sigue tirando del hilo.',
			'font-size:14px;font-weight:700;color:#161514',
			'font-size:14px;color:#6b6862'
		);

		/*
		 * THE CONSOLE IS A REAL DOOR, not a printed message. Somebody who opens dev
		 * tools here is the audience mid-proof, so the functions WORK:
		 * `damian.hueco('...')` posts to the same endpoint the wanted block does.
		 */
		Object.assign(window, {
			damian: {
				ayuda() {
					console.log(
						[
							'damian.herramientas()  las que hay, con su enlace',
							'damian.hueco(texto)    dime cuál te falta, va al mismo sitio que el hueco de la página',
							'damian.carta()         te lleva a suscribirte',
							'',
							'Y en la página: ⌘K o ? abren el buscador.'
						].join('\n')
					);
				},
				herramientas() {
					console.table(
						[...tools, ...resources.map((r) => ({ name: r.name, href: resourceHref(r) }))].map(
							(item) => ({ herramienta: item.name, dónde: item.href })
						)
					);
				},
				async hueco(text: string) {
					if (!isGapRequestValid(text)) {
						console.warn(`Entre ${GAP_MIN} y ${GAP_MAX} caracteres, y que sea de verdad.`);
						return;
					}
					await postTool('/hueco', { tool: text }, { ...g, errorGapLength: g.errorLength });
					console.log('Anotado. Si construyo esa, la cuento en la carta.');
				},
				carta: () => window.location.assign(subscribeUrl(''))
			}
		});
	});
</script>

<PageMeta
	title="Objeto Brillante — Damian Soto"
	description="Herramientas gratis para tu Substack, hechas por una persona sola. Úsalas aquí con lo tuyo, y cada semana una nueva y cómo la hice."
/>

<!--
	THE FIRST VIEWPORT: centred on the mango field. The headline at poster size,
	one line under it, and the ask. It names the visitor's problem, not Damian —
	the rows below are the answer.
-->
<section class="poster-hero" aria-labelledby="hero-title">
	<div class="wide">
		<h1 id="hero-title" class="poster-title">Nadie va a construir la herramienta que te falta.</h1>
		<p class="poster-lead">
			Yo me construyo las mías. Aquí las tienes, gratis y funcionando, para tu Substack.
		</p>
		<InlineForm
			bind:value={heroEmail}
			type="email"
			placeholder={t.placeholder}
			fieldLabel={t.fieldLabel}
			label={t.button}
			inputmode="email"
			autocomplete="email"
			onsubmit={() => subscribe(heroEmail)}
		/>
		<p class="poster-note">{t.note}</p>
	</div>
</section>

<!--
	THE TOOLS: doors, not forms. Each row is the whole click target and says what
	goes in; the field is on the tool's own page.
-->
<section id="herramientas" class="band" aria-labelledby="tools-title">
	<div class="wide">
		<div class="grid-12 band-head">
			<h2 id="tools-title" class="band-title">Úsalas aquí. Con lo tuyo.</h2>
			<p class="band-intro">
				Cada una hace un trabajo que hoy haces a mano, o que no haces. Metes lo tuyo y te llevas el
				resultado.
			</p>
		</div>

		<ul class="doors">
			{#each tools as tool (tool.href)}
				<li>
					<a href={tool.href} class="door">
						<h3 class="door-name">{tool.name}</h3>
						<p class="door-give">
							{tool.blurb}
							<span class="door-takes label"
								>Metes <b>{tool.takes}</b>{#if !tool.capturesEmail}&nbsp;· sin correo{/if}</span
							>
						</p>
						<Arrow class="door-go" />
					</a>
				</li>
			{/each}
		</ul>

		<!--
			THE WANTED ONE, closing the row of tools: the only reversed block in the content,
			because it is the only tool that doesn't exist yet. It asks for no
			address — this is the one place a visitor gets to SAY something.
		-->
		<div class="wanted on-ink">
			<div class="grid-12">
				<h3 class="wanted-title">{g.title}</h3>
				<div class="wanted-body" aria-live="polite">
					{#if gapSent}
						<p class="wanted-sent"><b>{g.sentTitle}</b> {g.sentBody}</p>
					{:else}
						<p>{g.text}</p>
						{#if gapError}<p class="text-error mb-3 text-sm">{gapError}</p>{/if}
						<InlineForm
							bind:value={gapTool}
							placeholder={g.placeholder}
							fieldLabel={g.fieldLabel}
							label={g.button}
							busyLabel={g.busy}
							busy={gapBusy}
							onsubmit={sendGap}
						/>
						<p class="muted mt-3">{g.note}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>

<!--
	THE DOWNLOADS, as objects: a file you take away gets a cover. Each is a door
	to its /recursos page, which is where the address is asked for.
-->
<section id="descargas" class="band band-sheet" aria-labelledby="files-title">
	<div class="wide">
		<div class="grid-12 band-head">
			<h2 id="files-title" class="band-title">Estas te las llevas.</h2>
			<p class="band-intro">Archivos para tu disco. Son tuyos aunque te borres mañana.</p>
		</div>
		<ul class="files">
			{#each resources as resource, index (resource.slug)}
				<li>
					<a href={resourceHref(resource)} class="file">
						<span class="cover" class:is-signal={index % 2 === 1} aria-hidden="true">
							<span class="cover-meta">{resource.format} · {resource.cover.opens}</span>
							<span>
								<Mark class="cover-star" />
								<span class="cover-title block">{resource.cover.title}</span>
							</span>
							<span class="cover-meta">Damian Soto</span>
						</span>
						<span class="block">
							<h3 class="file-name">{resource.name}</h3>
							<p class="file-blurb">{resource.blurb}</p>
							<span class="file-take">Llévatelo <Arrow /></span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</section>

<!--
	WHO WRITES, and the newsletter as a REFERENCE: its latest issues by title and
	date, linking out. Never an excerpt (PRODUCT.md, the criterion).
-->
<section class="band letter" aria-labelledby="letter-title">
	<div class="wide grid-12">
		<h2 id="letter-title" class="letter-quote">
			Las herramientas, aquí. <span>Cómo las hago, en la carta.</span>
		</h2>
		<div class="letter-side">
			<p>
				Soy Damian. Salí de Cuba en 2022 y empecé de cero en Canadá. Cada semana me hago una
				herramienta para un negocio real, y en <strong>Objeto Brillante</strong> cuento cómo, para que
				tú puedas hacerte las tuyas.
			</p>
			<p>
				No es un curso ni una plantilla. <strong>No escribo bonito. Escribo lo que sé.</strong>
			</p>

			{#if data.issues.length}
				<div class="issues">
					<h3 class="issues-title">Lo último en la carta</h3>
					<ul>
						{#each data.issues as issue (issue.url)}
							<li>
								<a class="issue" href={issue.url} target="_blank" rel="noopener noreferrer">
									<span class="issue-title">{issue.title}</span>
									<time class="issue-date" datetime={issue.date}>{shortDate(issue.date)}</time>
								</a>
							</li>
						{/each}
					</ul>
					<a class="issues-all" href="{PUBLICATION_URL}/archive" target="_blank" rel="noopener noreferrer"
						>Todas las cartas <Arrow /></a
					>
				</div>
			{/if}
		</div>
	</div>
</section>

<!-- THE CLOSE: the second ask, for whoever just read the page. `id="alta"` is
     what the header, a post or an email link to. -->
<section id="alta" class="poster-close on-ink" aria-labelledby="close-title">
	<div class="wide">
		<h2 id="close-title">Si alguna te sirvió, <span>la próxima llega la semana que viene.</span></h2>
		<!-- The line that knows the hour lives here, at the end: the voice of
		     somebody who noticed you read the whole page. It reserves its height so
		     filling it on mount moves nothing. -->
		<p class="greeting">{greeting}</p>
		<p>La herramienta nueva y cómo la hice. Si te canso, un clic y desaparezco.</p>
		<InlineForm
			bind:value={closeEmail}
			type="email"
			placeholder={t.placeholder}
			fieldLabel={t.fieldLabel}
			label={t.button}
			inputmode="email"
			autocomplete="email"
			onsubmit={() => subscribe(closeEmail)}
		/>
		<p class="poster-note">El alta se confirma en Substack. — Damian</p>
	</div>
</section>
