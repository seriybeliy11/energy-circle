import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HQD Клуб — лутбоксы и колесо за сканы Честного знака",
  description:
    "Сканируй код Честного знака с крышек банок HQD Energy, выполняй задания, открывай лутбоксы, крути колесо и участвуй в розыгрышах.",
  keywords: ["HQD", "Честный знак", "Miami Chase", "лутбоксы", "колесо", "розыгрыш", "акция"],
  icons: {
    icon: "/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f5f7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${manrope.variable} antialiased`}>{children}</body>
    </html>
  );
}
