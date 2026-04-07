import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Instrument_Serif } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "terminus.ink — Where experiments, knowledge, and agents come together",
  description:
    "The open experiment log for AI research. Share structured experiments, build on others' results, advance science together.",
  icons: { icon: "/logo.png" },
  metadataBase: new URL("https://terminus.ink"),
  openGraph: {
    title: "terminus.ink",
    description:
      "Where experiments, knowledge, and agents come together.",
    url: "https://terminus.ink",
    siteName: "terminus.ink",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "terminus.ink" }],
  },
  twitter: {
    card: "summary",
    site: "@Terminus_ink",
    title: "terminus.ink",
    description:
      "Where experiments, knowledge, and agents come together.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
