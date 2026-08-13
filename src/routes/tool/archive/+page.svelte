<script lang="ts">
	import PageMeta from '$lib/components/PageMeta.svelte';
	import { errorMessage } from '$lib/tools/client';
	import type { ArchivePost } from '$lib/server/substack-archive';
	import {
		BODY_CAP,
		bodyCandidates,
		buildExport,
		exportFileName,
		minutesPhrase,
		monthsCovered,
		type ExportPub
	} from '$lib/tools/archive/export';
	import { zip } from '$lib/tools/archive/zip';

	/**
	 * THE LOOP LIVES HERE, and that is the point of the tool's shape.
	 *
	 * A post body is one request to Substack, so a whole archive is hundreds or
	 * thousands of them and no serverless function can sit through that. What
	 * survives between requests is this tab: it asks the server for one batch of
	 * bodies at a time, keeps them, and builds the zip itself when the archive runs
	 * out or when the visitor has had enough.
	 *
	 * Which is why the copy dwells on the tab staying open. It is not a caveat, it
	 * is how the thing works.
	 */

	/* The page's copy.
	 *
	 * WHO THIS IS FOR: reading SOMEBODY ELSE'S newsletter — the one you want to
	 * study, or keep, or hand to a model. Your own archive Substack exports for you,
	 * so copy written as "tu newsletter" sent people looking for a button they
	 * already had.
	 *
	 * Three things are said BEFORE the field, not in the confirmation where they
	 * would arrive once they no longer matter: that the address subscribes them,
	 * that it is one download per address, and that the writing inside belongs to
	 * whoever wrote it. */
	const t = {
		urlLabel: 'La dirección de la newsletter',
		urlPlaceholder: 'lanewsletter.substack.com',
		emailLabel: 'Tu email',
		emailPlaceholder: 'tu@email.com',
		button: 'Descargar el archivo',
		starting: 'Leyendo el índice...',
		/* Lo único que se dice bajo el formulario. Antes había tres notas más —el
		   límite de una por dirección, que el tuyo lo exporta Substack, y de quién
		   es lo que hay dentro— y sobraban ahí: la primera pantalla solo tiene que
		   decir el precio. Lo demás vive donde importa: la propiedad, en el estado
		   final y en el LEEME del zip; el límite, en su mensaje de error. */
		priceNote: 'Al dejar tu email te suscribes a Objeto Brillante, mi newsletter.',
		ownership:
			'Lo que hay dentro lo escribió quien lo escribió y sigue siendo suyo: no lo publiques como si fuera tuyo.',

		capTitle: 'Tengo los {done} más recientes',
		capBody:
			'Son los posts {range}. Esta publicación tiene {total} en total, así que faltan {rest}: bajarlos son {minutes} más con la pestaña abierta.',
		capWhy:
			'Paro aquí porque ciento cincuenta viene a ser el último año de una newsletter que escribe cada semana. No es un límite técnico: si los quieres todos, dilo.',
		capDownload: 'Descargar estos {done}',
		capContinue: 'Seguir con los {rest} que faltan',

		readingTitle: 'Bajando el archivo de {name}',
		progress: '{done} de {total} posts',
		progressNote:
			'Cada post es una petición a Substack, así que esto va a su ritmo. **No cierres la pestaña**: lo que ya ha llegado vive aquí, y el zip se arma al final.',
		eta: 'Le quedan unos {minutes} min',
		etaSoon: 'Va a acabar enseguida',
		pausedNote:
			'Substack ha pedido una pausa (son demasiadas peticiones seguidas). Sigo solo en {seconds} s, no toques nada.',
		retryNote: 'Se ha atascado una tanda. Lo intento otra vez en {seconds} s.',
		stop: 'Parar y descargar lo que llevo',
		stopping: 'Acabando la tanda en curso...',
		zipping: 'Armando el zip...',

		doneTitle: 'Ya lo tienes',
		doneBody: 'Se ha descargado {file}: {posts} entradas en el índice y {bodies} posts enteros dentro.',
		donePartial:
			'Se ha descargado {file} con {bodies} de los {asked} posts. El índice va completo, con las {posts} entradas.',
		doneNoAsk: 'Si tu navegador no ha preguntado nada, mira en tu carpeta de descargas.',
		mailSending: 'Te lo estoy mandando también por correo...',
		mailSent: 'Y te lo he mandado por correo, adjunto: ahí lo tienes aunque pierdas el zip.',
		mailTooBig:
			'Por correo no cabe (el zip pasa de cuatro megas), así que esta descarga es la única copia. Guárdala.',
		mailFailed:
			'El correo no ha salido, pero el zip ya está en tus descargas. Es la copia que cuenta.',
		cervantesTitle: 'Y ahora que tienes el texto',
		cervantesBody:
			'Cervantes es una carpeta que lee una newsletter entera para aprender cómo escribe y luego redacta contigo. Estos posts en markdown son justo lo que se come.',
		cervantesLink: 'Descargar Cervantes',
		doneNotes: 'Del contenido, que el LEEME.md de dentro explica largo:',
		noteFeed:
			'El archivo completo no ha contestado, así que esto sale del RSS: solo los 20 posts más recientes, y sin likes ni comentarios.',
		noteTruncated:
			'El archivo es tan largo que la lectura tocó su tope: hay posts más antiguos que no están en el índice.',
		notePaid:
			'De los posts de pago solo se puede leer lo que Substack muestra sin suscripción, así que esos cuerpos pueden estar cortados.',
		noteImported:
			'Algunas entradas llevan fecha anterior a la propia publicación. Pasa cuando el archivo se importó de otro sitio: Substack les pone fecha de relleno.',
		noteMissing:
			'{missing} posts se quedaron sin cuerpo: están en el índice igual, con su fecha y su enlace. El LEEME de dentro dice por qué en cada caso.',
		restart: 'Descargar otra',

		errorUnreadable:
			'No he podido leer esa publicación. Tiene que ser una newsletter de Substack pública.',
		errorInvalidUrl: 'Esa dirección no me sirve. Pega la de la newsletter, tal cual.',
		errorNotFound: 'Ahí no hay nada. Comprueba la dirección.',
		errorBlocked: 'Substack no me ha dejado leerla ahora mismo. Prueba en un rato.',
		errorTimeout: 'Ha tardado demasiado en contestar. Prueba otra vez.',
		errorEmpty: 'Eso no parece una newsletter de Substack.',
		errorInvalidEmail: 'Ese email no parece válido.',
		errorDisposable: 'Eso es un buzón de usar y tirar. Dame uno de verdad.',
		errorAlreadyUsed:
			'Con esa dirección ya te llevaste un archivo. Es una por dirección; busca el zip en tus descargas.',
		errorRateLimit: 'Has pedido esto unas cuantas veces. Espera un rato y vuelve.',
		errorPassExpired: 'La sesión de descarga ha caducado. Vuelve a empezar y no cierres la pestaña.',
		errorStalled:
			'La descarga se ha atascado del todo. Aquí abajo tienes lo que llegó hasta ahora.',
		errorGeneric: 'Algo ha fallado por mi parte. Inténtalo otra vez.',
		errorOffline: 'No se pudo conectar. Revisa tu conexión.'
	};

	const ENDPOINT = '/tool/archive/api';
	/**
	 * How many slugs to offer per call.
	 *
	 * Not "as many as fit": the progress bar only moves when a batch returns, and a
	 * batch that runs to the server's 40 s deadline leaves the number sitting still
	 * for forty seconds. Measured, a batch of 150 consumed 116 of them in exactly
	 * that time. Fifty comes back in about seventeen seconds, so the count keeps
	 * moving and the cost is a few more round trips.
	 */
	const CHUNK = 50;
	/** After a 429. Measured: capacity is back about 31 s after it runs out. */
	const PAUSE_S = 40;
	/** After a batch that simply failed. Shorter: this is a hiccup, not a refusal. */
	const RETRY_S = 6;
	const MAX_FAILURES = 3;
	/** Measured: post pages come back at about 2.9 a second, sustained. */
	const POSTS_PER_SECOND = 2.9;
	/**
	 * Por encima de esto no se intenta el correo. Vercel corta el cuerpo de una
	 * petición en 4,5 MB y contesta 413 antes de que corra nuestro código, así que
	 * el aviso se da aquí, con la descarga ya hecha. Medido: un archivo de 1300
	 * posts pesa unos 800 KB, así que esto queda muy lejos.
	 */
	const MAIL_MAX_BYTES = 4 * 1024 * 1024;

	type StartPayload = {
		pass: string;
		slug: string;
		pub: ExportPub;
		posts: ArchivePost[];
		truncated: boolean;
		fromFeed: boolean;
	};

	type Phase = 'form' | 'starting' | 'reading' | 'paused' | 'atCap' | 'zipping' | 'done';

	let url = $state('');
	let email = $state('');
	let phase = $state<Phase>('form');
	let error = $state('');
	let notice = $state('');
	let countdown = $state(0);
	let stopAsked = $state(false);

	let pubName = $state('');
	/** Posts this publication has that are worth a body: the loop's whole job. */
	let asked = $state(0);
	/** Bodies in hand. */
	let fetched = $state(0);
	/** Slugs already spent, body or not — the cap counts requests, not successes. */
	let attempted = $state(0);
	/** Where the loop stops for now: `BODY_CAP` first, everything if asked. */
	let target = $state(0);
	/**
	 * The months the bodies in hand cover, «de agosto de 2025 a agosto de 2026».
	 *
	 * Computed when the loop pauses at the cap rather than read from `bodies` in the
	 * markup: `bodies` is a Map held outside the reactive graph, and a template that
	 * reads it only repaints correctly because `phase` happens to change at the same
	 * moment. Svelte says so out loud, and it is right.
	 */
	let capRange = $state('');
	let done = $state<{ file: string; bodies: number; asked: number; posts: number; notes: string[] } | null>(
		null
	);
	/** Cómo ha ido el correo, que se manda después de la descarga y no la bloquea. */
	let mail = $state<'sending' | 'sent' | 'too_big' | 'failed' | ''>('');

	/**
	 * The loop's own state, deliberately NOT reactive: it is read by `pump` and
	 * written once per batch, and the three numbers above are what the screen
	 * needs. Keeping the map and the queue out here is what lets the loop stop at
	 * the cap, ask, and carry on where it left off.
	 */
	let session: StartPayload | null = null;
	let queue: string[] = [];
	let bodies = new Map<string, string>();

	const ready = $derived(url.trim().length > 0 && email.trim().length > 0);
	const goal = $derived(Math.min(target, asked));
	const percent = $derived(goal ? Math.round((fetched / goal) * 100) : 0);
	const minutesLeft = $derived(Math.ceil((goal - attempted) / POSTS_PER_SECOND / 60));
	const missing = $derived(asked - attempted);

	function fill(template: string, values: Record<string, string | number>): string {
		return Object.entries(values).reduce(
			(text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
			template
		);
	}

	/** **bold** → <strong>, for the one line that needs it. */
	function bold(text: string): string {
		return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	}

	async function post<T>(payload: Record<string, unknown>): Promise<T> {
		const response = await fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const data = await response.json().catch(() => ({}));
		if (!response.ok) {
			const code = (data as { error?: string })?.error;
			const message =
				code === 'pass_expired'
					? t.errorPassExpired
					: errorMessage(t, code, (data as { reason?: string })?.reason);
			throw new Error(message);
		}
		return data as T;
	}

	/** A visible wait. Nothing is happening and the page has to say why. */
	async function wait(seconds: number): Promise<void> {
		countdown = seconds;
		while (countdown > 0 && !stopAsked) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			countdown -= 1;
		}
		countdown = 0;
	}

	async function run() {
		if (!ready) return;
		phase = 'starting';
		error = '';
		notice = '';
		stopAsked = false;
		fetched = 0;
		attempted = 0;

		try {
			session = await post<StartPayload>({ step: 'start', url, email });
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
			phase = 'form';
			return;
		}

		pubName = session.pub.name;
		const candidates = bodyCandidates(session.posts);
		asked = candidates.length;
		queue = candidates.map((post) => post.slug);
		bodies = new Map();
		// The first goal is the cap, not the archive. See `BODY_CAP`: it is where the
		// download stops and ASKS, because 150 posts is about the last year and a
		// whole archive can be a quarter of an hour.
		target = Math.min(BODY_CAP, asked);

		await pump();
	}

	/** Works the queue down to `target`, or until Substack or the visitor says otherwise. */
	async function pump() {
		if (!session) return;
		phase = 'reading';
		let failures = 0;

		while (queue.length && !stopAsked && attempted < target) {
			let batch: { markdown: Record<string, string>; consumed: number; stoppedBy: string };
			try {
				batch = await post({
					step: 'batch',
					slug: session.slug,
					email,
					pass: session.pass,
					// Never past the target: overshooting the cap would fetch posts
					// nobody asked for and then throw them away.
					slugs: queue.slice(0, Math.min(CHUNK, target - attempted))
				});
				failures = 0;
			} catch (caught) {
				// A batch that fails takes nothing with it: the queue is untouched, so
				// the same slugs are simply offered again.
				failures += 1;
				if (caught instanceof Error && caught.message === t.errorPassExpired) {
					error = t.errorPassExpired;
					break;
				}
				if (failures >= MAX_FAILURES) {
					error = t.errorStalled;
					break;
				}
				notice = fill(t.retryNote, { seconds: RETRY_S });
				phase = 'paused';
				await wait(RETRY_S);
				notice = '';
				phase = 'reading';
				continue;
			}

			for (const [slug, markdown] of Object.entries(batch.markdown)) bodies.set(slug, markdown);
			// By what the server consumed, not by what came back with a body: a post
			// that answers empty must not be asked for again. Same trap as the archive
			// walk's `offset += received.length`.
			const consumed = Math.max(batch.consumed, 0);
			queue = queue.slice(consumed);
			attempted += consumed;
			fetched = bodies.size;

			if (batch.stoppedBy === 'blocked' && queue.length && !stopAsked && attempted < target) {
				notice = '';
				phase = 'paused';
				await wait(PAUSE_S);
				phase = 'reading';
			}
		}

		// Out of posts, or told to stop: build the file. Stopped at the cap with more
		// left: ask, because "the last year" and "everything" are both reasonable and
		// only one of them is the visitor's.
		if (!queue.length) return finish('complete');
		if (stopAsked || error) return finish('stopped');
		capRange = session ? monthsCovered(session.posts, bodies) : '';
		phase = 'atCap';
	}

	/** The visitor wants the lot. Same queue, same pass, no ceiling. */
	async function continueAll() {
		target = asked;
		await pump();
	}

	async function finish(stoppedBy: 'complete' | 'cap' | 'stopped') {
		const start = session;
		if (!start) return;
		phase = 'zipping';
		const generatedAt = new Date();
		const { entries, summary } = buildExport({
			pub: start.pub,
			posts: start.posts,
			bodies,
			truncated: start.truncated,
			fromFeed: start.fromFeed,
			bodiesStoppedBy: stoppedBy,
			siteOrigin: location.origin,
			generatedAt
		});

		const file = exportFileName(start.slug, generatedAt);
		const bytes = await zip(entries, generatedAt);
		const blob = new Blob([bytes], { type: 'application/zip' });
		const href = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = href;
		link.download = file;
		// In the document before the click: a detached anchor's `download` is
		// honoured by most browsers and ignored by some, and when it is ignored the
		// tab NAVIGATES to the blob instead — which throws away every body this loop
		// spent minutes collecting. Appending costs one line.
		link.style.display = 'none';
		document.body.append(link);
		link.click();
		link.remove();
		// Revoked on a timer: revoking it straight away cancels the download in some
		// browsers, the kind of bug that only shows up on somebody else's machine.
		setTimeout(() => URL.revokeObjectURL(href), 10_000);

		done = {
			file,
			bodies: bodies.size,
			asked,
			posts: start.posts.length,
			notes: [
				start.fromFeed && 'feed',
				start.truncated && 'truncated',
				asked - bodies.size > 0 && 'missing',
				summary.paid > 0 && 'paid',
				summary.importedDates > 0 && 'imported'
			].filter((code): code is string => typeof code === 'string')
		};
		// El correo va después de la descarga y no la retiene: el zip ya está en el
		// disco, y si el envío falla la persona no ha perdido nada.
		void mailIt(start, file, bytes);
		phase = 'done';
	}

	/**
	 * Manda el zip por correo, adjunto.
	 *
	 * El fichero solo existe aquí —se ha armado en esta pestaña, tanda a tanda—, así
	 * que para que llegue por correo hay que subirlo. Va como cuerpo binario y no en
	 * JSON ni en base64: Vercel corta el cuerpo de una petición en 4,5 MB y base64
	 * se gastaría un tercio de eso en codificar.
	 *
	 * Las cabeceras llevan la reclamación (el mismo pase firmado que las tandas) y
	 * las CIFRAS del resumen, no la frase: una cabecera es latin-1 y «índice» la
	 * rompe. El español lo escribe el servidor.
	 */
	async function mailIt(start: StartPayload, file: string, bytes: Uint8Array) {
		if (bytes.length > MAIL_MAX_BYTES) {
			mail = 'too_big';
			return;
		}
		mail = 'sending';
		try {
			const response = await fetch(`${ENDPOINT}/email`, {
				method: 'POST',
				headers: {
					'content-type': 'application/zip',
					'x-archive-email': email,
					'x-archive-slug': start.slug,
					'x-archive-pass': start.pass,
					'x-archive-filename': file,
					'x-archive-name': encodeURIComponent(start.pub.name),
					'x-archive-posts': String(start.posts.length),
					'x-archive-bodies': String(bodies.size)
				},
				body: bytes as BodyInit
			});
			mail = response.ok ? 'sent' : 'failed';
		} catch {
			mail = 'failed';
		}
	}

	const NOTE_COPY: Record<string, (values: { missing: number }) => string> = {
		feed: () => t.noteFeed,
		truncated: () => t.noteTruncated,
		missing: ({ missing }) => fill(t.noteMissing, { missing }),
		paid: () => t.notePaid,
		imported: () => t.noteImported
	};

	function handle(event: SubmitEvent) {
		event.preventDefault();
		run();
	}

	function restart() {
		url = '';
		email = '';
		done = null;
		mail = '';
		error = '';
		notice = '';
		stopAsked = false;
		session = null;
		queue = [];
		bodies = new Map();
		fetched = 0;
		attempted = 0;
		asked = 0;
		target = 0;
		phase = 'form';
	}
