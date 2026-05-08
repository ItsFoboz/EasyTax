import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="bg">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
