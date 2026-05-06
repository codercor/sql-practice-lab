import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SQL Practice Lab",
  description: "A local PostgreSQL practice platform for learning SQL.",
  icons: {
    icon: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
