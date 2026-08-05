<script lang="ts">
	/**
	 * A written result on a tool page: a `.box` with the piece's name, an
	 * optional "free" badge, what it's best for, and a copy button that owns its
	 * own "copied" timeout. The body arrives as a snippet because each tool
	 * shapes it differently (plain text, keyed blocks...).
	 */
	import type { Snippet } from 'svelte';

	let {
		title,
		badge = '',
		note = '',
		copyText = '',
		copyLabel = '',
		copiedLabel = '',
		children
	}: {
		title: string;
		/** The "free" badge text; empty hides it. */
		badge?: string;
		/** One line under the title: what this piece is best for. */
		note?: string;
		/** Plain text put on the clipboard; empty hides the button. */
		copyText?: string;
		copyLabel?: string;
		copiedLabel?: string;
		children: Snippet;
	} = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		await navigator.clipboard.writeText(copyText);
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 2000);
	}
</script>

<article class="box">
	<header class="mb-4 flex items-start justify-between gap-3">
		<div>
			<h3 class="box-title">
				{title}
				{#if badge}<span class="badge badge-sm badge-neutral align-middle">{badge}</span>{/if}
			</h3>
			{#if note}<p class="muted">{note}</p>{/if}
		</div>
		{#if copyText}
			<button type="button" class="btn btn-ghost btn-xs shrink-0" onclick={copy}>
				{copied ? copiedLabel : copyLabel}
			</button>
		{/if}
	</header>
	{@render children()}
</article>
