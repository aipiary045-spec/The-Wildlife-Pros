import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Syne } from "next/font/google";
import { PwaRegister } from "@/components/layout/PwaRegister";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
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
    <html lang="en" className={`${jakarta.variable} ${syne.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-background font-sans text-foreground">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
