import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const booksPath = path.join(rootDir, 'src', 'data', 'books.json');
const publicDir = path.join(rootDir, 'public');
const sitemapPath = path.join(publicDir, 'sitemap.xml');
const robotsPath = path.join(publicDir, 'robots.txt');

const fallbackUrl = 'https://example.com';
const siteUrl = String(process.env.SITE_URL ?? fallbackUrl).trim().replace(/\/+$/u, '');
const today = new Date().toISOString().split('T')[0];

function toDatasetSlug(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function toAbsoluteUrl(pathname) {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${siteUrl}${normalized}`;
}

function buildUrlEntry(pathname, priority = '0.7', changefreq = 'weekly') {
  return [
    '  <url>',
    `    <loc>${toAbsoluteUrl(pathname)}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>'
  ].join('\n');
}

const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
const bibleBooks = books.filter((book) => book.id !== 'generalitebible');

const entries = [
  buildUrlEntry('/', '1.0', 'daily'),
  buildUrlEntry('/generalites/normal', '0.9', 'weekly'),
  buildUrlEntry('/generalites/difficile', '0.9', 'weekly')
];

for (const book of bibleBooks) {
  const slug = toDatasetSlug(book.id || book.name);
  entries.push(buildUrlEntry(`/livre/${slug}/normal`, '0.8', 'weekly'));
  entries.push(buildUrlEntry(`/livre/${slug}/difficile`, '0.8', 'weekly'));
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries,
  '</urlset>',
  ''
].join('\n');

const robots = [`User-agent: *`, `Allow: /`, `Sitemap: ${toAbsoluteUrl('/sitemap.xml')}`, ''].join('\n');

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(sitemapPath, sitemap, 'utf8');
fs.writeFileSync(robotsPath, robots, 'utf8');

console.log(`SEO généré avec SITE_URL=${siteUrl}`);
console.log(`- ${path.relative(rootDir, sitemapPath)}`);
console.log(`- ${path.relative(rootDir, robotsPath)}`);
