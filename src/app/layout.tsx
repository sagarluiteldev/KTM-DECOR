import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import SmoothScroll from "@/components/SmoothScroll";
import { ClientProviders } from "@/components/ClientProviders";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.decorktm.com"),
  verification: {
    google: "b98ok2OA0IqJbQ05BA7_R1S2W2RYHlz9273MWXF5whM",
  },
  alternates: {
    canonical: "./",
  },
  title: "KTM DECOR | Premium Custom Neon Signs & Signcrafting in Nepal",
  description:
    "Elevate your space and brand with Nepal's leading custom signcrafting workshop. Meticulously handcrafted LED neon signs, 3D backlit signage, elegant nameplates, and bespoke architectural decor.",
  keywords: [
    "custom neon signs price in nepal",
    "led light board makers in kathmandu",
    "3d acrylic letter board nepal",
    "buy neon signs online ktm",
    "office wall branding decor nepal"
  ],
  icons: {
    icon: [
      { url: "/logo/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/logo/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    shortcut: "/logo/favicon-96x96.png",
    apple: [
      { url: "/logo/favicon-144x144.png", sizes: "144x144", type: "image/png" },
    ],
  },
  openGraph: {
    title: "KTM DECOR | Premium Custom Neon Signs & Signcrafting in Nepal",
    description:
      "Elevate your space and brand with Nepal's leading custom signcrafting workshop. Meticulously handcrafted LED neon signs, 3D backlit signage, elegant nameplates, and bespoke architectural decor.",
    type: "website",
    url: "https://www.decorktm.com",
    siteName: "KTM DECOR",
    images: [
      {
        url: "/images/ktm-decor-og.png",
        width: 1200,
        height: 1200,
        alt: "KTM DECOR | Premium Custom Neon Signs & Signcrafting in Nepal",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KTM DECOR | Premium Custom Neon Signs & Signcrafting in Nepal",
    description:
      "Elevate your space and brand with Nepal's leading custom signcrafting workshop. Meticulously handcrafted LED neon signs, 3D backlit signage, elegant nameplates, and bespoke architectural decor.",
    images: ["/images/ktm-decor-og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
 }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="b98ok2OA0IqJbQ05BA7_R1S2W2RYHlz9273MWXF5whM" />
      </head>
      <body className={`${inter.variable} ${outfit.variable} font-sans`} suppressHydrationWarning>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-W5S6ZTQC"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <ThemeProvider>
          <SmoothScroll>
            <Header />
            {children}
            <Footer />
            <CookieConsent />
            <ClientProviders />
            <Analytics />
          </SmoothScroll>
        </ThemeProvider>
      </body>
    </html>
  );
}
