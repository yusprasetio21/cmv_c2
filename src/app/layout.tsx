import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RT Digital - Sistem Manajemen RT",
  description: "Aplikasi manajemen RT terpadu untuk pengelolaan warga, iuran, surat, dan denah rumah",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} font-sans antialiased bg-slate-50 text-foreground`}
        style={{ fontFamily: 'var(--font-plus-jakarta), system-ui, sans-serif' }}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
