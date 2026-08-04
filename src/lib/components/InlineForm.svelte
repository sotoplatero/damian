<script lang="ts">
	/**
	 * Campo y botón en la misma línea. El formulario de todas las herramientas.
	 *
	 * Estaba copiado cuatro veces (la URL y el muro de correo de cada una de las
	 * dos herramientas), así que cualquier ajuste había que hacerlo cuatro veces.
	 *
	 * El campo lleva `min-w-0` y el botón `shrink-0`: el campo se encoge y el botón
	 * no, que es lo único que hace que quepan juntos en un móvil estrecho. Sin el
	 * `min-w-0` el campo se niega a bajar de su ancho por defecto y el botón se
	 * sale de la pantalla.
	 */
	let {
		value = $bindable(''),
		type = 'text',
		placeholder = '',
		/** Texto del botón en reposo. */
		label,
		/** Texto del botón mientras trabaja. */
		busyLabel = label,
		busy = false,
		/** Deshabilita el botón si el campo está vacío. */
		requireValue = true,
		inputmode,
		autocomplete,
		onsubmit
	}: {
		value?: string;
		type?: 'text' | 'email';
		placeholder?: string;
		label: string;
		busyLabel?: string;
		busy?: boolean;
		requireValue?: boolean;
		inputmode?: 'url' | 'email' | 'text';
		autocomplete?: 'url' | 'email';
		onsubmit: () => void;
	} = $props();

	function handle(event: SubmitEvent) {
		event.preventDefault();
		if (busy) return;
		if (requireValue && !value.trim()) return;
		onsubmit();
	}
</script>

<form onsubmit={handle} class="flex gap-2">
	<input
		{type}
		bind:value
		{placeholder}
		{inputmode}
		{autocomplete}
		required={requireValue}
		disabled={busy}
		class="input input-bordered input-lg min-w-0 flex-1"
	/>
	<button
		type="submit"
		disabled={busy || (requireValue && !value.trim())}
		class="btn btn-primary btn-lg shrink-0"
	>
		{#if busy}<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>{/if}
		<span>{busy ? busyLabel : label}</span>
	</button>
</form>
