typedef CatalogListener = void Function();

/// Mirrors frontend/src/lib/catalogEvents.js — broadcast when listings change.
class CatalogEvents {
  CatalogEvents._();

  static final Set<CatalogListener> _listeners = {};

  static void Function() onCatalogChange(CatalogListener listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  static void notifyCatalogChanged() {
    for (final listener in List.of(_listeners)) {
      listener();
    }
  }
}
