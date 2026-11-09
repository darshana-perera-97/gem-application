const listeners = new Set();

export function onCatalogChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitCatalogChange() {
  listeners.forEach((listener) => listener());
}
