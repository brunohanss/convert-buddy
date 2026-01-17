export async function loadConvertBuddyWasm() {
  const module = await import('./wasm-stub');
  return module.default;
}
