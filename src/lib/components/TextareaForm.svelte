<script lang="ts">
	/**
	 * Campo de varias líneas con el botón debajo. El hermano de `InlineForm`.
	 *
	 * Existe porque `InlineForm` es campo y botón EN LA MISMA LÍNEA, y eso solo
	 * funciona con una URL o un correo. Cuando lo que se pide es una idea escrita,
	 * hace falta sitio para escribirla y el botón no cabe al lado. No se le añadió
	 * un `multiline` a `InlineForm` porque lo usan cuatro formularios y dejaría su
	 * nombre y su comentario mintiendo.
	 *
	 * En un textarea el Enter tiene que hacer salto de línea, así que se envía con
	 * Ctrl+Enter (o Cmd+Enter en Mac) y con el botón. Se avisa debajo, porque un
	 * atajo que no se ve no existe.
	 */
	let {
		value = $bindable(''),
		placeholder = '',
		/** Texto del botón en reposo. */
		label,
		/** Texto del botón mientras trabaja. */
		busyLabel = label,
		busy = false,
		/** Mínimo de caracteres para poder enviar. El mismo que valida el servidor. */
		minLength = 0,
		maxLength,
		rows = 5,
		/** La nota de debajo: el atajo, o lo que falte por escribir. */
		hint = '',
		onsubmit
	}: {
		value?: string;
		placeholder?: string;
		label: string;
		busyLabel?: string;
		busy?: boolean;
		minLength?: number;
		maxLength?: number;
		rows?: number;
		hint?: string;
		onsubmit: () => void;
	} = $props();

	const ready = $derived(value.trim().length >= minLength);

	function send() {
		if (busy || !ready) return;
		onsubmit();
	}

	function handle(event: SubmitEvent) {
		event.preventDefault();
		send();
	}

	function keydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			send();
		}
	}
</script>

<form onsubmit={handle}>
	<textarea
		bind:value
		{placeholder}
		{rows}
		maxlength={maxLength}
		disabled={busy}
		onkeydown={keydown}
		class="textarea textarea-bordered textarea-lg w-full"
	></textarea>
	<div class="mt-3 flex flex-wrap items-center gap-3">
		<button type="submit" disabled={busy || !ready} class="btn btn-primary btn-lg shrink-0">
			{#if busy}<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>{/if}
			<span>{busy ? busyLabel : label}</span>
		</button>
		{#if hint}<p class="muted">{hint}</p>{/if}
	</div>
</form>
