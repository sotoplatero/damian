<script lang="ts">
	/**
	 * The shell every tool page lives in: it centres the content in whatever space
	 * is left under the header, while it fits.
	 *
	 * The centring uses `my-auto` on the child (`.tool-stage`) and NOT
	 * `justify-center` on the parent, and that difference is what makes it work
	 * without tricks: auto margins share out the free space when the content is
	 * short (a tool's opening screen) and collapse to zero when it is long (with
	 * results). So the layout never has to know which state the page is in —
	 * something it cannot know.
	 *
	 * It lives here, and not inline in a `+layout.svelte`, because TWO routes need
	 * it: `/tool/*` and `/postcard`. `/postcard` sits outside `/tool/` on purpose
	 * (the segment after it is a publication, not a tool name) and therefore never
	 * inherited `src/routes/tool/+layout.svelte`. For a while that was the whole
	 * reason its front door looked foreign next to the other tools: right classes,
	 * wrong shell. Duplicating these two divs would have let them drift.
	 *
	 * No `max-width` here on purpose — the width comes from `.site-column` in the
	 * root layout, so the postcard slider can still run edge to edge inside it.
	 */
	let { children } = $props();
</script>

<div class="tool-shell">
	<div class="tool-stage">
		{@render children?.()}
	</div>
</div>
