"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import "./styles/Homepage.css"; // Import the new CSS file

export default function HomePage() {
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((data) => setPlaylists(data.playlists));
      
  }, []);

  return (
    <div className="homepage">
      {/* Main Content */}
      <div className="content">
        {/* Playlist Section */}
        <div className="playlist-section">
          <h2 className="section-title">Your Playlists</h2>
          
          {playlists.length === 0 ? (
            <div className="empty-state">
              <h3>Loading </h3>
            </div>
          ) : (
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
                      <h3 className="playlist-name">{pl.name}</h3>
                      <p className="playlist-count">{pl.songs.length} songs</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div className="hero-section">
          <div className="hero-content">
            <h1 className="title">Musio 2.0</h1>
            <p className="subtitle">--BY Atharva Sharma</p>
            
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">{playlists.length}</span>
                <span className="stat-label">Playlists</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{playlists.reduce((total, pl) => total + pl.songs.length, 0)}</span>
                <span className="stat-label">Total Songs</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">∞</span>
                <span className="stat-label">Possibilities</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Watermark */}
      <div className="watermark">Made by Atharva Sharma</div>
    </div>
  );
}
