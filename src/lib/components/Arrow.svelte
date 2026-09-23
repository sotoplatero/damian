<script lang="ts">
	/**
	 * The site's one arrow, drawn.
	 *
	 * Not the `→` glyph: the self-hosted face is subset to Latin and has no arrows,
	 * so the character fell back to whatever font the system had and arrived in a
	 * different weight on every machine. A path at the text's own stroke is the same
	 * everywhere, and it moves as one piece on hover.
	 */
	let { class: className = '' }: { class?: string } = $props();
</script>

<svg class="arrow {className}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
	<path d="M3 12h17M13 5l7 7-7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" />
</svg>
