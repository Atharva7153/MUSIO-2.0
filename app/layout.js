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
  title: "MUSIO 2.0",
  description: "A ad free music player",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PlayerProvider>
          <Navbar />
          {children}
          <Playbar />
        </PlayerProvider>
      </body>
    </html>
  );
}
