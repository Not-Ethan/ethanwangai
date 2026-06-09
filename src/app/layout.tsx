import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ethanwang.ai"),
  title: "Ethan Wang",
  description:
    "Software engineer, quantitative trader, and startup founder. Building systems that trade, scale, and think.",
  openGraph: {
    title: "Ethan Wang",
    description: "Software engineer, quantitative trader, and startup founder.",
    url: "https://ethanwang.ai",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1626",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-night text-mist font-body antialiased">
        {children}
      </body>
    </html>
  );
}
