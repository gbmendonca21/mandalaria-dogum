import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mandalaria D'ogum",
  description: "Peças artesanais feitas com cuidado.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
