import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ethan Wang",
  description: "Software engineer, quantitative trader, and startup founder. Building systems that trade, scale, and think.",
  openGraph: {
    title: "Ethan Wang",
    description: "Software engineer, quantitative trader, and startup founder.",
    url: "https://ethanwang.ai",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-bg text-light font-body antialiased">
        {children}
      </body>
    </html>
  );
}
