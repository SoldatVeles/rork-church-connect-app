import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";

import "./globals.css";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WebsiteTranslationProvider } from "@/components/WebsiteTranslationProvider";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${siteConfig.domain}`),
  title: siteConfig.name,
  description: `Offizielle Website der ${siteConfig.name}.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        <NextIntlClientProvider>
          <WebsiteTranslationProvider>
            <Header />
            {children}
            <Footer />
          </WebsiteTranslationProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}