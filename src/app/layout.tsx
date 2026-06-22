import type { Metadata } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import ForestBackground from "@/components/ForestBackground";

export const metadata: Metadata = {
  title: "Ethan Wang — Into the Woods",
  description:
    "Software engineer, quantitative trader, and startup founder. An interactive walk through the forest of systems that trade, scale, and think.",
  openGraph: {
    title: "Ethan Wang",
    description:
      "Software engineer, quantitative trader, and startup founder.",
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
    <html lang="en">
      <body className="bg-bg text-light font-body antialiased">
        <ForestBackground />
        <div className="grain" />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
