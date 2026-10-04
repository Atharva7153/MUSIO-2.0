import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PlayerProvider } from "./context/PlayerContext";
import Playbar from "./components/Playbar";
import Navbar from "./components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MUSIO 2.0 — Sonic Architecture",
  description:
    "Experience music like never before with MUSIO 2.0 — a modern, ad-free music player with White + Solar Orange and Obsidian Rainbow themes.",
  keywords: "music player, streaming, playlist, audio, music, MUSIO, modern, ad-free",
  authors: [{ name: "Atharva Sharma" }],
  icons: {
    icon: "/lo.svg",
    apple: "/lo.svg",
  },
  openGraph: {
    title: "MUSIO 2.0 — Sonic Architecture",
    description: "Experience music like never before with MUSIO 2.0",
    type: "website",
    images: [{ url: "/music-player.png", width: 1200, height: 630, alt: "MUSIO 2.0" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MUSIO 2.0 — Sonic Architecture",
    description: "Experience music like never before with MUSIO 2.0",
    images: ["/music-player.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PlayerProvider>
          <Navbar />
          <main>{children}</main>
          <Playbar />
        </PlayerProvider>
      </body>
    </html>
  );
}
