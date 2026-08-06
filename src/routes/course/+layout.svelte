<script lang="ts">
	/**
	 * Same shell as the tools: the content centres in the space left under the
	 * header while it fits, and stops centring when it doesn't.
	 *
	 * It matters more here than in a tool, because a course goes from a
	 * three-line cover to a long module without a page load. Centring with
	 * `my-auto` on the child solves it by itself: automatic margins take the free
	 * space when there is some and are zero when there isn't. The layout doesn't
	 * have to know which module we're on, which is something it can't know.
	 */
	let { children } = $props();
</script>

<div class="tool-shell">
	<div class="tool-stage">
		{@render children?.()}
	</div>
</div>
