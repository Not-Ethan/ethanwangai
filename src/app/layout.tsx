import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ethan Wang",
  description:
    "Ethan Wang builds trading systems and video infrastructure. CS + math at Case Western Reserve University.",
  openGraph: {
    title: "Ethan Wang",
    description: "Ethan Wang builds trading systems and video infrastructure.",
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
      <body className="bg-bg text-ink font-body antialiased">{children}</body>
    </html>
  );
}
