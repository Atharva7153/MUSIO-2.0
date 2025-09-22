// app/playlist/[id]/page.js
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePlayer } from "../../context/PlayerContext";
import "./PlaylistPage.css";

export default function PlaylistPage() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [shuffledSongs, setShuffledSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playSong } = usePlayer();

  // Fisher-Yates shuffle algorithm for randomizing songs
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/playlist/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPlaylist(data.playlist);
        // Shuffle songs every time the playlist loads
        if (data.playlist && data.playlist.songs) {
          setShuffledSongs(shuffleArray(data.playlist.songs));
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching playlist:', error);
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return (
      <div className="playlist-page page-content">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          Loading playlist...
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="playlist-page page-content">
        <div className="playlist-container">
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M16 16s-1.5-2-4-2-4 2-4 2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </div>
            <h2 className="empty-title">Playlist Not Found</h2>
            <p className="empty-description">The playlist you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="playlist-page page-content">
      <div className="playlist-container">
        {/* Playlist Header */}
        <div className="playlist-header">
          <div className="playlist-header-content">
            <div className="playlist-cover-container">
              <img
                src={playlist.coverImage || "/default-playlist.png"}
                alt={playlist.name}
                className="playlist-cover"
              />
              <div className="cover-overlay">
                <svg className="play-icon-large" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
            <div className="playlist-info">
              <span className="playlist-badge">Playlist</span>
              <h1 className="playlist-title">{playlist.name}</h1>
              <div className="playlist-meta">
                <div className="playlist-song-count">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                  {playlist.songs.length} {playlist.songs.length === 1 ? 'song' : 'songs'}
                </div>
                <span className="shuffle-indicator">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="16,3 21,3 21,8"/>
                    <line x1="4" y1="20" x2="21" y2="3"/>
                    <polyline points="21,16 21,21 16,21"/>
                    <line x1="15" y1="15" x2="21" y2="21"/>
                    <line x1="4" y1="4" x2="9" y2="9"/>
                  </svg>
                  Shuffled
                </span>
              </div>
              {playlist.description && (
                <p className="playlist-description">{playlist.description}</p>
              )}
              <div className="playlist-actions">
                <button 
                  className="play-all-btn"
                  onClick={() => playSong(shuffledSongs, 0)}
                  disabled={shuffledSongs.length === 0}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Play All
                </button>
                <button 
                  className="shuffle-btn"
                  onClick={() => setShuffledSongs(shuffleArray(playlist.songs))}
                  disabled={playlist.songs.length === 0}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="16,3 21,3 21,8"/>
                    <line x1="4" y1="20" x2="21" y2="3"/>
                    <polyline points="21,16 21,21 16,21"/>
                    <line x1="15" y1="15" x2="21" y2="21"/>
                    <line x1="4" y1="4" x2="9" y2="9"/>
                  </svg>
                  Shuffle
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Songs List */}
        <div className="songs-section">
          <div className="songs-content">
            <div className="songs-header">
              <div>
                <svg className="songs-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                <h2 className="songs-title">Track List</h2>
              </div>
              <div className="songs-stats">
                {shuffledSongs.length} tracks • Randomized order
              </div>
            </div>

            {shuffledSongs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
                <h3 className="empty-title">No Songs Yet</h3>
                <p className="empty-description">This playlist is empty. Add some songs to get started!</p>
              </div>
            ) : (
              <div className="songs-list">
                {shuffledSongs.map((song, index) => (
                  <div
                    key={`${song._id}-${index}`}
                    className="song-item"
                    onClick={() => playSong(shuffledSongs, index)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Play ${song.title} by ${song.artist}`}
                  >
                    <div className="song-index">{index + 1}</div>
                    
                    <div className="song-cover-container">
                      {song.coverImage ? (
                        <img
                          src={song.coverImage}
                          alt={song.title}
                          className="song-cover"
                        />
                      ) : (
                        <div className="song-cover-placeholder">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                          </svg>
                        </div>
                      )}
                      <div className="song-cover-overlay">
                        <svg className="play-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                    
                    <div className="song-info">
                      <h3 className="song-title">{song.title}</h3>
                      <p className="song-artist">{song.artist || 'Unknown Artist'}</p>
                    </div>

                    <div className="song-duration">
                      {song.duration || '3:45'}
                    </div>
                    
                    <div className="song-actions">
                      <button className="action-btn" aria-label="Add to favorites">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                      </button>
                      <button className="action-btn" aria-label="More options">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="12" r="1"/>
                          <circle cx="12" cy="5" r="1"/>
                          <circle cx="12" cy="19" r="1"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
