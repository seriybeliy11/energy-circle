import type { Metadata, Viewport } from "next";
import { Rubik, Russo_One } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin", "cyrillic"],
  variable: "--font-rubik",
  display: "swap",
});

const russo = Russo_One({
  weight: "400",
  subsets: ["latin", "cyrillic"],
  variable: "--font-russo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HQD MIAMI CHASE — Heist Lootbox",
  description:
    "Сканируй коды Честного знака с банок HQD Energy, взламывай сейфы и забирай кейсы CS2 или кэш по СБП. Самокат Edition.",
  keywords: ["HQD", "Miami Chase", "Samokat", "lootbox", "CS2", "СБП"],
  icons: {
    icon: "/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#080312",
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
      <body className={`${rubik.variable} ${russo.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
