import { Metadata } from "next";
import { fetchProductById, fetchAllProducts } from "@/lib/api";
import ProductDetailClient from "@/components/ProductDetailClient";

export async function generateStaticParams() {
  const products = await fetchAllProducts();
  return products.map((product) => ({
    id: product.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const product = await fetchProductById(resolvedParams.id);

  if (!product) {
    return {
      title: "Product Not Found | KTM DECOR",
    };
  }

  const title = `${product.name} Price in Nepal (2026) | Custom Signage — KTM DECOR`;
  const description = `Buy ${product.name} in Nepal. ${product.description.slice(0, 110)}... Direct Balkot workshop price from NPR ${Number(product.price).toLocaleString()} with 1-year warranty & fast delivery.`;
  const canonicalUrl = `https://www.decorktm.com/shop/${product.id}`;
  const imageUrl = product.image.startsWith("http")
    ? product.image
    : `https://www.decorktm.com${product.image}`;

  return {
    title,
    description,
    keywords: [
      product.name.toLowerCase(),
      `${product.name.toLowerCase()} price in nepal`,
      `${product.category.toLowerCase()} price nepal`,
      `${product.category.toLowerCase()} kathmandu`,
      "custom signage nepal",
      "buy neon signs online ktm",
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: "KTM DECOR",
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 800,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const product = await fetchProductById(resolvedParams.id);

  if (!product) {
    return <ProductDetailClient />;
  }

  const productImageUrl = product.image.startsWith("http")
    ? product.image
    : `https://www.decorktm.com${product.image}`;

  const availability =
    (product.stockStatus as string) === "Out of Stock"
      ? "https://schema.org/OutOfStock"
      : "https://schema.org/InStock";

  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    image: [productImageUrl],
    description: product.description,
    sku: `KTM-PROD-${product.id}`,
    brand: {
      "@type": "Brand",
      name: "KTM DECOR",
    },
    offers: {
      "@type": "Offer",
      url: `https://www.decorktm.com/shop/${product.id}`,
      priceCurrency: "NPR",
      price: Number(product.price),
      priceValidUntil: "2026-12-31",
      itemCondition: "https://schema.org/NewCondition",
      availability,
      seller: {
        "@type": "Organization",
        name: "KTM DECOR",
        url: "https://www.decorktm.com",
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "NP",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
        url: "https://www.decorktm.com/return-policy",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "0",
          currency: "NPR",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "NP",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 4,
            unitCode: "DAY",
          },
        },
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating || 4.9,
      reviewCount: product.reviewsCount || 34,
      bestRating: "5",
      worstRating: "1",
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.decorktm.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: "https://www.decorktm.com/shop",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `https://www.decorktm.com/shop/${product.id}`,
      },
    ],
  };

  // Prevent XSS vulnerabilities in JSON-LD script injection
  const safeProductJson = JSON.stringify(productSchema).replace(/</g, "\\u003c");
  const safeBreadcrumbJson = JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeProductJson }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeBreadcrumbJson }}
      />
      <ProductDetailClient />
    </>
  );
}
