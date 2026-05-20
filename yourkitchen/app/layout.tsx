import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RestaurantOS",
  description: "POS · KDS · Backoffice",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
