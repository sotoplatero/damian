<script lang="ts">
	/**
	 * Guess first, count second.
	 *
	 * THE ORDER IS THE EXERCISE. The guess is asked before a single field is shown,
	 * because once you can see the table you can no longer estimate: you add up.
	 * And what the module teaches isn't the total, it's the gap between what you
	 * believed and your own arithmetic.
	 *
	 * Which is why the final figure couldn't be rigged even if we wanted to: both
	 * sides of the comparison are typed by the learner and all we do is multiply
	 * by twelve.
	 */
	import type { EstimateAnswer, EstimateInteraction } from '$lib/courses/types';
	import { annualise, estimateVerdict, formatEuros } from '$lib/courses/engine';

	let {
		interaction,
		answer,
		t,
		onchange
	}: {
		interaction: EstimateInteraction;
		answer: EstimateAnswer | undefined;
		t: Record<string, string>;
		onchange: (answer: EstimateAnswer) => void;
	} = $props();

	type Row = { label: string; amount: string };

	let guess = $state('');
	let rows = $state<Row[]>([
		{ label: '', amount: '' },
		{ label: '', amount: '' },
		{ label: '', amount: '' }
	]);

	const phase = $derived(!answer ? 'guess' : answer.rows.length ? 'done' : 'rows');

	/** Comma or dot, both. Nobody types "12.50" on a Spanish phone. */
	function toNumber(value: string): number {
		const parsed = Number(value.replace(',', '.').replace(/[^\d.-]/g, ''));
		return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
	}

	const filled = $derived(rows.filter((row) => toNumber(row.amount) > 0));
	const runningTotal = $derived(filled.reduce((total, row) => total + toNumber(row.amount), 0));

	function submitGuess() {
		// Zero is a legitimate answer ("none of this applies to me"), so it's
		// accepted; what isn't accepted is moving on without having answered.
		if (!guess.trim()) return;
		onchange({ kind: 'estimate', guess: toNumber(guess), rows: [] });
	}

	function addRow() {
		rows = [...rows, { label: '', amount: '' }];
	}

	function removeRow(index: number) {
		rows = rows.filter((_, i) => i !== index);
	}

	function compute() {
		if (!answer || !filled.length) return;
		onchange({
			kind: 'estimate',
			guess: answer.guess,
			rows: filled.map((row, index) => ({
				label: row.label.trim() || interaction.suggestions[index] || t.estUnnamed,
				monthly: toNumber(row.amount)
			}))
		});
	}

	const totals = $derived(answer && answer.rows.length ? annualise(answer) : null);
	const verdict = $derived(answer && answer.rows.length ? estimateVerdict(answer) : null);
	const revealText = $derived(
		verdict === 'under'
			? interaction.revealUnder
			: verdict === 'over'
				? interaction.revealOver
				: interaction.revealClose
	);

	/**
	 * Both bars scale to the larger of the two, so they can be compared.
	 *
	 * They compare MONTHLY figures, because that's the unit the guess was made in.
	 * The annual number gets its own line underneath: it isn't part of the
	 * comparison, it's the payoff.
	 */
	const scale = $derived(Math.max(answer?.guess ?? 0, totals?.monthly ?? 0, 1));
</script>

{#if phase === 'guess'}
	<div class="box">
		<p class="body-text font-bold">{interaction.guessLabel}</p>
		<p class="muted mt-2">{interaction.guessHint}</p>
		<form
			class="mt-4 flex gap-2"
			onsubmit={(event) => {
				event.preventDefault();
				submitGuess();
			}}
		>
			<input
				type="text"
				inputmode="decimal"
				bind:value={guess}
				placeholder={t.estGuessPlaceholder}
				class="input input-bordered input-lg min-w-0 flex-1"
			/>
			<button type="submit" disabled={!guess.trim()} class="btn btn-primary btn-lg shrink-0">
				{t.estGuessButton}
			</button>
		</form>
	</div>
{:else if phase === 'rows'}
	<!--
		The guess stays on screen while the rows are filled in: it's half the
		comparison, and forgetting it while you type costs you the lesson. It
		disappears from here on the reveal, where it's already shown side by side
		with the real figure — otherwise it appeared twice in a row.
	-->
	<div class="box">
		<p class="eyebrow">{t.estGuessLabel}</p>
		<p class="body-text mt-1 font-bold">{formatEuros(answer?.guess ?? 0)} {t.estPerMonth}</p>
	</div>
{/if}

{#if phase === 'rows'}
	<div class="box mt-4">
		<p class="body-text font-bold">{interaction.rowsLabel}</p>
		<p class="muted mt-2">{interaction.rowsHint}</p>

		<div class="mt-4 space-y-2">
			{#each rows as row, index (index)}
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={row.label}
						placeholder={interaction.suggestions[index] ?? t.estConceptPlaceholder}
						class="input input-bordered min-w-0 flex-1"
					/>
					<input
						type="text"
						inputmode="decimal"
						bind:value={row.amount}
						placeholder={t.estAmountPlaceholder}
						class="input input-bordered w-24 shrink-0"
					/>
					<button
						type="button"
						onclick={() => removeRow(index)}
						disabled={rows.length <= 1}
						aria-label={t.estRemove}
						class="btn btn-ghost btn-sm shrink-0 self-center">×</button
					>
				</div>
			{/each}
		</div>

		<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
			<button type="button" onclick={addRow} class="link-quiet">{t.estAddRow}</button>
			{#if runningTotal > 0}
				<p class="muted">{formatEuros(runningTotal)} {t.estPerMonth}</p>
			{/if}
		</div>

		<button
			type="button"
			onclick={compute}
			disabled={!filled.length}
			class="btn btn-primary btn-lg mt-4 w-full"
		>
			{t.estCompute}
		</button>
	</div>
{/if}

{#if phase === 'done' && totals && answer}
	<div class="box">
		<div class="space-y-4">
			<div>
				<div class="flex items-baseline justify-between gap-3">
					<p class="muted">{t.estGuessLabel}</p>
					<p class="body-text font-bold">{formatEuros(answer.guess)}</p>
				</div>
				<div class="meter mt-1"><span style="width: {(answer.guess / scale) * 100}%"></span></div>
			</div>
			<div>
				<div class="flex items-baseline justify-between gap-3">
					<p class="muted">{t.estRealLabel}</p>
					<p class="body-text font-bold">{formatEuros(totals.monthly)}</p>
				</div>
				<div class="meter mt-1"><span style="width: {(totals.monthly / scale) * 100}%"></span></div>
			</div>
		</div>

		<!-- The payoff. It sits apart from the two bars because it isn't part of the
		     comparison: it's the same money counted in the unit nobody uses. -->
		<div class="mt-5 border-t border-line pt-5">
			<p class="eyebrow">{t.estAnnualLabel}</p>
			<p class="section-title mt-1">{formatEuros(totals.annual)}</p>
		</div>

		<p class="body-text mt-5">{revealText}</p>

		<div class="mt-5 border-t border-line pt-4">
			<p class="eyebrow">{t.estBreakdown}</p>
			<ul class="mt-2 space-y-1">
				{#each answer.rows as row (row.label)}
					<li class="body-text flex items-baseline justify-between gap-3">
						<span>{row.label}</span>
						<span class="shrink-0 font-bold">{formatEuros(row.monthly * 12)}</span>
					</li>
				{/each}
			</ul>
			<p class="muted mt-3">{t.estBreakdownNote}</p>
		</div>
	</div>
{/if}
