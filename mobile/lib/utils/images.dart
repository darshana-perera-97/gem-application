/// Brand mark and image-path helpers. Mirrors frontend/src/constants/sampleImages.js

const String kSampleLogoAsset = 'assets/images/gembook-logo.svg';
const String kDefaultNewsImage =
    'assets/images/gemstone_collection_luxury_1781701065808.jpg';

String normalizeAssetPath(String url) {
  if (url.startsWith('/src/assets/images/')) {
    return url.replaceFirst('/src/assets/images/', '/assets/images/');
  }
  return url;
}

/// Returns the stored image URL, or empty when none was provided.
String resolveImage(dynamic url) {
  if (url is String && url.trim().isNotEmpty) {
    return normalizeAssetPath(url.trim());
  }
  return '';
}

String resolveAvatar(dynamic url) => resolveImage(url);
String resolveGem(dynamic url) => resolveImage(url);
String resolveCover(dynamic url) => resolveImage(url);

List<String> resolvePostMedia(dynamic media) {
  if (media is! List) return [];
  return media.map(resolveImage).where((u) => u.isNotEmpty).toList();
}

/// Map web `/assets/...` paths to Flutter asset keys or keep remote URLs.
String? toFlutterImageSource(String? url) {
  if (url == null || url.isEmpty) return null;
  final normalized = normalizeAssetPath(url);
  if (normalized.startsWith('/assets/images/')) {
    return 'assets/images/${normalized.split('/').last}';
  }
  if (normalized.startsWith('assets/')) return normalized;
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }
  if (normalized.startsWith('/')) {
    // Relative API/media path — leave as network against API host when needed
    return normalized;
  }
  return normalized;
}

bool isNetworkImage(String? source) {
  if (source == null || source.isEmpty) return false;
  return source.startsWith('http://') || source.startsWith('https://');
}

bool isAssetImage(String? source) {
  if (source == null || source.isEmpty) return false;
  return source.startsWith('assets/');
}
