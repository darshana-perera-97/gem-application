import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  pageTitle,
  truncateMeta,
} from '../../lib/seo';

const JSON_LD_ID = 'gembook-jsonld';

function upsertMeta(attr, key, content) {
  if (content == null || content === '') return;
  let element = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', String(content));
}

function upsertLink(rel, href) {
  if (!href) return;
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function setJsonLd(data) {
  const existing = document.getElementById(JSON_LD_ID);
  if (!data) {
    existing?.remove();
    return;
  }
  const payload = Array.isArray(data) ? data.filter(Boolean) : data;
  if (Array.isArray(payload) && payload.length === 0) {
    existing?.remove();
    return;
  }
  let script = existing;
  if (!script) {
    script = document.createElement('script');
    script.id = JSON_LD_ID;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(payload);
}

/**
 * Per-route document head manager for titles, meta, Open Graph, Twitter, canonical, and JSON-LD.
 * Renders nothing in the React tree.
 */
export function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image,
  type = 'website',
  noindex = false,
  jsonLd = null,
}) {
  const location = useLocation();
  const pathname = path || location.pathname || '/';
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const fullTitle = pageTitle(title);
    const desc = truncateMeta(description);
    const canonical = absoluteUrl(pathname.split('?')[0] || '/');
    const ogImage = absoluteUrl(image || DEFAULT_OG_IMAGE);
    const robots = noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';

    document.title = fullTitle;

    upsertMeta('name', 'description', desc);
    upsertMeta('name', 'robots', robots);
    upsertMeta('name', 'googlebot', robots);
    upsertLink('canonical', canonical);

    upsertMeta('property', 'og:locale', 'en_US');
    upsertMeta('property', 'og:site_name', 'GemBook');
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:image', ogImage);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', ogImage);

    setJsonLd(jsonLdKey ? JSON.parse(jsonLdKey) : null);
  }, [title, description, pathname, image, type, noindex, jsonLdKey]);

  return null;
}
