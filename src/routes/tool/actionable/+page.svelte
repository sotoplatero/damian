<script lang="ts">
	import PageMeta from '$lib/components/PageMeta.svelte';
	import InlineForm from '$lib/components/InlineForm.svelte';
	import { postTool, revealResult } from '$lib/tools/client';
	import type { AxisId, Discarded, Judgment, Verdict } from '$lib/tools/actionable/judgment';
	import { MIN_FIELDS, type Spec } from '$lib/tools/actionable/spec';

	/*
	 * Phase one: the judgment on its own, nothing built yet. The page says so
	 * out loud instead of implying a second half that isn't there — a tool that
	 * exists to be honest about what it can't do can't open by overselling
	 * itself.
	 */
	const t = {
		urlPlaceholder: 'https://tublog.com/tu-articulo',
		urlButton: 'Enviar',
		urlWorking: 'Leyendo la página...',
		urlHint: 'El enlace de un artículo que explique cómo se hace algo.',
		readLine: 'He leído {site}.',
		restart: 'Probar con otra página',
		errorUnreadable: 'Esa página no me deja leerla. Prueba con otra, o pega el enlace del artículo en lugar de la portada.',
		errorBlocked: 'Esa web me cierra la puerta cuando entro yo. Si está detrás de un muro, prueba con otra.',
		errorNotFound: 'Ahí no hay nada. Revisa el enlace.',
		errorTimeout: 'Esa página ha tardado demasiado. Inténtalo otra vez.',
		errorEmpty: 'He entrado, pero no he encontrado texto que leer. Pega el enlace del artículo, no el de la portada.',
		errorInvalidUrl: 'Esa dirección no parece válida.',
		errorRateLimit: 'Has probado unas cuantas ya. Espera un rato y vuelve.',
		errorNotConvertible: 'Esa página no da para herramienta, así que no hay nada que construir.',
		errorBadSpec: 'Ese plan se ha quedado sin lo mínimo: hacen falta al menos dos campos y dos reglas.',
		errorGeneric: 'Algo ha fallado por mi parte. Inténtalo otra vez.',
		errorOffline: 'No se pudo conectar. Revisa tu conexión.',

		planCta: 'Vale, hazme la herramienta',
		planWorking: 'Preparando el plan...',
		planTitle: 'Esto es lo que voy a construir',
		planLead: 'Antes de montar nada: cámbialo. Las etiquetas son lo que va a leer quien la use, y cada campo dice qué cambia en el resultado. Si uno no cambia nada, quítalo.',
		planName: 'Cómo se llama',
		planFields: 'Lo que va a pedir',
		planRules: 'Las reglas que va a aplicar',
		planRulesNote: 'Sacadas de tu artículo y escritas de nuevo, no copiadas: el procedimiento es tuyo, las frases se quedan en tu página.',
		planCount: 'Cuántos resultados devuelve',
		planChanges: 'Qué cambia según lo que se ponga aquí',
		planDrop: 'Quitar',
		planMinFields: 'Con menos de dos campos deja de ser una herramienta y pasa a ser un botón.',
		buildCta: 'Construir',
		buildWorking: 'Construyendo...',
		builtTitle: 'Ya está en pie',
		builtBody: 'Ese enlace es la herramienta entera. Compártelo, ábrelo, úsalo. Quien lo abra da su correo para ejecutarla, y ese correo va a tu lista.',
		copyLink: 'Copiar el enlace',
		copiedLink: 'Copiado',
		openTool: 'Abrirla',
		rebuild: 'Cambiar algo y rehacerla'
	};

	/** What each axis is called on screen. The ids are English; this is what the visitor reads. */
	const AXIS_NAME: Record<AxisId, string> = {
		procedimental: 'Tiene un procedimiento',
		parametrizable: 'El resultado cambia según quién la use',
		repetido: 'Se hace más de una vez',
		tedioso: 'Hacerlo a mano cuesta'
	};

	/** What we say when we took an axis down ourselves, instead of the reason that argues for it. */
	const DISCARDED: Record<Discarded, string> = {
		'sin-cita': 'Digo que sí, pero no he sido capaz de señalar dónde lo pone tu página. Así que no lo cuento.',
		'sin-pasos': 'No he podido sacar de tu página ni dos reglas que enumerar. Sin eso no hay procedimiento que convertir.'
	};

	/** The headline of each outcome, and the line under it. Refusals get the same care as the yeses. */
	const OUTCOME: Record<Verdict, { title: string; note: string }> = {
		sirve: {
			title: 'Esto se convierte en una herramienta',
			note: 'Las cuatro cosas que hacen falta están en la página.'
		},
		flojo: {
			title: 'Se puede, pero saldría floja',
			note: 'Falta algo de lo que hace que una herramienta se use más de una vez. Abajo tienes qué.'
		},
		'otra-forma': {
			title: 'Esto da para herramienta, pero no para la que sé hacer',
			note: 'La página se sostiene. Lo que pide no es un generador, y por ahora solo construyo generadores.'
		},
		no: {
			title: 'Esto no da para herramienta',
			note: 'Y forzarlo produciría un formulario que escupe un párrafo que ya te daría cualquier chat.'
		}
	};

	const SHAPE_NAME: Record<string, string> = {
		generador: 'un generador',
		calculadora: 'una calculadora',
		corrector: 'un corrector',
		checklist: 'una lista con memoria',
		guia: 'una guía con preguntas',
		plantilla: 'una plantilla'
	};

	let busy = $state<'' | 'judging' | 'planning' | 'building'>('');
	let error = $state('');
	let url = $state('');
	let finalUrl = $state('');
	let site = $state('');
	let judgment = $state<Judgment | null>(null);
	let verdict = $state<Verdict>('no');
	let spec = $state<Spec | null>(null);
	let link = $state('');

	const buildable = $derived(verdict === 'sirve' || verdict === 'flojo');

	async function judge() {
		busy = 'judging';
		error = '';
		try {
			const data = await postTool('/tool/actionable', { step: 'judge', url }, t);
			judgment = data.judgment as Judgment;
			verdict = data.verdict as Verdict;
			site = (data.site as string) ?? '';
			finalUrl = (data.url as string) ?? url;
			await revealResult();
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = '';
		}
	}

	/**
	 * The plan step, which is the point of the whole thing: nobody goes from a
	 * URL straight to a finished tool. What comes back is a draft the visitor
	 * corrects — the labels, the fields, how many results — and only then is
	 * anything built.
	 */
	async function plan() {
		busy = 'planning';
		error = '';
		try {
			const data = await postTool('/tool/actionable', { step: 'plan', url: finalUrl, judgment: $state.snapshot(judgment) }, t);
			spec = data.spec as Spec;
			await revealResult();
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = '';
		}
	}

	async function build() {
		busy = 'building';
		error = '';
		try {
			const data = await postTool('/tool/actionable', { step: 'build', spec: $state.snapshot(spec) }, t);
			link = new URL(data.path as string, location.origin).toString();
			await revealResult();
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = '';
		}
	}

	/** Dropping a field is the edit people make most, so it is one click and it is honest about the floor. */
	function dropField(id: string) {
		if (!spec || spec.campos.length <= MIN_FIELDS) return;
		spec.campos = spec.campos.filter((field) => field.id !== id);
	}

	let copied = $state(false);
	async function copyLink() {
		await navigator.clipboard.writeText(link);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function restart() {
		busy = '';
		error = '';
		url = '';
		finalUrl = '';
		site = '';
		judgment = null;
		spec = null;
		link = '';
	}
</script>

<PageMeta
	title="¿Tu artículo da para herramienta? — Damian Soto"
	description="Pega el enlace de un artículo que explique cómo se hace algo. Te digo si se convierte en una herramienta que la gente use, o por qué no."
/>

<!-- The four screens are one component on purpose: they are one thought
     (judge → plan → link) and splitting them across routes would mean carrying
     the judgment and the spec between pages for no gain. -->
{#if link}
	<section id="resultado" class="space-y-6">
		<button type="button" class="link-quiet" onclick={() => (link = '')}>← {t.rebuild}</button>
		<header class="prose prose-xl prose-neutral max-w-none">
			<h1>{t.builtTitle}</h1>
		</header>
		<p class="body-text">{t.builtBody}</p>

		<div class="box">
			<p class="body-text break-all">{link}</p>
			<div class="mt-4 flex flex-wrap gap-3">
				<button type="button" class="btn btn-primary" onclick={copyLink}>{copied ? t.copiedLink : t.copyLink}</button>
				<a class="btn" href={link} target="_blank" rel="noopener noreferrer">{t.openTool}</a>
			</div>
		</div>

		<button type="button" class="link-quiet" onclick={restart}>{t.restart}</button>
	</section>
{:else if spec}
	<section id="resultado" class="space-y-6">
		<button type="button" class="link-quiet" onclick={() => (spec = null)}>← {t.restart}</button>
		<header class="prose prose-xl prose-neutral max-w-none">
			<h1>{t.planTitle}</h1>
		</header>
		<p class="body-text">{t.planLead}</p>
		{#if error}<p class="text-sm text-error">{error}</p>{/if}

		<div class="box space-y-2">
			<span class="eyebrow">{t.planName}</span>
			<input class="w-full rounded-lg border border-line bg-white p-3" bind:value={spec.nombre} />
			<textarea class="w-full rounded-lg border border-line bg-white p-3" rows="2" bind:value={spec.queHace}></textarea>
		</div>

		<div class="space-y-4">
			<h2 class="letter-heading">{t.planFields}</h2>
			{#each spec.campos as field, index (field.id)}
				<div class="box space-y-2">
					<input class="w-full rounded-lg border border-line bg-white p-3" bind:value={spec.campos[index].etiqueta} />
					<input class="w-full rounded-lg border border-line bg-white p-3" bind:value={spec.campos[index].ayuda} />
					<p class="muted">{t.planChanges}</p>
					<textarea class="w-full rounded-lg border border-line bg-white p-3" rows="2" bind:value={spec.campos[index].cambia}></textarea>
					{#if spec.campos.length > MIN_FIELDS}
						<button type="button" class="link-quiet" onclick={() => dropField(field.id)}>{t.planDrop}</button>
					{/if}
				</div>
			{/each}
			{#if spec.campos.length <= MIN_FIELDS}
				<p class="muted">{t.planMinFields}</p>
			{/if}
		</div>

		<div class="box space-y-2">
			<h2 class="letter-heading">{t.planRules}</h2>
			<p class="muted">{t.planRulesNote}</p>
			{#each spec.reglas as _, index (index)}
				<textarea class="w-full rounded-lg border border-line bg-white p-3" rows="2" bind:value={spec.reglas[index]}></textarea>
			{/each}
		</div>

		<div class="box space-y-2">
			<span class="eyebrow">{t.planCount}</span>
			<input type="number" min="3" max="10" class="w-24 rounded-lg border border-line bg-white p-3" bind:value={spec.cuantos} />
		</div>

		<button type="button" class="btn btn-primary btn-lg" disabled={busy === 'building'} onclick={build}>
			{busy === 'building' ? t.buildWorking : t.buildCta}
		</button>
	</section>
{:else if !judgment}
	<section class="screen-center">
		<article class="prose prose-xl prose-neutral max-w-none">
			<h1>¿Tu artículo da para <strong>herramienta</strong>?</h1>
			<p>
				<strong>Pega el enlace.</strong> Te digo si lo que cuenta se puede convertir en algo que la
				gente use, en qué se convertiría, y si no da, por qué no da.
			</p>
		</article>
		{#if error}<p class="mt-6 text-sm text-error">{error}</p>{/if}
		<div class="mt-8">
			<InlineForm
				bind:value={url}
				placeholder={t.urlPlaceholder}
				label={t.urlButton}
				busyLabel={t.urlWorking}
				busy={busy === 'judging'}
				inputmode="url"
				autocomplete="url"
				onsubmit={judge}
			/>
			<p class="muted mt-2">{t.urlHint}</p>
		</div>
	</section>
{:else}
	<section id="resultado" class="space-y-6">
		<button type="button" class="link-quiet" onclick={restart}>← {t.restart}</button>
		<header class="prose prose-xl prose-neutral max-w-none">
			<h1>{OUTCOME[verdict].title}</h1>
		</header>
		{#if site}<p class="muted">{t.readLine.replace('{site}', site)}</p>{/if}
		{#if error}<p class="text-sm text-error">{error}</p>{/if}

		<p class="body-text">{OUTCOME[verdict].note}</p>
		<p class="body-text">{judgment.queHace}</p>

		{#if verdict === 'otra-forma'}
			<p class="body-text">Sería {SHAPE_NAME[judgment.forma] ?? judgment.forma}.</p>
		{/if}

		<!-- Without this the four axes can all show ✓ under a headline that says no,
		     which is the same self-contradiction as printing a discarded axis's
		     reason. The reason is not in the axes: it is that there is nothing to
		     put in. -->
		{#if !judgment.tareaDeTrabajo && judgment.tarea}
			<p class="body-text">
				Lo que enseña es «{judgment.tarea}», y eso no se hace sobre un material que tú traigas.
				Por buenos que sean sus criterios, no hay nada que rellenar ni nada que salga distinto.
			</p>
		{/if}

		<!-- The four axes, always all four and always with their reason. The
		     interpretation is the product: nobody should have to guess which of
		     the four decided it. -->
		<div class="space-y-4">
			{#each judgment.axes as axis (axis.id)}
				<div class="box">
					<h2 class="box-title">{axis.pasa ? '✓' : '✕'} {AXIS_NAME[axis.id]}</h2>
					<!-- When we overruled a pass, the reason under it argues the
					     opposite of the mark next to it. Printing both is the tool
					     contradicting itself in two lines, so the check speaks
					     instead of the model. -->
					<p class="body-text mt-2">{axis.descartado ? DISCARDED[axis.descartado] : axis.motivo}</p>
					{#if axis.pasa && axis.cita}
						<p class="muted mt-3">«{axis.cita}»</p>
					{/if}
				</div>
			{/each}
		</div>

		{#if judgment.masCercano}
			<div class="box">
				<h2 class="box-title">Lo más parecido que sí funcionaría</h2>
				<p class="body-text mt-2">{judgment.masCercano}</p>
			</div>
		{/if}

		<!-- The build offer only exists where the judgment earned it. A refusal
		     that still shows a button is a refusal nobody believes. -->
		{#if buildable}
			<button type="button" class="btn btn-primary btn-lg" disabled={busy === 'planning'} onclick={plan}>
				{busy === 'planning' ? t.planWorking : t.planCta}
			</button>
		{/if}
	</section>
{/if}
