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
        {/* Gentle global veil to lift text legibility over the bright scene. */}
        <div
          aria-hidden
          className="fixed inset-0 z-[1] pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 35%, rgba(4,8,6,0) 40%, rgba(4,8,6,0.4) 100%), linear-gradient(to bottom, rgba(4,8,6,0.28), rgba(4,8,6,0.12) 30%, rgba(4,8,6,0.12) 70%, rgba(4,8,6,0.32))",
          }}
        />
        <div className="grain" />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
