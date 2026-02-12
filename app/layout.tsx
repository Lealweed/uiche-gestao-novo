import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guichê Gestão",
  description: "Gestão de guichês e fechamento de caixa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
