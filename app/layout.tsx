import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, Caveat } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Provider from "./provider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-handwriting",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ExploreX | Intelligent Travel Planning & Storytelling",
  description:
    "Plan and organize intelligent travel itineraries with a spatial AI travel copilot.",
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
        <body
          className={`${jakarta.variable} ${playfair.variable} ${caveat.variable} font-sans antialiased bg-[#070a12] text-slate-100 selection:bg-amber-500/30 selection:text-amber-200`}
        >
          <Provider>{children}</Provider>
        </body>
      </html>
    </ClerkProvider>
  );
}
