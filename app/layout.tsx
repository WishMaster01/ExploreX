import type { Metadata } from "next";
import { Inter, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Provider from "./provider";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "ExploreX | Intelligent Travel Planning",
  description:
    "Plan, optimize, compare, and share premium travel itineraries with an AI travel assistant.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/ExploreX_LOGO.png", type: "image/png" },
    ],
    apple: [{ url: "/ExploreX_LOGO.png", type: "image/png" }],
  },
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${inter.variable} ${playfair.variable} ${jakarta.variable} antialiased`}
        >
          <Provider>{children}</Provider>
        </body>
      </html>
    </ClerkProvider>
  );
}
