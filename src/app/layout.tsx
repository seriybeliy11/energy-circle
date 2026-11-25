import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin", "cyrillic"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HQD Клуб — сундуки и колесо за сканы Честного знака",
  description:
    "Сканируй код Честного знака с банок HQD Energy, выполняй задания, открывай сундуки, крути колесо и участвуй в розыгрышах.",
  keywords: ["HQD", "Честный знак", "Miami Chase", "сундуки", "колесо", "розыгрыш", "акция"],
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
      <body className={`${rubik.variable} antialiased`}>{children}</body>
    </html>
  );
}
