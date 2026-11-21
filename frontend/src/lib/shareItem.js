/**
 * Share helpers: copy link, WhatsApp, and native OS share sheet.
 */

export function listingShareUrl(listingId) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/listings/${listingId}`;
}

export function postShareUrl(postId) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (!postId) return origin || '/';
  return `${origin}/?post=${encodeURIComponent(postId)}`;
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

export function whatsappShareUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function nativeShare({ title, text, url }) {
  if (!navigator.share) return false;
  await navigator.share({ title, text, url });
  return true;
}

export function buildShareBody({ title, url, message }) {
  const line = (message || `Check out ${title} on GemBook`).trim();
  return `${line}\n${url}`;
}
