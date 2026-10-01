import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0284c7",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://sivaflexpalani.netlify.app"),
  title: {
    default: "Siva Flex Palani | Premier Digital Flex, Banner & Signage Printing Press",
    template: "%s | Siva Flex Palani",
  },
  description:
    "Siva Flex Palani (106 ABT Complex, Dindigul Road, Palani). Tamil Nadu's leading digital flex printing press. Express solvent flex printing, star flex, vinyl stickers, glow sign boards, and dealer portal.",
  keywords: [
    "sivaflexpalani",
    "siva flex palani",
    "sivaflex",
    "siva flex",
    "siva flux palani",
    "siva flex printing palani",
    "flex printing in palani",
    "banner printing palani",
    "vinyl printing palani",
    "glow sign board palani",
    "digital flex press palani",
    "star flex printing palani",
    "foam board printing palani",
    "wedding banner palani",
    "dindigul road flex printing",
  ],
  authors: [{ name: "Siva Flex Palani", url: "https://sivaflexpalani.netlify.app" }],
  creator: "Siva Flex Palani",
  publisher: "Siva Flex Palani",
  alternates: {
    canonical: "https://sivaflexpalani.netlify.app",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://sivaflexpalani.netlify.app",
    siteName: "Siva Flex Palani",
    title: "Siva Flex Palani | Premier Digital Flex & Signage Printing Press",
    description:
      "Leading large-format digital printing hub in Palani. Solvent flex, star flex, vinyl banners, and glow signs with express delivery for dealers and businesses.",
    images: [
      {
        url: "/siva_flux_logo.png",
        width: 785,
        height: 704,
        alt: "Siva Flex Palani Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Siva Flex Palani | Premier Digital Flex & Banner Printing",
    description:
      "Palani's top flex printing press. High-definition solvent prints, star flex, and glow sign boards.",
    images: ["/siva_flux_logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Siva Flex Palani",
  alternateName: ["Siva Flex", "sivaflexpalani", "Siva Flux Palani", "Sivaflex"],
  image: "https://sivaflexpalani.netlify.app/siva_flux_logo.png",
  logo: "https://sivaflexpalani.netlify.app/siva_flux_logo.png",
  url: "https://sivaflexpalani.netlify.app",
  telephone: "+917598154009",
  email: "sivaflexpalani@gmail.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "106 ABT Complex, Dindigul Road",
    addressLocality: "Palani",
    postalCode: "624601",
    addressRegion: "Tamil Nadu",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 10.4503,
    longitude: 77.5186,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "21:30",
    },
  ],
  priceRange: "₹₹",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Flex and Signage Printing Services",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Normal Flex & Star Flex Printing",
          description: "High-definition solvent flex printing for billboards, banners, and hoardings.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Vinyl Printing & Lamination",
          description: "Glossy and matte vinyl stickers for shop fronts, vehicles, and branding.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Backlight & Glow Sign Boards",
          description: "Illuminated signage boxes and glow sign boards for retail establishments.",
        },
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
