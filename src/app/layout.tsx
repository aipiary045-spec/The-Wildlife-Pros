import type { Metadata, Viewport } from "next";
import { Oswald, Outfit } from "next/font/google";
import { PwaRegister } from "@/components/layout/PwaRegister";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CritterOps · The Wildlife Pros",
  description: "Field-service operations for wildlife and pest professionals.",
  applicationName: "CritterOps",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CritterOps",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#152019",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${oswald.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-background font-sans text-foreground">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
