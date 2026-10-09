import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Provider from "./provider";

export const metadata: Metadata = {
  title: "ExploreX | Intelligent Travel Planning",
  description:
    "Plan and organize travel itineraries with an AI travel assistant.",
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
      <html lang="en" suppressHydrationWarning>
        <body className="antialiased">
          <Provider>{children}</Provider>
        </body>
      </html>
    </ClerkProvider>
  );
}
