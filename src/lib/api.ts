import { PRODUCTS, type Product } from "@/data/shop-data";

export type ApiProduct = Product & {
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Resolves the base URL for backend API requests.
 * In development, points directly to the Express server (127.0.0.1:5001).
 * In production, points to the site domain or an internal API endpoint.
 */
export function getBackendBaseUrl(): string {
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL.replace(/\/+$/, "");
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return "https://www.decorktm.com";
  }
  return "http://127.0.0.1:5001";
}

/**
 * Server-side fetch for an individual product by ID with Next.js ISR tags.
 * Falls back gracefully to the static product dataset if the backend is unavailable.
 */
export async function fetchProductById(id: string): Promise<ApiProduct | null> {
  const baseUrl = getBackendBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/products/${id}`, {
      next: {
        tags: ["products", `product-${id}`],
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (data.id || data._id)) {
        return {
          ...data,
          id: data.id || String(data._id),
        } as ApiProduct;
      }
    }
  } catch (error) {
    console.warn(`[ISR Fetch Warning] Failed to fetch product ${id} from ${baseUrl}:`, error);
  }

  // Graceful fallback to static product catalog
  const staticItem = PRODUCTS.find((p) => p.id === id);
  return staticItem ? (staticItem as ApiProduct) : null;
}

/**
 * Server-side fetch for all products with Next.js ISR tags.
 * Falls back gracefully to the static product dataset if the backend is unavailable.
 */
export async function fetchAllProducts(): Promise<ApiProduct[]> {
  const baseUrl = getBackendBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/products`, {
      next: {
        tags: ["products"],
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item) => ({
          ...item,
          id: item.id || String(item._id),
        })) as ApiProduct[];
      }
    }
  } catch (error) {
    console.warn(`[ISR Fetch Warning] Failed to fetch all products from ${baseUrl}:`, error);
  }

  // Graceful fallback to static product catalog
  return PRODUCTS as ApiProduct[];
}
