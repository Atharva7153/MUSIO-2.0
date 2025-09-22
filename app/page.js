"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePlayer } from "./context/PlayerContext";
import "./styles/Homepage.css";
import SplashScreen from "./components/SplashScreen";

export default function HomePage() {
  const [playlists, setPlaylists] = useState([]);
  const [recentSongs, setRecentSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playSong } = usePlayer();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [playlistsRes, songsRes] = await Promise.all([
          fetch("/api/playlists"),
          fetch("/api/songs/all"),
        ]);

        const [playlistsData, songsData] = await Promise.all([
          playlistsRes.json(),
          songsRes.json(),
        ]);

        setPlaylists(playlistsData.playlists || []);
        setRecentSongs((songsData.songs || []).slice(0, 6));
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSongPlay = (song) => {
    playSong([song], 0);
  };

  const totalSongs = playlists.reduce((total, pl) => total + (pl.songs?.length || 0), 0);

  return (
    // SplashScreen will show until minDuration passes AND isLoading becomes false.
    // tweak minDuration or remove waitFor prop to always show fixed duration splash.
    <SplashScreen waitFor={isLoading} minDuration={1800}>
      <div className="homepage">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-background">
            <div className="hero-gradient"></div>
            <div className="hero-pattern"></div>
          </div>
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                Welcome to <span className="gradient-text">MUSIO 2.0</span>
              </h1>
              <p className="hero-subtitle">
                ---bby Atharva Sharma
              </p>
              <div className="hero-actions">
                <Link href="/upload" className="cta-button primary">
                  <svg viewBox="0 0 24 24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  Upload Music
                </Link>
                <Link href="/playlists" className="cta-button secondary">
                  <svg viewBox="0 0 24 24">
                    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                  </svg>
                  Browse Playlists
                </Link>
              </div>
            </div>
            <div className="hero-stats">
              <div className="stat-card">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                  </svg>
                </div>
                <div className="stat-content">
                  <span className="stat-number">{playlists.length}</span>
                  <span className="stat-label">Playlists</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
                <div className="stat-content">
                  <span className="stat-number">{totalSongs}</span>
                  <span className="stat-label">Total Songs</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div className="stat-content">
                  <span className="stat-number">∞</span>
                  <span className="stat-label">Possibilities</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="content">
          {/* Recent Songs Section */}
          <section className="recent-section">
            <div className="section-header">
              <h2 className="section-title">Recently Added</h2>
              <Link href="/songs" className="view-all-link">
                View All
                <svg viewBox="0 0 24 24">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                </svg>
              </Link>
            </div>

            {isLoading ? (
              <div className="loading-grid">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="song-card loading">
                    <div className="song-image loading-shimmer"></div>
                    <div className="song-info">
                      <div className="song-title loading-shimmer"></div>
                      <div className="song-artist loading-shimmer"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentSongs.length > 0 ? (
              <div className="songs-grid">
                {recentSongs.map((song) => (
                  <div key={song._id} className="song-card" onClick={() => handleSongPlay(song)}>
                    <div className="song-image-container">
                      <img src={song.coverImage || "/default-song.png"} alt={song.title} className="song-image" />
                      <div className="play-overlay">
                        <svg viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="song-info">
                      <h3 className="song-title">{song.title}</h3>
                      <p className="song-artist">{song.artist || "Unknown Artist"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
                <h3>No songs yet</h3>
                <p>Upload your first song to get started</p>
                <Link href="/upload" className="cta-button primary">
                  Upload Music
                </Link>
              </div>
            )}
          </section>

          {/* Playlists Section */}
          <section className="playlists-section">
            <div className="section-header">
              <h2 className="section-title">Your Playlists</h2>
              <Link href="/playlists" className="view-all-link">
                View All
                <svg viewBox="0 0 24 24">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                </svg>
              </Link>
            </div>

            {isLoading ? (
              <div className="loading-grid">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="playlist-card loading">
                    <div className="playlist-image loading-shimmer"></div>
                    <div className="playlist-info">
                      <div className="playlist-name loading-shimmer"></div>
                      <div className="playlist-count loading-shimmer"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : playlists.length > 0 ? (
              <div className="playlists-grid">
                {playlists.map((playlist) => (
                  <Link key={playlist._id} href={`/playlist/${playlist._id}`} className="playlist-card">
                    <div className="playlist-image-container">
                      <img src={playlist.coverImage || "/default-playlist.png"} alt={playlist.name} className="playlist-image" />
                      <div className="playlist-overlay">
                        <svg viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="playlist-info">
                      <h3 className="playlist-name">{playlist.name}</h3>
                      <p className="playlist-count">{playlist.songs?.length || 0} songs</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                  </svg>
                </div>
                <h3>No playlists yet</h3>
                <p>Create your first playlist to organize your music</p>
                <Link href="/upload" className="cta-button primary">
                  Create Playlist
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </SplashScreen>
  );
}
