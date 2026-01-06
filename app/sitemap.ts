import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://charlie-m.de';

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date();
  
  // Static pages with priorities
  const routes = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/rooms', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/location', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/concept', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/faq', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/privacy-policy', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/terms-and-conditions', priority: 0.3, changeFrequency: 'yearly' as const }
  ];

  // Generate URLs for both languages
  const urls: MetadataRoute.Sitemap = [];
  
  routes.forEach(route => {
    urls.push({
      url: `${siteUrl}${route.path}`,
      lastModified: currentDate,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: {
          en: `${siteUrl}${route.path}`,
          de: `${siteUrl}/de${route.path}`
        }
      }
    });
  });

  return urls;
}

