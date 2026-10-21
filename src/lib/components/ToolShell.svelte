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
	 * It lives here, and not inline in a `+layout.svelte`, because several route
	 * trees need it — `/tool/*`, `/recursos/*`, `/skill` — and a page outside
	 * `/tool/` never inherits `src/routes/tool/+layout.svelte`: right classes,
	 * wrong shell, a front door that reads as a different site. Duplicating these
	 * two divs would have let them drift.
	 *
	 * No `max-width` here on purpose — the width comes from `.site-column` in the
	 * root layout.
	 */
	let { children } = $props();
</script>

<div class="tool-shell">
	<div class="tool-stage">
		{@render children?.()}
	</div>
</div>
