<script lang="ts">
	/**
	 * `Income − Expenses − Savings = 0`.
	 *
	 * SAVINGS IS ASKED BEFORE EXPENSES, and that order is the entire module. Ask it
	 * last and the learner writes down whatever is left over, walking away having
	 * confirmed the exact belief this is meant to dismantle. Ask it first and the
	 * expenses no longer fit, so something has to move — and that is the first time
	 * they decide in the cold instead of finding out on the 28th.
	 *
	 * Nothing here can be rigged: it's a subtraction. The discomfort of balancing
	 * it isn't put there by a coefficient of ours, it's put there by their numbers.
	 */
	import { untrack } from 'svelte';
	import type { BudgetAnswer, BudgetInteraction } from '$lib/courses/types';
	import { budgetBalance, budgetCloses, formatEuros, savingsRate } from '$lib/courses/engine';

	let {
		interaction,
		answer,
		t,
		onchange
	}: {
		interaction: BudgetInteraction;
		answer: BudgetAnswer | undefined;
		t: Record<string, string>;
		onchange: (answer: BudgetAnswer) => void;
	} = $props();

	/**
	 * State starts from whatever was already answered.
	 *
	 * Needed because the runner unmounts the module when the step changes: without
	 * this, coming back from the next module shows a blank form even though the
	 * runner still counts the module as done, and it reads as having lost your
	 * work. The prop is read once at construction, which is exactly what we want —
	 * from then on what's typed wins.
	 *
	 * Only values above zero are restored. An empty answer is published upward as
	 * soon as this mounts, so without the filter an untouched field would come back
	 * with a "0" written in it.
	 */
	const seed = (value: number | undefined) => (value && value > 0 ? String(value) : '');

	let income = $state(seed(answer?.income));
	let savings = $state(seed(answer?.savings));
	let amounts = $state<Record<string, string>>(
		Object.fromEntries(
			interaction.categories.map((category, index) => [
				category.id,
				seed(answer?.categories[index]?.monthly)
			])
		)
	);

	function toNumber(value: string): number {
		const parsed = Number((value ?? '').replace(',', '.').replace(/[^\d.-]/g, ''));
		return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
	}

	/** The state published upward on every keystroke. */
	const current = $derived<BudgetAnswer>({
		kind: 'budget',
		income: toNumber(income),
		savings: toNumber(savings),
		categories: interaction.categories.map((category) => ({
			label: category.label,
			monthly: toNumber(amounts[category.id] ?? '')
		}))
	});

	const balance = $derived(budgetBalance(current));
	const closes = $derived(current.income > 0 && budgetCloses(current));

	/** Savings only enters the stage once there's an income to count on. */
	const hasIncome = $derived(current.income > 0);
	const hasSavings = $derived(hasIncome && savings.trim() !== '');

	/**
	 * THE CALL GOES INSIDE `untrack` AND THAT IS NOT OPTIONAL. Without it the
	 * effect also depends on `onchange`, and `onchange` is an arrow function
	 * written inline in the runner: every render of it creates a new function. So
	 * publishing changes `answers` → the runner re-renders → new `onchange`
	 * identity → the effect fires again → and on until the tab locks up. It
	 * happened, and from the outside it looked like the browser had crashed.
	 *
	 * With `untrack` the only dependency is `current`, which only changes when
	 * something typed in here changes.
	 */
	$effect(() => {
		const value = current;
		untrack(() => onchange(value));
	});
</script>

<div class="space-y-4">
	<div class="box">
		<label class="body-text font-bold" for="budget-income">{interaction.incomeLabel}</label>
		<p class="muted mt-2">{interaction.incomeHint}</p>
		<input
			id="budget-income"
			type="text"
			inputmode="decimal"
			bind:value={income}
			placeholder={t.budAmountPlaceholder}
			class="input input-bordered input-lg mt-3 w-full"
		/>
	</div>

	{#if hasIncome}
		<div class="box">
			<label class="body-text font-bold" for="budget-savings">{interaction.savingsLabel}</label>
			<p class="muted mt-2">{interaction.savingsHint}</p>
			<input
				id="budget-savings"
				type="text"
				inputmode="decimal"
				bind:value={savings}
				placeholder={t.budAmountPlaceholder}
				class="input input-bordered input-lg mt-3 w-full"
			/>
			{#if current.savings > 0}
				<p class="muted mt-2">{t.budRate.replace('{rate}', savingsRate(current).toFixed(0))}</p>
			{/if}
		</div>
	{/if}

	{#if hasSavings}
		<div class="box">
			<p class="body-text font-bold">{interaction.categoriesLabel}</p>

			<div class="mt-4 space-y-3">
				{#each interaction.categories as category (category.id)}
					<div>
						<div class="flex items-center gap-2">
							<label class="body-text min-w-0 flex-1" for="cat-{category.id}">
								{category.label}
							</label>
							<input
								id="cat-{category.id}"
								type="text"
								inputmode="decimal"
								bind:value={amounts[category.id]}
								placeholder={t.budAmountPlaceholder}
								class="input input-bordered w-28 shrink-0"
							/>
						</div>
						<p class="muted mt-1">{category.hint}</p>
					</div>
				{/each}
			</div>
		</div>

		<!--
			The scoreboard. It's the only thing that pushes, and it pushes with
			nothing but a subtraction: while it isn't zero, there's a decision nobody
			has taken.
		-->
		<div class="box" class:bg-line={closes}>
			<div class="flex items-baseline justify-between gap-3">
				<p class="body-text font-bold">
					{#if closes}
						{interaction.balancedLabel}
					{:else if balance < 0}
						{interaction.overspentLabel}
					{:else}
						{interaction.leftoverLabel}
					{/if}
				</p>
				<p class="body-text font-bold">
					{closes ? formatEuros(0) : formatEuros(Math.abs(balance))}
				</p>
			</div>

			{#if !closes}
				<p class="muted mt-2">{balance < 0 ? t.budOverspentHint : t.budLeftoverHint}</p>
			{/if}
		</div>

		{#if closes}
			<div class="box">
				<p class="body-text">{interaction.reveal}</p>
			</div>
		{/if}
	{/if}
</div>
