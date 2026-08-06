<script lang="ts">
	/**
	 * The runner. It's the only generic piece: it knows nothing about money or
	 * about Cris, only about modules, answers and when you're allowed to move on.
	 *
	 * A new course is a data file in `src/lib/courses/<creator>/` plus one line in
	 * the registry. This component isn't touched. If it has to be touched to add a
	 * course, that means there's a new interaction type — add it to the union in
	 * `types.ts` and the compiler will point at the places that need rendering.
	 *
	 * ATTRIBUTION LIVES IN EXACTLY ONE PLACE: the credit snippet below. The course
	 * body never names the creator. See the note at the top of `types.ts`.
	 */
	import type { Course, ModuleAnswer, Reference } from '$lib/courses/types';
	import { formatEuros, isComplete, pendingReason, progress, stepBack } from '$lib/courses/engine';
	import InlineForm from '$lib/components/InlineForm.svelte';
	import Cases from './Cases.svelte';
	import Estimate from './Estimate.svelte';
	import Budget from './Budget.svelte';

	let { course, t }: { course: Course; t: Record<string, string> } = $props();

	/** -1 is the cover. It exists so the disclaimer is read before anything else. */
	let index = $state(-1);
	let answers = $state<Record<string, ModuleAnswer>>({});

	let email = $state('');
	let sending = $state(false);
	let sent = $state(false);
	let error = $state('');

	const active = $derived(index >= 0 ? course.modules[index] : null);
	const done = $derived(active ? isComplete(active, answers[active.id]) : false);

	/**
	 * The sentence next to a disabled "Siguiente".
	 *
	 * A button that won't light up and won't say why reads as broken, and the
	 * person is right to think so. The reason comes from the engine as a key plus
	 * numbers; the wording lives in `course.md` like all the other copy.
	 */
	const pending = $derived(active ? pendingReason(active, answers[active.id]) : null);
	const pendingText = $derived.by(() => {
		if (!pending) return '';
		const template = t[pending.key] ?? '';
		return template
			.replace('{amount}', pending.amount === undefined ? '' : formatEuros(pending.amount))
			.replace('{n}', pending.count === undefined ? '' : String(pending.count));
	});
	const percent = $derived(progress(course.modules, answers));
	const last = $derived(index === course.modules.length - 1);
	/** The end: past the last module. */
	const finished = $derived(index >= course.modules.length);

	/**
	 * Pull the answer already narrowed to the type each component expects.
	 *
	 * It's a function rather than a ternary in the template because TypeScript
	 * won't narrow `answers[id]` across repeated index access: checking `.kind` in
	 * one expression says nothing about the next read of the map.
	 */
	function answerOf<K extends ModuleAnswer['kind']>(
		id: string,
		kind: K
	): Extract<ModuleAnswer, { kind: K }> | undefined {
		const answer = answers[id];
		return answer?.kind === kind ? (answer as Extract<ModuleAnswer, { kind: K }>) : undefined;
	}

	function record(id: string, answer: ModuleAnswer) {
		answers = { ...answers, [id]: answer };
	}

	/** The cover has nothing to complete, so it gets its own step. */
	function start() {
		index = 0;
		scrollTop();
	}

	function next() {
		if (!done) return;
		index += 1;
		scrollTop();
	}

	/**
	 * Back undoes ONE step, and a step isn't always a module.
	 *
	 * Module 1 has inner steps (guess → line items → reveal). Before this, pressing
	 * back while halfway through it threw you out of the module and onto the cover,
	 * losing the guess — which is not what anyone means by "back". So the engine is
	 * asked first whether the current module can undo something of its own, and
	 * only when it can't do we move to the previous module.
	 */
	function back() {
		if (active) {
			const undone = stepBack(active, answers[active.id]);
			if (undone !== false) {
				if (undone === undefined) {
					const { [active.id]: _dropped, ...rest } = answers;
					answers = rest;
				} else {
					answers = { ...answers, [active.id]: undone };
				}
				scrollTop();
				return;
			}
		}
		if (index <= -1) return;
		index -= 1;
		scrollTop();
	}

	function scrollTop() {
		if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function errorFor(code: unknown): string {
		if (code === 'invalid_email') return t.errorInvalidEmail;
		if (code === 'disposable') return t.errorDisposable;
		if (code === 'rate_limit') return t.errorRateLimit;
		if (code === 'send_failed') return t.errorSendFailed;
		return t.errorGeneric;
	}

	async function send() {
		sending = true;
		error = '';
		try {
			const response = await fetch(`/course/${course.slug}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, answers })
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(errorFor(data?.error));
			sent = true;
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			sending = false;
		}
	}
</script>

<!-- The one and only mention of who this is built on. -->
{#snippet credit()}
	<p class="muted">
		{t.creditPrefix}
		<a href={course.creator.url} target="_blank" rel="noopener noreferrer" class="link-quiet">
			{course.creator.publication}
		</a>, de {course.creator.name}.
	</p>
{/snippet}

{#snippet references(list: Reference[])}
	<div class="mt-6 border-t border-line pt-5">
		<p class="eyebrow">{t.refsTitle}</p>
		<ul class="mt-3 space-y-2">
			{#each list as reference (reference.url)}
				<li>
					<a href={reference.url} target="_blank" rel="noopener noreferrer" class="link-quiet">
						{reference.title}
					</a>
					<span class="chip ml-2 bg-line text-muted">
						{reference.audience === 'paid' ? t.refPaid : t.refFree}
					</span>
				</li>
			{/each}
		</ul>
	</div>
{/snippet}

<!-- ──────────────────────────────── Cover ──────────────────────────────── -->
{#if index === -1}
	<section class="screen-center">
		<h1 class="section-title">{course.title}</h1>
		<p class="section-intro">{course.tagline}</p>

		<div class="box mt-8">
			<p class="eyebrow">{t.disclaimerLabel}</p>
			<p class="body-text mt-2">{course.disclaimer}</p>
		</div>

		<button type="button" onclick={start} class="btn btn-primary btn-lg mt-8 w-full sm:w-auto">
			{t.startButton}
		</button>

		<div class="mt-6">{@render credit()}</div>
	</section>
{/if}

<!-- ──────────────────────────────── Module ─────────────────────────────── -->
{#if active}
	<section>
		<div class="flex items-baseline justify-between gap-3">
			<p class="eyebrow">
				{t.moduleCounter
					.replace('{n}', String(index + 1))
					.replace('{total}', String(course.modules.length))}
			</p>
			<p class="muted">{course.title}</p>
		</div>
		<div class="meter mt-2"><span style="width: {percent}%"></span></div>

		<h1 class="section-title mt-8">{active.title}</h1>
		<p class="section-intro">{active.intro}</p>

		<div class="mt-8">
			{#if active.interaction.kind === 'cases'}
				<Cases
					interaction={active.interaction}
					answer={answerOf(active.id, 'cases')}
					{t}
					onchange={(answer) => record(active.id, answer)}
				/>
			{:else if active.interaction.kind === 'estimate'}
				<Estimate
					interaction={active.interaction}
					answer={answerOf(active.id, 'estimate')}
					{t}
					onchange={(answer) => record(active.id, answer)}
				/>
			{:else}
				<Budget
					interaction={active.interaction}
					answer={answerOf(active.id, 'budget')}
					{t}
					onchange={(answer) => record(active.id, answer)}
				/>
			{/if}
		</div>

		<!-- References appear when the module is finished and not before: showing
		     them on arrival is an invitation to read the answer instead of thinking
		     about it. -->
		{#if done}
			{@render references(active.references)}
		{/if}

		<div class="mt-8 flex items-center justify-between gap-3">
			<button type="button" onclick={back} class="link-quiet">{t.back}</button>
			<div class="flex min-w-0 items-center justify-end gap-3">
				{#if pendingText}
					<p class="muted text-right">{pendingText}</p>
				{/if}
				<button
					type="button"
					onclick={next}
					disabled={!done}
					class="btn btn-primary btn-lg shrink-0"
				>
					{last ? t.finishStep : t.next}
				</button>
			</div>
		</div>
	</section>
{/if}

<!-- ───────────────────────────────── End ───────────────────────────────── -->
{#if finished}
	<section>
		<div class="meter"><span style="width: 100%"></span></div>

		<h1 class="section-title mt-8">{course.handoff.title}</h1>
		<p class="section-intro">{course.handoff.text}</p>

		<a
			href={course.handoff.reference.url}
			target="_blank"
			rel="noopener noreferrer"
			class="box-link mt-6 block"
		>
			<span class="box-title">{course.handoff.reference.title}</span>
		</a>

		<!--
			The email wall. It does NOT send a score: it sends what the person did and
			the links. Grading somebody's private finances helps nobody, and it would
			turn this into a verdict — exactly what the course avoids.
		-->
		<div class="box mt-8">
			{#if sent}
				<h2 class="box-title">{t.sentTitle}</h2>
				<p class="body-text mt-2">{t.sentBody}</p>
			{:else}
				<h2 class="box-title">{t.gateTitle}</h2>
				<p class="body-text mt-2">{t.gateBody}</p>
				<p class="muted mt-3">{t.gateNote}</p>
				<div class="mt-4">
					<InlineForm
						type="email"
						bind:value={email}
						placeholder={t.gatePlaceholder}
						label={t.gateButton}
						busyLabel={t.gateSending}
						busy={sending}
						inputmode="email"
						autocomplete="email"
						onsubmit={send}
					/>
				</div>
			{/if}

			{#if error}
				<p class="mt-4 text-sm text-error">{error}</p>
			{/if}
		</div>

		<div class="mt-8">
			<button type="button" onclick={back} class="link-quiet">{t.back}</button>
		</div>

		<div class="mt-8 border-t border-line pt-6">{@render credit()}</div>
	</section>
{/if}
