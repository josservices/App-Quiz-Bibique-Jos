import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  robots?: string;
}

const DEFAULT_IMAGE_PATH = '/og.png';

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/u, '');
}

function buildAbsoluteUrl(baseUrl: string, path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

function getBaseUrl(): string {
  const configured = normalizeBaseUrl(import.meta.env.SITE_URL ?? '');
  if (configured) {
    return configured;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeBaseUrl(window.location.origin);
  }

  return 'https://example.com';
}

export function SEO({ title, description, path, image, robots = 'index,follow' }: SEOProps) {
  const baseUrl = getBaseUrl();
  const canonicalUrl = buildAbsoluteUrl(baseUrl, path);
  const imageUrl = image
    ? (image.startsWith('http://') || image.startsWith('https://') ? image : buildAbsoluteUrl(baseUrl, image))
    : buildAbsoluteUrl(baseUrl, DEFAULT_IMAGE_PATH);

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:locale" content="fr_FR" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content="Quiz Biblique Louis Segond 1910" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
}
