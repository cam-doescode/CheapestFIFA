import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:
    "FIFA World Cup 2026 Ticket Prices — Compare Cheap Tickets Across Resale Markets",
  description:
    "Compare FIFA World Cup 2026 ticket prices across resale marketplaces. Find cheap tickets for all 104 matches in the US, Canada & Mexico. Live prices from FIFA Collect and secondary markets.",
  keywords: [
    "FIFA World Cup 2026 tickets",
    "World Cup 2026 ticket prices",
    "cheap World Cup tickets",
    "FIFA World Cup resale tickets",
    "World Cup 2026 USA",
    "World Cup 2026 Canada",
    "World Cup 2026 Mexico",
    "FIFA Collect tickets",
    "World Cup ticket comparison",
    "FIFA 2026 tickets",
  ],
  openGraph: {
    title: "FIFA World Cup 2026 Ticket Prices — Find the Best Deals",
    description:
      "The biggest World Cup ever is coming to North America. Compare ticket prices across resale markets for all 104 matches and save up to 50%.",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
