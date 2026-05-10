import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ДанъкЛесно — EasyTax",
  description: "Bulgarian freelancer tax management — calculations, deadlines, NRA filings.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bg" className={inter.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
