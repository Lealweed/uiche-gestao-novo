import "./globals.css";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: { default: "Central Viagens · Gestão Operacional", template: "%s · Central Viagens" },
  description: "Plataforma de gestão operacional para equipes de turismo.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={manrope.variable}>
      <body className={`${manrope.className} antialiased bg-[hsl(var(--background))] text-[hsl(var(--foreground))]`}>
        {children}
      </body>
    </html>
  );
}
