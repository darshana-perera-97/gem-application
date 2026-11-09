/** Brand mark and image-path helpers. Missing photos stay empty. */

export const SAMPLE_LOGO = '/assets/images/gembook-logo.svg';

const normalizeAssetPath = (url) => {
  if (url.startsWith('/src/assets/images/')) {
    return url.replace('/src/assets/images/', '/assets/images/');
  }
  return url;
};

/** Returns the stored image URL, or an empty string when none was provided. */
export const resolveImage = (url) => {
  if (url && typeof url === 'string' && url.trim().length > 0) {
    return normalizeAssetPath(url.trim());
  }
  return '';
};

export const resolveAvatar = (url) => resolveImage(url);
export const resolveGem = (url) => resolveImage(url);
export const resolveCover = (url) => resolveImage(url);

/** Keeps only real media URLs attached to a post. */
export const resolvePostMedia = (media) => {
  if (!Array.isArray(media)) return [];
  return media.map((url) => resolveImage(url)).filter(Boolean);
};
