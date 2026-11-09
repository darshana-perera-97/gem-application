export const SITE_NAME = 'GemBook';
export const SITE_TAGLINE = 'Ceylon Gem Marketplace';
export const DEFAULT_TITLE = `${SITE_NAME} - ${SITE_TAGLINE}`;
export const DEFAULT_DESCRIPTION =
  'Buy and sell certified Ceylon gems on GemBook — marketplace listings, verified vendors, industry news, and a community for the Sri Lankan gem trade.';
export const DEFAULT_OG_IMAGE = '/logo512.png';

const META_MAX = 160;

export function getSiteUrl() {
  const fromEnv = String(process.env.REACT_APP_SITE_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}

export function absoluteUrl(pathOrUrl = '/') {
  if (!pathOrUrl) return getSiteUrl();
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const site = getSiteUrl();
  return `${site}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function truncateMeta(text, max = META_MAX) {
  const value = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!value) return DEFAULT_DESCRIPTION;
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export function pageTitle(title) {
  const clean = String(title || '').trim();
  if (!clean) return DEFAULT_TITLE;
  if (clean === SITE_NAME || clean.includes(SITE_NAME)) return clean;
  return `${clean} | ${SITE_NAME}`;
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    alternateName: SITE_TAGLINE,
    url: getSiteUrl(),
    logo: absoluteUrl(DEFAULT_OG_IMAGE),
    description: DEFAULT_DESCRIPTION,
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: getSiteUrl(),
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${getSiteUrl()}/marketplace?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function productJsonLd(listing, vendor) {
  if (!listing) return null;
  const name = listing.title || listing.name || 'Gem listing';
  const description = truncateMeta(
    listing.description
      || [
        listing.gemType || listing.type,
        listing.variety,
        listing.caratWeight || listing.weight ? `${listing.caratWeight || listing.weight}ct` : '',
        listing.origin,
      ]
        .filter(Boolean)
        .join(' · ')
      || DEFAULT_DESCRIPTION
  );
  const image = listing.images?.find(Boolean);
  const price = listing.price ?? listing.askingPrice;
  const currency = listing.currency || 'USD';
  const vendorName = vendor?.displayName || vendor?.companyName;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    category: listing.gemType || listing.type || 'Gemstone',
    url: absoluteUrl(`/listings/${listing.id}`),
  };

  if (image) data.image = [absoluteUrl(image)];
  if (listing.origin) data.countryOfOrigin = listing.origin;
  if (vendorName) {
    data.brand = { '@type': 'Brand', name: vendorName };
    data.seller = {
      '@type': 'Organization',
      name: vendorName,
      url: vendor?.id ? absoluteUrl(`/vendors/${vendor.id}`) : undefined,
    };
  }
  if (price != null && price !== '') {
    data.offers = {
      '@type': 'Offer',
      priceCurrency: currency,
      price: Number(price) || price,
      availability:
        String(listing.status || 'ACTIVE').toUpperCase() === 'SOLD'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
      url: absoluteUrl(`/listings/${listing.id}`),
    };
  }
  return data;
}

export function vendorJsonLd(vendor) {
  if (!vendor) return null;
  const name = vendor.companyName || vendor.displayName || 'Vendor';
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description: truncateMeta(vendor.description || `${name} on ${SITE_NAME}`),
    url: absoluteUrl(`/vendors/${vendor.id || vendor.userId}`),
  };
  const logo = vendor.logo || vendor.photoURL;
  if (logo) data.logo = absoluteUrl(logo);
  if (vendor.website) data.sameAs = [vendor.website];
  if (vendor.location) {
    data.address = {
      '@type': 'PostalAddress',
      addressLocality: vendor.location,
      addressCountry: 'LK',
    };
  }
  return data;
}

export const PAGE_SEO = {
  home: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  marketplace: {
    title: 'Gem Marketplace',
    description:
      'Browse certified sapphires, rubies, spinels, and more from Sri Lankan dealers on the GemBook marketplace.',
  },
  vendors: {
    title: 'Gem Vendors',
    description:
      'Discover verified gem dealers, miners, and private sellers on GemBook — ratings, collections, and profiles.',
  },
  community: {
    title: 'Gem Community',
    description:
      'Join GemBook groups and discussions with dealers, cutters, and collectors in the Ceylon gem trade.',
  },
  news: {
    title: 'Industry News',
    description:
      'Read the latest gem trade news and market updates curated for the Ceylon gem community on GemBook.',
  },
  events: {
    title: 'Global Events',
    description:
      'Upcoming gem shows, trade fairs, and industry events listed on GemBook.',
  },
  privacy: {
    title: 'Privacy Policy',
    description:
      'How GemBook collects, uses, and protects personal information on the marketplace, feed, and messaging.',
  },
  login: {
    title: 'Sign in',
    description: 'Sign in to GemBook to save gems, message vendors, and manage your listings.',
    noindex: true,
  },
  authCallback: {
    title: 'Signing in',
    description: 'Completing GemBook sign-in.',
    noindex: true,
  },
  profile: {
    title: 'Your Profile',
    description: 'Manage your GemBook profile and account settings.',
    noindex: true,
  },
  myGems: {
    title: 'My Gems',
    description: 'Manage the gem listings you have published on GemBook.',
    noindex: true,
  },
  messages: {
    title: 'Messages',
    description: 'Chat with gemstone sellers and buyers on GemBook.',
    noindex: true,
  },
  vendorDashboard: {
    title: 'Vendor Dashboard',
    description: 'Manage your GemBook shop, listings, and business activity.',
    noindex: true,
  },
  admin: {
    title: 'Admin',
    description: 'GemBook platform administration.',
    noindex: true,
  },
  seed: {
    title: 'Seed Data',
    description: 'Development seeding tools for GemBook.',
    noindex: true,
  },
  addListing: {
    title: 'List a Gem',
    description: 'Create or edit a gem listing on GemBook.',
    noindex: true,
  },
};
