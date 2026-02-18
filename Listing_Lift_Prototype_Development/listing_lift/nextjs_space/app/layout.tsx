import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Listing Lift by Retreat Vacation Rentals",
  description: "Professional photo enhancement for vacation rental listings. Submit your photos and let AI do the magic.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Listing Lift by Retreat Vacation Rentals",
    description: "Professional photo enhancement for vacation rental listings",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js" />
        <style dangerouslySetInnerHTML={{ __html: '[data-hydration-error] { display: none !important; }' }} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
