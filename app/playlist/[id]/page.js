// app/playlist/[id]/page.js
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePlayer } from "../../context/PlayerContext";
import "./PlaylistPage.css";

export default function PlaylistPage() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { playSong } = usePlayer();

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/playlist/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPlaylist(data.playlist);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching playlist:', error);
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return (
      <div className="playlist-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          Loading playlist...
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="playlist-page">
        <div className="playlist-container">
          <div className="empty-state">
            <svg className="empty-icon" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <h2 className="empty-title">Playlist Not Found</h2>
            <p className="empty-description">The playlist you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="playlist-page">
      <div className="playlist-container">
        {/* Playlist Header */}
        <div className="playlist-header">
          <img
            src={playlist.coverImage || "/default-playlist.png"}
            alt={playlist.name}
            className="playlist-cover"
          />
          <div className="playlist-info">
            <h1 className="playlist-title">{playlist.name}</h1>
            <div className="playlist-meta">
              <div className="playlist-song-count">
                {playlist.songs.length} {playlist.songs.length === 1 ? 'song' : 'songs'}
              </div>
            </div>
            {playlist.description && (
              <p className="playlist-description">{playlist.description}</p>
            )}
          </div>
        </div>

        {/* Songs List */}
        <div className="songs-section">
          <div className="songs-header">
            <svg className="songs-icon" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <h2 className="songs-title">Songs</h2>
          </div>

          {playlist.songs.length === 0 ? (
            <div className="empty-state">
              <svg className="empty-icon" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
              <h3 className="empty-title">No Songs Yet</h3>
              <p className="empty-description">This playlist is empty. Add some songs to get started!</p>
            </div>
          ) : (
            <div className="songs-list">
              {playlist.songs.map((song, index) => (
                <div
                  key={song._id}
                  className="song-item"
                  onClick={() => playSong(playlist.songs, index)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Play ${song.title} by ${song.artist}`}
                >
                  <div className="song-number">{index + 1}</div>
                  
                  {song.coverImage && (
                    <img
                      src={song.coverImage}
                      alt={song.title}
                      className="song-cover"
                    />
                  )}
                  
                  <div className="song-info">
                    <h3 className="song-title">{song.title}</h3>
                    <p className="song-artist">{song.artist || 'Unknown Artist'}</p>
                  </div>
                  
                  <svg className="play-icon" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
