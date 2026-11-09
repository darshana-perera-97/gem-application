/**
 * Writes public/sitemap.xml for static public routes.
 * Set REACT_APP_SITE_URL (or SITE_URL) to your production origin before build.
 */
const fs = require('fs');
const path = require('path');

const site = String(process.env.REACT_APP_SITE_URL || process.env.SITE_URL || 'http://localhost:3000')
  .trim()
  .replace(/\/$/, '');

const routes = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/marketplace', priority: '0.9', changefreq: 'hourly' },
  { loc: '/vendors', priority: '0.8', changefreq: 'daily' },
  { loc: '/community', priority: '0.7', changefreq: 'daily' },
  { loc: '/news', priority: '0.7', changefreq: 'daily' },
  { loc: '/events', priority: '0.6', changefreq: 'weekly' },
  { loc: '/privacy', priority: '0.3', changefreq: 'yearly' },
];

const lastmod = new Date().toISOString().slice(0, 10);
const body = routes
  .map(
    (route) => `  <url>
    <loc>${site}${route.loc === '/' ? '/' : route.loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
  )
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

const out = path.join(__dirname, '..', 'public', 'sitemap.xml');
fs.writeFileSync(out, xml);

const robotsPath = path.join(__dirname, '..', 'public', 'robots.txt');
const robots = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /
Disallow: /admin
Disallow: /seed
Disallow: /messages
Disallow: /login
Disallow: /auth/
Disallow: /profile
Disallow: /my-gems
Disallow: /add-listing
Disallow: /vendor/dashboard
Disallow: /*/edit

Sitemap: ${site}/sitemap.xml
`;
fs.writeFileSync(robotsPath, robots);

console.log(`Wrote ${out} and updated robots.txt for ${site}`);
