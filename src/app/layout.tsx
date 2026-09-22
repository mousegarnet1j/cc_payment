import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Modal de pago",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
