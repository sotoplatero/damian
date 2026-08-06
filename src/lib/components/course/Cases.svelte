<script lang="ts">
	/**
	 * Diagnosis on real situations.
	 *
	 * This is the course's "quiz", but with a specific shape: it presents a
	 * situation and asks for a READING, not a fact. A quiz that checks whether you
	 * remember what a post said teaches nothing — not least because whoever gets
	 * here hasn't read the post. That's what the course is for.
	 *
	 * Cases appear one at a time. Render all three at once and the learner reads
	 * all three reveals before deciding anything, which turns the module into an
	 * article with buttons.
	 */
	import type { CaseStudy, CasesAnswer, CasesInteraction } from '$lib/courses/types';

	let {
		interaction,
		answer,
		t,
		onchange
	}: {
		interaction: CasesInteraction;
		answer: CasesAnswer | undefined;
		t: Record<string, string>;
		onchange: (answer: CasesAnswer) => void;
	} = $props();

	const picks = $derived(new Map((answer?.picks ?? []).map((pick) => [pick.caseId, pick.pickedId])));

	/** How far to show: the first unanswered one, and not one more. */
	const visible = $derived.by(() => {
		const index = interaction.items.findIndex((item) => !picks.has(item.id));
		return index === -1 ? interaction.items.length : index + 1;
	});

	function choose(study: CaseStudy, optionId: string) {
		// Once answered it can't be changed: revising after reading the reveal turns
		// the exercise into a formality.
		if (picks.has(study.id)) return;
		onchange({
			kind: 'cases',
			picks: [...(answer?.picks ?? []), { caseId: study.id, pickedId: optionId }]
		});
	}
</script>

<div class="space-y-6">
	{#each interaction.items.slice(0, visible) as study, index (study.id)}
		{@const picked = picks.get(study.id)}
		{@const agrees = picked === study.answerId}

		<article class="box">
			<p class="eyebrow">{index + 1}/{interaction.items.length}</p>
			<p class="body-text mt-2">{study.situation}</p>

			<p class="body-text mt-5 font-bold">{study.question}</p>

			<div class="mt-3 space-y-2">
				{#each study.options as option (option.id)}
					{@const isPick = picked === option.id}
					{@const isTaught = Boolean(picked) && option.id === study.answerId}
					<button
						type="button"
						disabled={Boolean(picked)}
						onclick={() => choose(study, option.id)}
						class="w-full rounded-lg border p-4 text-left transition-colors
							{isTaught ? 'border-ink bg-line/40' : isPick ? 'border-ink/40' : 'border-line'}
							{picked ? 'cursor-default' : 'hover:border-ink/60'}"
					>
						<span class="body-text">{option.label}</span>
						{#if isPick}
							<span class="muted mt-1 block">{t.caseYours}</span>
						{/if}
					</button>
				{/each}
			</div>

			{#if picked}
				<div class="mt-5 border-t border-line pt-5">
					<!--
						"Has dado con ello" / "No va por ahí", never "correcto" and "mal".
						The moment this renders a tick, the course stops explaining a
						mechanism and starts issuing verdicts on someone's money — which is
						the line it doesn't cross.
					-->
					<p class="eyebrow">{agrees ? t.caseAgree : t.caseDiffer}</p>
					<p class="body-text mt-2">{study.reveal}</p>
				</div>
			{/if}
		</article>
	{/each}
</div>
