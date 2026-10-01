import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Siva Flex | Palani's Premier Large Format Digital Printing & Flex Hub",
  description:
    "Leading digital flex printing and signage management system in Palani. High-definition solvent printing, star flex, vinyl, glow sign boards, and fast dealer order dispatch.",
  keywords: [
    "Siva Flex",
    "Siva Flex Palani",
    "Flex Printing Palani",
    "Banner Printing",
    "Vinyl Printing",
    "Glow Sign Board",
    "Digital Printing Tamil Nadu",
  ],
  authors: [{ name: "Siva Flex" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  themeColor: "#0284c7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/siva_flux_logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
