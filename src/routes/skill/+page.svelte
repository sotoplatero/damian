<script lang="ts">
	/**
	 * La página de instalación del skill.
	 *
	 * ── NOTAS PARA DAMIAN ───────────────────────────────────────────────────
	 *
	 * 1. EL PRODUCTO DE ESTA PÁGINA ES LA PRIMERA LÍNEA. `npx skills add` lo
	 *    resuelve entero: el CLI descubre el skill por
	 *    `/skill/.well-known/agent-skills/index.json`, comprueba el sha256 del
	 *    zip y lo deja instalado. Todo eso lo genera `skill/build.mjs`. Bajar el
	 *    zip a mano se queda debajo, para quien no quiera un npx, con la ruta de
	 *    Windows al lado de la de macOS y Linux: la mitad de la gente que lee
	 *    esto está en Windows y la carpeta se llama distinto.
	 *
	 * 2. LA DESCARGA NO PIDE CORREO, y eso la saca de `/recursos/`, donde todo
	 *    lo pide. No hace falta: el skill NO reimplementa las herramientas, las
	 *    LLAMA, así que la puerta sigue estando donde estaba —en el `unlock` de
	 *    cada endpoint— y la dirección se captura igual, solo que desde una
	 *    terminal. Poner un formulario aquí delante sería cobrar dos veces por
	 *    lo mismo.
	 *
	 * 3. EL ZIP NO LLEVA VERSIÓN EN LA URL, por lo mismo que `cervantes.zip`:
	 *    un enlace compartido hace meses tiene que seguir dando el último. Sacar
	 *    una versión nueva es `node --experimental-strip-types skill/build.mjs`.
	 *    Y va PLANO, con SKILL.md en la raíz, porque lo exige el CLI. Por eso
	 *    los comandos de descomprimir llevan carpeta de destino: sin ella te
	 *    esparce ocho ficheros sueltos por `~/.claude/skills/`.
	 * ─────────────────────────────────────────────────────────────────────────
	 */
	import PageMeta from '$lib/components/PageMeta.svelte';

	const t = { download: 'Descargar el zip', copied: 'Copiado', copy: 'Copiar' };

	const ZIP = '/damiansoto-skill.zip';

	let copied = $state('');

	function copy(text: string, id: string) {
		navigator.clipboard?.writeText(text).then(() => {
			copied = id;
			setTimeout(() => (copied = ''), 1600);
		});
	}

	const install = 'npx skills add https://damiansoto.me/skill';
	const unix = 'unzip damiansoto-skill.zip -d ~/.claude/skills/damiansoto';
	const win = 'Expand-Archive damiansoto-skill.zip $HOME\\.claude\\skills\\damiansoto';
</script>

<PageMeta
	title="El skill de mis herramientas — Damian Soto"
	description="Mis herramientas dentro de tu Claude Code: distribuye un artículo en nueve notas, saca diez posts de una idea, reescribe el Acerca de de tu Substack y baja el archivo de una newsletter."
/>

<section class="screen-center">
	<article class="prose prose-xl prose-neutral max-w-none">
		<h1>Mis herramientas, <mark>dentro de tu terminal</mark></h1>
		<p>
			Las mismas herramientas de esta página, pedidas desde tu terminal. Funcionan igual: una
			parte sale en pantalla y la otra te llega al correo.
		</p>
	</article>

	<!-- La línea que instala. Es el producto de la página: lo de abajo es para
	     quien no quiera un npx. -->
	<div class="cmd cmd-lead mt-8">
		<code>{install}</code>
		<button type="button" class="btn btn-primary" onclick={() => copy(install, 'npx')}>
			{copied === 'npx' ? t.copied : t.copy}
		</button>
	</div>
	<p class="muted mt-3">
		Vale para Claude Code, Codex, Cursor y unos cuantos más. Después, abre tu agente y pídele
		<em>«reparte este artículo en notas»</em> con un enlace, o
		<em>«bájame el archivo de kloshletter»</em>.
	</p>

	<section class="section">
		<h2 class="letter-heading">Si prefieres hacerlo a mano</h2>
		<p class="section-intro">Son 22 KB. Ni instalador, ni dependencias, ni cuenta.</p>

		<div class="mt-6">
			<a class="btn btn-lg" href={ZIP} download>{t.download}</a>
		</div>

		<p class="body-text mt-6">
			Descomprímelo en una carpeta <code>damiansoto</code> dentro de
			<code>.claude/skills/</code>. La carpeta de destino hace falta: el zip va plano.
		</p>

		<div class="mt-3 space-y-2">
			<div class="cmd">
				<code>{unix}</code>
				<button type="button" class="btn btn-sm" onclick={() => copy(unix, 'unix')}>
					{copied === 'unix' ? t.copied : t.copy}
				</button>
			</div>
			<div class="cmd">
				<code>{win}</code>
				<button type="button" class="btn btn-sm" onclick={() => copy(win, 'win')}>
					{copied === 'win' ? t.copied : t.copy}
				</button>
			</div>
		</div>
	</section>

	<section class="section">
		<h2 class="letter-heading">Lo que sabe hacer</h2>
		<ul class="mt-6 space-y-3">
			<li class="box">
				<p class="box-title">Distribuir un artículo</p>
				<p class="box-text mt-1">
					Nueve notas de un artículo tuyo: cinco con sus datos y cuatro que van más lejos que él.
				</p>
			</li>
			<li class="box">
				<p class="box-title">Diez posts de una sola idea</p>
				<p class="box-text mt-1">
					Escribes el tema con tus palabras y salen diez posts distintos, uno por molde.
				</p>
			</li>
			<li class="box">
				<p class="box-title">Reescribir el «Acerca de» de tu Substack</p>
				<p class="box-text mt-1">
					Cinco criterios con su cita literal, y después la versión nueva entera.
				</p>
			</li>
			<li class="box">
				<p class="box-title">Bajar el archivo de una newsletter</p>
				<p class="box-text mt-1">
					El de otro, el que quieres estudiar: el índice en CSV y sus posts en markdown.
				</p>
			</li>
		</ul>
	</section>

	<div class="mt-8">
		<p class="muted">
			Necesitas <a
				class="link"
				target="_blank"
				rel="noopener noreferrer"
				href="https://claude.com/claude-code">Claude Code</a
			>
			u otro agente, y Node. No hace falta saber programar. Instalarlo no te suscribe a nada; lo
			que sí te da de alta es pedir la mitad que va por correo, igual que aquí.
		</p>
	</div>
</section>

<style>
	/* El comando y su botón. Se envuelve en móvil en vez de desbordar. */
	.cmd {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		border: 1px solid var(--color-line);
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
	}
	.cmd code {
		flex: 1 1 16rem;
		min-width: 0;
		overflow-x: auto;
		white-space: nowrap;
		font-size: 0.875rem;
	}
	/* La de instalar pesa más que las otras dos: es la que hay que ver primero. */
	.cmd-lead {
		border-color: var(--color-ink);
		padding: 0.75rem 0.75rem 0.75rem 1rem;
	}
	.cmd-lead code {
		font-size: 1rem;
	}
</style>
