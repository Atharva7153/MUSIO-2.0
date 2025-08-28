"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import "./styles/Homepage.css"; // Import the CSS file

export default function HomePage() {
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((data) => setPlaylists(data.playlists));
  }, []);

  return (
    <div className="homepage">
      {/* Animated Background */}
      <div className="animated-background"></div>

      {/* Main Content */}
      <div className="content">
        <h1 className="title">All Playlists</h1>

        <div className="scroll-container">
          <div className="playlist-grid">
            {playlists.map((pl) => (
              <Link key={pl._id} href={`/playlist/${pl._id}`}>
                <div className="playlist-card">
                  <img
                    src={pl.coverImage || "/default-playlist.png"}
                    alt={pl.name}
                    className="playlist-image"
                  />
                  <h2 className="playlist-name">{pl.name}</h2>
                  <p className="playlist-count">{pl.songs.length} songs</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Watermark */}
      <div className="watermark">Made by Atharva Sharma</div>
    </div>
  );
}
