"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePlayer } from "../context/PlayerContext";
import "./PlaylistsPage.css";

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { playSong } = usePlayer();

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const res = await fetch("/api/playlists");
        const data = await res.json();
        setPlaylists(data.playlists || []);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching playlists:", error);
        setIsLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  const filteredPlaylists = playlists.filter(playlist =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlayPlaylist = (playlist) => {
    if (playlist.songs.length > 0) {
      playSong(playlist.songs, 0);
    }
  };

  return (
    <div className="playlists-page page-content">
      <div className="playlists-container">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">Your Playlists</h1>
            <p className="page-subtitle">
              Organize and enjoy your music collection
            </p>
          </div>
          <Link href="/upload" className="create-playlist-btn">
            <svg viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Create Playlist
          </Link>
        </div>

        {/* Search */}
        <div className="search-section">
          <div className="search-container">
            <svg className="search-icon" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder="Search playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Playlists Grid */}
        {isLoading ? (
          <div className="loading-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="playlist-card loading">
                <div className="playlist-image loading-shimmer"></div>
                <div className="playlist-info">
                  <div className="playlist-name loading-shimmer"></div>
                  <div className="playlist-count loading-shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredPlaylists.length > 0 ? (
          <div className="playlists-grid">
            {filteredPlaylists.map((playlist) => (
              <div key={playlist._id} className="playlist-card">
                <div className="playlist-image-container">
                  <img
                    src={playlist.coverImage || "/default-playlist.png"}
                    alt={playlist.name}
                    className="playlist-image"
                  />
                  <div className="playlist-overlay">
                    <button
                      className="play-button"
                      onClick={() => handlePlayPlaylist(playlist)}
                      disabled={playlist.songs.length === 0}
                      aria-label="Play playlist"
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                    <Link
                      href={`/playlist/${playlist._id}`}
                      className="view-button"
                      aria-label="View playlist"
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    </Link>
                  </div>
                </div>
                <div className="playlist-info">
                  <h3 className="playlist-name">{playlist.name}</h3>
                  <p className="playlist-count">
                    {playlist.songs.length} {playlist.songs.length === 1 ? 'song' : 'songs'}
                  </p>
                  <div className="playlist-actions">
                    <Link
                      href={`/playlist/${playlist._id}`}
                      className="action-button primary"
                    >
                      View Details
                    </Link>
                    <button
                      className="action-button secondary"
                      onClick={() => handlePlayPlaylist(playlist)}
                      disabled={playlist.songs.length === 0}
                    >
                      Play All
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
              </svg>
            </div>
            <h3>No playlists found</h3>
            <p>
              {searchQuery 
                ? "No playlists match your search. Try a different term."
                : "Create your first playlist to organize your music collection."
              }
            </p>
            <Link href="/upload" className="cta-button">
              <svg viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Create Playlist
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
