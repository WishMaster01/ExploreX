import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Provider from "./provider";
import { getPublicSiteUrl } from "@/lib/site-url";

const publicSiteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  metadataBase: publicSiteUrl ?? undefined,
  title: "ExploreX | Intelligent Travel Planning & Storytelling",
  description:
    "Plan and organize intelligent travel itineraries with a spatial AI travel copilot.",
  openGraph: {
    type: "website",
    siteName: "ExploreX",
    title: "ExploreX | Intelligent Travel Planning & Storytelling",
    description:
      "Plan and organize intelligent travel itineraries with a spatial AI travel copilot.",
    ...(publicSiteUrl
      ? {
          images: [
            {
              url: new URL("/ExploreX_LOGO.png", publicSiteUrl).toString(),
              alt: "ExploreX",
            },
          ],
        }
      : {}),
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/ExploreX_LOGO.png", type: "image/png" },
    ],
    apple: [{ url: "/ExploreX_LOGO.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark" suppressHydrationWarning>
        <body className="font-sans antialiased bg-[#070a12] text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
          <Provider>{children}</Provider>
        </body>
      </html>
    </ClerkProvider>
  );
}
