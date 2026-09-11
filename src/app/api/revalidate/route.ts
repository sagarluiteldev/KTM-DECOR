import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    let secret = request.headers.get("x-revalidate-secret");
    let tag = "products";
    let productId: string | undefined;

    const urlSecret = request.nextUrl.searchParams.get("secret");
    if (urlSecret) {
      secret = urlSecret;
    }

    // Try reading JSON body if present
    try {
      const body = await request.json();
      if (body) {
        if (body.secret) secret = body.secret;
        if (body.tag) tag = body.tag;
        if (body.id) productId = String(body.id);
      }
    } catch {
      // Body may be empty or non-JSON; fall back to headers / query params
    }

    const expectedSecret = process.env.REVALIDATION_SECRET || "ktm_decor_reval_secure_key_2026";

    if (!secret || secret !== expectedSecret) {
      return NextResponse.json(
        { message: "Invalid or missing revalidation secret" },
        { status: 401 }
      );
    }

    // Execute tag-based on-demand ISR revalidation (Next.js 16 profile: "max")
    revalidateTag(tag, "max");
    if (productId) {
      revalidateTag(`product-${productId}`, "max");
    }

    // Clear route cache for shop and sitemap
    revalidatePath("/shop");
    revalidatePath("/sitemap.xml");

    return NextResponse.json({
      revalidated: true,
      tag,
      productId: productId || null,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error executing revalidation", error: error?.message },
      { status: 500 }
    );
  }
}
