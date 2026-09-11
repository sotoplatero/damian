<script lang="ts">
	/**
	 * La página de instalación del skill.
	 *
	 * ── NOTAS PARA DAMIAN ───────────────────────────────────────────────────
	 *
	 * 1. LA DESCARGA NO PIDE CORREO, y eso la saca de `/recursos/`, donde todo
	 *    lo pide. No hace falta: el skill NO reimplementa las herramientas, las
	 *    LLAMA, así que la puerta sigue estando donde estaba —en el `unlock` de
	 *    cada endpoint— y la dirección se captura igual, solo que desde una
	 *    terminal. Poner un formulario aquí delante sería cobrar dos veces por
	 *    lo mismo.
	 *
	 * 2. EL ZIP NO LLEVA VERSIÓN EN LA URL, por lo mismo que `cervantes.zip`:
	 *    un enlace compartido hace meses tiene que seguir dando el último. Sacar
	 *    una versión nueva es `node --experimental-strip-types skill/build.mjs`,
	 *    que reescribe `static/damiansoto-skill.zip` desde `skill/damiansoto/`.
	 *
	 * 3. LOS TRES PASOS SON EL PRODUCTO de esta página. Quien llega aquí ya
	 *    quiere el fichero; lo que no sabe es dónde se pone. La ruta de Windows
	 *    va al lado de la de macOS y Linux a propósito: la mitad de la gente que
	 *    lee esto está en Windows y la carpeta se llama distinto.
	 * ─────────────────────────────────────────────────────────────────────────
	 */
	import PageMeta from '$lib/components/PageMeta.svelte';

	const t = {
		download: 'Descargar el skill',
		copied: 'Copiado',
		copy: 'Copiar'
	};

	const ZIP = '/damiansoto-skill.zip';

	let copied = $state('');

	function copy(text: string, id: string) {
		navigator.clipboard?.writeText(text).then(() => {
			copied = id;
			setTimeout(() => (copied = ''), 1600);
		});
	}

	const unix = 'unzip ~/Downloads/damiansoto-skill.zip -d ~/.claude/skills/';
	const win = 'Expand-Archive $HOME\\Downloads\\damiansoto-skill.zip $HOME\\.claude\\skills\\';
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

	<div class="mt-8">
		<a class="btn btn-primary btn-lg" href={ZIP} download>{t.download}</a>
	</div>

	<!-- Los tres pasos. Quien llega aquí ya quiere el fichero: lo que no sabe es
	     dónde va. -->
	<ol class="install-steps mt-10">
		<li>
			<p class="box-title">Descárgalo</p>
			<p class="body-text mt-1">Son 31 KB. Ni instalador, ni dependencias, ni cuenta.</p>
		</li>
		<li>
			<p class="box-title">Descomprímelo en tu carpeta de skills</p>
			<p class="body-text mt-1">
				La carpeta <code>damiansoto</code> tiene que quedar dentro de
				<code>.claude/skills/</code>.
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
		</li>
		<li>
			<p class="box-title">Pídeselo</p>
			<p class="body-text mt-1">
				Abre Claude Code y dile <em>«reparte este artículo en notas»</em> con un enlace, o
				<em>«bájame el archivo de kloshletter»</em>. Él solo se acuerda de que tiene esto.
			</p>
		</li>
	</ol>

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
			Necesitas <a class="link" target="_blank" rel="noopener noreferrer" href="https://claude.com/claude-code">Claude Code</a>
			instalado y Node. No hace falta saber programar. Descargarlo no te suscribe a nada; lo que
			sí te da de alta es pedir la mitad que va por correo, igual que aquí.
		</p>
	</div>
</section>

<style>
	/* La lista de pasos: los números en su propia columna, como los de la home. */
	.install-steps {
		list-style: none;
		counter-reset: step;
		/* Solo el relleno de la lista. `margin: 0` aquí le ganaba al `mt-10` del
		   marcado —la clase con ámbito tiene más especificidad que la utilidad— y
		   los pasos se pegaban al botón. */
		padding-inline-start: 0;
		display: grid;
		gap: 1.5rem;
	}
	.install-steps > li {
		counter-increment: step;
		display: grid;
		grid-template-columns: 2rem minmax(0, 1fr);
		column-gap: 0.75rem;
	}
	.install-steps > li::before {
		content: counter(step, decimal-leading-zero);
		color: var(--color-muted);
		font-variant-numeric: tabular-nums;
		grid-row: 1 / -1;
	}
	.install-steps > li > * {
		grid-column: 2;
	}

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
</style>
