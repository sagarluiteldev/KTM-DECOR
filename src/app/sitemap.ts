import { MetadataRoute } from "next";
import { fetchAllProducts } from "@/lib/api";
import { GUIDES } from "@/data/guides-data";
import { PSEO_SERVICES, PSEO_LOCATIONS } from "@/data/pseo-locations-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decorktm.com";

  // 1. Core static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/decor-guides`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/start-project`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/press`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/neon-sign-statistics-nepal`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/cookie-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/return-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];

  // 2. Dynamic product detail routes fetched from Express API (with MongoDB timestamps)
  const products = await fetchAllProducts();
  const productRoutes: MetadataRoute.Sitemap = products.map((product) => {
    let lastModifiedDate = new Date();
    if (product.updatedAt) {
      const parsed = new Date(product.updatedAt);
      if (!isNaN(parsed.getTime())) lastModifiedDate = parsed;
    } else if (product.createdAt) {
      const parsed = new Date(product.createdAt);
      if (!isNaN(parsed.getTime())) lastModifiedDate = parsed;
    }

    return {
      url: `${baseUrl}/shop/${product.id}`,
      lastModified: lastModifiedDate,
      changeFrequency: "daily",
      priority: 0.85,
    };
  });

  // 3. Dynamic decor & signage guide routes
  const guideRoutes: MetadataRoute.Sitemap = GUIDES.map((guide) => ({
    url: `${baseUrl}/decor-guides/${guide.slug}`,
    lastModified: new Date(guide.updatedDate || guide.publishDate),
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  // 4. Programmatic service + location landing pages (pSEO Matrix)
  const pseoRoutes: MetadataRoute.Sitemap = [];
  for (const s of PSEO_SERVICES) {
    for (const l of PSEO_LOCATIONS) {
      pseoRoutes.push({
        url: `${baseUrl}/services/${s.slug}/${l.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  return [...staticRoutes, ...productRoutes, ...guideRoutes, ...pseoRoutes];
}
