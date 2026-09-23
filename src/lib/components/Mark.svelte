<script lang="ts">
	/**
	 * The mark: «el hueco», a square with a piece missing — the headline as a shape,
	 * «la herramienta que te falta». Chosen by Damian on 23 September 2026 over a
	 * hand-cut key and an «ob» monogram.
	 *
	 * It replaced the four-pointed ✦, which had become the sparkle on every AI
	 * button and told nobody it was his.
	 *
	 * `currentColor`, so the ground decides: ink on the paper, mango on ink. Mango
	 * on the paper is 1.44:1, which a logo is allowed and a letter is not — but the
	 * header still paints it in ink and saves the mango for the hover.
	 *
	 * The same path lives in `static/favicon.svg`; change one, change both.
	 */
	let { class: className = '' }: { class?: string } = $props();
</script>

<svg class={className} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
	<path d="M0 0H100V58H58V100H0Z" />
</svg>