</script>

<PageMeta
	title="Descarga el archivo de cualquier newsletter de Substack — Damian Soto"
	description="Pega la dirección de una newsletter y llévate un zip con su índice completo y sus posts en markdown."
/>

<section class="screen-center">
	<!-- El titular vive SOLO en el formulario. Bajando o ya descargado son estados
	     distintos, y repetir «pega su dirección» encima de una barra de progreso
	     hace que la página parezca no haber entendido lo que acabas de pedirle. -->
	{#if phase === 'form' || phase === 'starting'}
		<article class="prose prose-xl prose-neutral max-w-none">
			<h1>Descarga el archivo de <mark>una newsletter de Substack</mark>.</h1>
			<p>El índice de todo lo que ha publicado y sus posts en markdown, en un zip.</p>
		</article>
	{/if}

	{#if error}<p class="mt-6 text-sm text-error">{error}</p>{/if}

	{#if phase === 'form' || phase === 'starting'}
		<form onsubmit={handle} class="mt-8 space-y-3">
			<label class="block">
				<span class="eyebrow">{t.urlLabel}</span>
				<input
					type="text"
					bind:value={url}
					placeholder={t.urlPlaceholder}
					inputmode="url"
					autocomplete="url"
					required
					disabled={phase === 'starting'}
					class="input input-bordered input-lg mt-1 w-full"
				/>
			</label>
			<label class="block">
				<span class="eyebrow">{t.emailLabel}</span>
				<input
					type="email"
					bind:value={email}
					placeholder={t.emailPlaceholder}
					inputmode="email"
					autocomplete="email"
					required
					disabled={phase === 'starting'}
					class="input input-bordered input-lg mt-1 w-full"
				/>
			</label>
			<button
				type="submit"
				disabled={phase === 'starting' || !ready}
				class="btn btn-primary btn-lg"
			>
				{#if phase === 'starting'}
					<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
				{/if}
				<span>{phase === 'starting' ? t.starting : t.button}</span>
			</button>
		</form>

		<div class="mt-6">
			<p class="muted">{t.priceNote}</p>
		</div>
	{:else if phase === 'atCap'}
		<!-- Stopped at `BODY_CAP` with posts left. Both answers are reasonable and
		     only one of them is the visitor's, so it asks instead of deciding. -->
		<article class="box border-ink mt-8">
			<p class="box-title">{fill(t.capTitle, { done: fetched })}</p>
			<p class="box-text mt-2">
				{fill(t.capBody, {
					range: capRange,
					total: asked,
					rest: missing,
					minutes: minutesPhrase(missing)
				})}
			</p>
			<div class="mt-5 flex flex-wrap gap-3">
				<button type="button" class="btn btn-primary btn-lg" onclick={() => finish('cap')}>
					{fill(t.capDownload, { done: fetched })}
				</button>
				<button type="button" class="btn btn-lg" onclick={continueAll}>
					{fill(t.capContinue, { rest: missing })}
				</button>
			</div>
			<p class="muted mt-4">{t.capWhy}</p>
		</article>
	{:else if phase === 'reading' || phase === 'paused' || phase === 'zipping'}
		<article class="box mt-8">
			<p class="eyebrow">{fill(t.readingTitle, { name: pubName })}</p>
			<p class="mt-2 flex flex-wrap items-baseline gap-x-3">
				<span class="box-title">{fill(t.progress, { done: fetched, total: goal })}</span>
				<span class="box-text">
					{#if phase === 'zipping'}
						{t.zipping}
					{:else if stopAsked}
						{t.stopping}
					{:else if minutesLeft <= 1}
						{t.etaSoon}
					{:else}
						{fill(t.eta, { minutes: minutesLeft })}
					{/if}
				</span>
			</p>

			<!-- `.meter` styles its child directly (`.meter > *`), so the fill needs no
			     class of its own — only a width. -->
			<div
				class="meter mt-4"
				role="progressbar"
				aria-valuenow={percent}
				aria-valuemin="0"
				aria-valuemax="100"
			>
				<div style="width: {percent}%"></div>
			</div>

			<div class="mt-4 space-y-2">
				{#if phase === 'paused' && countdown > 0}
					<p class="box-text">
						{notice
							? fill(t.retryNote, { seconds: countdown })
							: fill(t.pausedNote, { seconds: countdown })}
					</p>
				{/if}
				<p class="muted">{@html bold(t.progressNote)}</p>
			</div>

			{#if phase !== 'zipping' && !stopAsked}
				<div class="mt-5 border-t border-line pt-4">
					<button type="button" class="link-quiet" onclick={() => (stopAsked = true)}>
						{t.stop}
					</button>
				</div>
			{/if}
		</article>
	{:else if done}
		<div class="box border-ink mt-8">
			<p class="box-title">{t.doneTitle}</p>
			<p class="box-text mt-2">
				{done.bodies === done.asked
					? fill(t.doneBody, { file: done.file, posts: done.posts, bodies: done.bodies })
					: fill(t.donePartial, {
							file: done.file,
							bodies: done.bodies,
							asked: done.asked,
							posts: done.posts
						})}
			</p>
			<p class="muted mt-2">
				{#if mail === 'sending'}{t.mailSending}
				{:else if mail === 'sent'}{t.mailSent}
				{:else if mail === 'too_big'}{t.mailTooBig}
				{:else if mail === 'failed'}{t.mailFailed}
				{:else}{t.doneNoAsk}{/if}
			</p>

			{#if done.notes.length}
				<div class="mt-5 border-t border-line pt-4">
					<p class="eyebrow">{t.doneNotes}</p>
					<ul class="mt-2 space-y-2">
						{#each done.notes as code (code)}
							<li class="muted">{NOTE_COPY[code]({ missing: done.asked - done.bodies })}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<!-- Lo siguiente que hacer con lo que acaba de bajar. Cervantes lee una
		     newsletter entera para aprender a escribir como ella, y lo que come es
		     exactamente esto: posts en markdown. -->
		<article class="box mt-6">
			<p class="eyebrow">{t.cervantesTitle}</p>
			<p class="box-text mt-2">{t.cervantesBody}</p>
			<p class="mt-4"><a class="link" href="/recursos/cervantes">{t.cervantesLink} →</a></p>
		</article>

		<div class="mt-6 space-y-2">
			<button type="button" class="link-quiet" onclick={restart}>← {t.restart}</button>
			<p class="muted">{t.ownership}</p>
		</div>
	{/if}
</section>
