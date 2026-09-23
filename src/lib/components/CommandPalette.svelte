<script lang="ts">
	/**
	 * The hidden launcher. Cmd/Ctrl+K (or the ⌘K key in the footer) opens it;
	 * type to filter, arrows to move, Enter to go, Esc to close. No dependency:
	 * the whole thing is this file.
	 *
	 * It also answers a few words that aren't destinations — the same wink as
	 * the console message: whoever finds this is the kind of person the first
	 * email is for.
	 */
	import { goto } from '$app/navigation';
	import { tools } from '$lib/tools/list';
	import { resources, resourceHref } from '$lib/resources/list';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const items = [
		{ label: 'Inicio', href: '/' },
		...tools.map((tool) => ({ label: tool.name, href: tool.href })),
		...resources.map((resource) => ({ label: resource.name, href: resourceHref(resource) })),
		{ label: 'Colofón', href: '/colofon' }
	];

	/* Words that answer back instead of navigating. */
	const EGGS: Record<string, string> = {
		hola: 'Hola. Los correos se responden, ¿eh?',
		gracias: 'De nada. Ahora responde al primer correo y dime qué automatizarías.',
		brillante: 'El objeto brillante eres tú buscando atajos. Suscríbete y respóndeme.'
	};

	let query = $state('');
	let active = $state(0);

	const filtered = $derived(
		items.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
	);
	const egg = $derived(EGGS[query.trim().toLowerCase()] ?? '');

	/* The input mounts fresh on every open, so focusing on mount is enough. */
	function autofocus(node: HTMLInputElement) {
		node.focus();
	}

	/* Closing also resets, so the palette always opens blank — including when
	   the footer key opens it from outside through the bound prop. */
	function close() {
		open = false;
		query = '';
		active = 0;
	}

	/*
	 * Whether the visitor is typing into something.
	 *
	 * `?` opening the palette is only a gem while it does NOT fire in the middle
	 * of an address or of somebody telling us which tool they are missing — the
	 * gap's field is a sentence in Spanish and «¿» is the first character of half
	 * the questions in it.
	 */
	function isTyping(target: EventTarget | null): boolean {
		const el = target as HTMLElement | null;
		if (!el) return false;
		const tag = el.tagName;
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			if (open) close();
			else open = true;
			return;
		}
		/*
		 * `?` is the convention every app with shortcuts uses, and here it is also
		 * the answer to the one discoverability hole ⌘K has: the hint in the footer
		 * is the only thing that ever mentions it. Both `?` and `¿` open, because
		 * this keyboard is Spanish.
		 */
		if (!open && (event.key === '?' || event.key === '¿') && !isTyping(event.target)) {
			event.preventDefault();
			open = true;
			return;
		}
		if (open && event.key === 'Escape') close();
	}

	function onFieldKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			active = (active + 1) % Math.max(filtered.length, 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			active = (active - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			const item = filtered[active];
			if (item) go(item.href);
		}
	}

	function go(href: string) {
		close();
		goto(href);
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if open}
	<button type="button" class="palette-backdrop" aria-label="Cerrar" onclick={close}></button>
	<div class="palette box" role="dialog" aria-modal="true" aria-label="Ir a">
		<input
			use:autofocus
			bind:value={query}
			oninput={() => (active = 0)}
			onkeydown={onFieldKeydown}
			class="input input-bordered w-full"
			placeholder="¿A dónde vas?"
			autocomplete="off"
			spellcheck="false"
		/>
		{#if filtered.length}
			<ul class="mt-3">
				{#each filtered as item, index (item.href)}
					<li>
						<button
							type="button"
							class="palette-item"
							class:palette-active={index === active}
							onclick={() => go(item.href)}
							onmouseenter={() => (active = index)}
						>
							<span class="tool-index">{String(index + 1).padStart(2, '0')}</span>
							<span>{item.label}</span>
						</button>
					</li>
				{/each}
			</ul>
		{:else if !egg}
			<p class="muted mt-3">Nada con ese nombre. Todavía.</p>
		{/if}
		{#if egg}
			<p class="muted mt-3">{egg}</p>
		{/if}
		<!--
			The footer of the launcher: the shortcuts, written down.
			A hidden gem people cannot find twice is a gem nobody has. ⌘K was hinted
			in exactly one place (the key in the site footer) and `?` was hinted
			nowhere, so this is the one screen where both are stated — inside the
			thing you had to find to get here, which keeps the reward and drops the
			guessing.
		-->
		<p class="palette-keys">
			<span><kbd>⌘K</kbd> abre esto</span>
			<span><kbd>?</kbd> también</span>
			<span><kbd>esc</kbd> cierra</span>
		</p>
	</div>
{/if}

<style>
	.palette-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		border: 0;
		background: color-mix(in srgb, var(--color-ink) 24%, transparent);
		backdrop-filter: blur(2px);
	}
	.palette {
		position: fixed;
		top: clamp(4rem, 18vh, 10rem);
		left: 50%;
		z-index: 50;
		width: min(92vw, 30rem);
		transform: translateX(-50%);
		background: white;
	}
	.palette ul {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.palette-item {
		display: flex;
		width: 100%;
		align-items: baseline;
		gap: 0.75rem;
		padding: 0.5rem 0.6rem;
		border: 0;
		border-radius: 0.4rem;
		background: transparent;
		font: inherit;
		text-align: left;
		color: var(--color-soft);
		cursor: pointer;
	}
	.palette-active {
		background: color-mix(in srgb, var(--color-ink) 5%, transparent);
		color: var(--color-ink);
	}
	.palette-keys {
		display: flex;
		flex-wrap: wrap;
		gap: 0.9rem;
		margin-top: 0.9rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-line);
		font-size: 0.8125rem;
		color: var(--color-muted);
	}
	.palette-keys kbd {
		border: 1px solid var(--color-line);
		border-radius: 0.3rem;
		padding: 0.05rem 0.3rem;
		font: inherit;
		color: var(--color-ink);
	}
</style>
