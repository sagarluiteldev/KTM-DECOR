import { Metadata } from "next";
import ShopClient from "./ShopClient";
import { PRODUCTS } from "@/data/shop-data";

export const metadata: Metadata = {
  title: "Buy Custom LED Neon Signs & 3D Signboards in Nepal (2026 Prices) | KTM DECOR",
  description:
    "Order handcrafted LED neon signs, 3D acrylic light boards, room decor lamps & nameplates in Kathmandu. Direct workshop pricing starting Rs. 1,200. Fast Nepal delivery.",
  keywords: [
    "custom neon signs price in nepal",
    "buy neon signs online ktm",
    "3d acrylic board price in nepal",
    "led light board makers in kathmandu",
    "custom name plate design nepal",
    "custom signage shop kathmandu"
  ],
  alternates: {
    canonical: "/shop",
  },
  openGraph: {
    title: "Buy Custom LED Neon Signs & 3D Signboards in Nepal (2026 Prices) | KTM DECOR",
    description:
      "Explore KTM DECOR's catalog of premium custom LED neon signs, 3D acrylic light boards, corporate facade letterings, metal address plaques, and engraved wood signage in Kathmandu, Nepal.",
    url: "https://www.decorktm.com/shop",
    type: "website",
    siteName: "KTM DECOR",
    images: [
      {
        url: "/images/ktm-decor-og.png",
        width: 1200,
        height: 1200,
        alt: "KTM DECOR Shop - Premium Custom Signage in Nepal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Buy Custom LED Neon Signs & 3D Signboards in Nepal (2026 Prices) | KTM DECOR",
    description:
      "Order handcrafted LED neon signs, 3D acrylic light boards, room decor lamps & nameplates in Kathmandu. Direct workshop pricing starting Rs. 1,200. Fast Nepal delivery.",
    images: ["/images/ktm-decor-og.png"],
  },
};

export default function ShopPage() {
  const shopCatalogSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": "https://www.decorktm.com/shop#webpage",
        "url": "https://www.decorktm.com/shop",
        "name": "KTM DECOR Signage & Decor Catalog",
        "description": "Catalog of custom LED neon signs, 3D acrylic signage, custom nameplates, and architectural decor products in Nepal.",
        "isPartOf": {
          "@type": "WebSite",
          "@id": "https://www.decorktm.com/#website",
          "name": "KTM DECOR",
          "url": "https://www.decorktm.com"
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://www.decorktm.com/shop#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://www.decorktm.com"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Shop",
            "item": "https://www.decorktm.com/shop"
          }
        ]
      },
      {
        "@type": "ItemList",
        "@id": "https://www.decorktm.com/shop#itemlist",
        "name": "Featured Signage & Decor Products",
        "itemListElement": PRODUCTS.map((product, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "Product",
            "name": product.name,
            "url": `https://www.decorktm.com/shop/${product.id}`,
            "image": product.image.startsWith("http")
              ? product.image
              : `https://www.decorktm.com${product.image}`,
            "description": product.description,
            "offers": {
              "@type": "Offer",
              "priceCurrency": "NPR",
              "price": product.price,
              "availability": "https://schema.org/InStock"
            }
          }
        }))
      }
    ]
  };

  const safeShopCatalogJson = JSON.stringify(shopCatalogSchema).replace(/</g, "\\u003c");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeShopCatalogJson }}
      />
      <ShopClient />
    </>
  );
}
