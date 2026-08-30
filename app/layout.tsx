import type { Metadata } from "next";
import {
  Special_Elite,
  Caveat,
  Courier_Prime,
  PT_Serif,
  Bodoni_Moda,
} from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const specialElite = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-special-elite",
});

const caveat = Caveat({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-caveat",
});

const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-courier-prime",
});

const ptSerif = PT_Serif({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-pt-serif",
});

const bodoniModa = Bodoni_Moda({
  weight: ["500", "600", "700", "800"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-bodoni-moda",
});

export const metadata: Metadata = {
  title: "whats.puzzling.us",
  description: "Puzzle authoring for whats.puzzling.us",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${specialElite.variable} ${caveat.variable} ${courierPrime.variable} ${ptSerif.variable} ${bodoniModa.variable} antialiased flex flex-col min-h-screen`}
      >
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
