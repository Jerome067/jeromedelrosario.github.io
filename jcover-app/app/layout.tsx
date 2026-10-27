import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jerome067.github.io";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "JCover — Academic Cover Page Generator", template: "%s · JCover" },
  description: "Create professional academic cover pages and download them as PDF or editable DOCX. No account needed.",
  openGraph: { title: "JCover — Academic Document Studio", description: "Your Academic Documents, Professionally Presented.", type: "website", siteName: "JCover" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">Skip to content</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
