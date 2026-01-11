"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePlayer } from "../../context/PlayerContext";
import AddToPlaylistModal from "../../components/AddToPlaylistModal";
import "./PlaylistPage.css";

export default function PlaylistPage() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [shuffledSongs, setShuffledSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playSong } = usePlayer();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [deletingSongId, setDeletingSongId] = useState(null);

  const openModal = (song) => {
    setSelectedSong(song);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSong(null);
  };

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
      .then(async (res) => {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await res.text().catch(() => '<unreadable body>');
          throw new Error(`Expected JSON but received non-JSON response (status ${res.status}): ${text.slice(0,200)}`);
        }
        return res.json();
      })
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
      <div className="playlist-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading playlist...</p>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="playlist-page">
        <div className="empty-state">
          <svg viewBox="0 0 24 24" className="empty-icon">
            <circle cx="12" cy="12" r="10"/>
            <path d="M16 16s-1.5-2-4-2-4 2-4 2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
          <h2>Playlist Not Found</h2>
          <p>The playlist you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const playAllSongs = () => {
    if (shuffledSongs.length > 0) {
      playSong(shuffledSongs, 0);
    }
  };

  const reshuffleSongs = () => {
    setShuffledSongs(shuffleArray([...playlist.songs]));
  };

  const handleDeleteSong = async (e, songId, songTitle) => {
    e.stopPropagation(); // Prevent song from playing when clicking delete
    
    const key = prompt(`To delete "${songTitle}", please enter the confirmation key:`);
    
    if (!key) {
      return; // User cancelled
    }
    
    setDeletingSongId(songId);
    
    try {
      const response = await fetch(`/api/songs/delete?id=${songId}&key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Song "${songTitle}" deleted successfully!`);
        // Refresh the playlist by fetching it again
        const playlistRes = await fetch(`/api/playlist/${id}`);
        const playlistData = await playlistRes.json();
        setPlaylist(playlistData.playlist);
        if (playlistData.playlist && playlistData.playlist.songs) {
          setShuffledSongs(shuffleArray(playlistData.playlist.songs));
        }
      } else {
        alert(`Failed to delete song: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting song:', error);
      alert('Failed to delete song. Please try again.');
    } finally {
      setDeletingSongId(null);
    }
  };

  return (
    <div className="playlist-page">
      {/* Hero Section */}
      <div className="playlist-hero">
        <div className="playlist-hero-backdrop" style={{ 
          backgroundImage: playlist.coverImage ? `url(${playlist.coverImage})` : 'var(--gradient-primary)' 
        }}></div>
        
        <div className="playlist-hero-content">
          <div className="playlist-cover-wrapper">
            <img
              src={playlist.coverImage || "/default-playlist.png"}
              alt={playlist.name}
              className="playlist-cover"
            />
            <button className="play-all-button" onClick={playAllSongs} disabled={shuffledSongs.length === 0}>
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>

          <div className="playlist-info">
            <div className="playlist-type-badge">Playlist</div>
            <h1 className="playlist-title">{playlist.name}</h1>
            
            {playlist.description && (
              <p className="playlist-description">{playlist.description}</p>
            )}
            
            <div className="playlist-meta">
              <div className="playlist-stats">
                <span className="song-count">{playlist.songs.length} {playlist.songs.length === 1 ? 'track' : 'tracks'}</span>
              </div>
              
              <div className="playlist-actions">
                <button className="action-button primary" onClick={playAllSongs} disabled={shuffledSongs.length === 0}>
                  <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  Play All
                </button>
                <button className="action-button secondary" onClick={reshuffleSongs} disabled={shuffledSongs.length <= 1}>
                  <svg viewBox="0 0 24 24">
                    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
                  </svg>
                  Shuffle
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tracks Section */}
      <div className="tracks-section">
        <div className="section-header">
          <h2>Tracks</h2>
          {shuffledSongs.length > 0 && 
            <span className="shuffle-indicator">Randomized order</span>
          }
        </div>

        {shuffledSongs.length === 0 ? (
          <div className="empty-tracks">
            <svg className="empty-icon" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <h3>No Tracks</h3>
            <p>This playlist doesn't have any tracks yet.</p>
          </div>
        ) : (
          <div className="tracks-list">
            <div className="track-header">
              <div className="track-number">#</div>
              <div className="track-title">Title</div>
              <div className="track-artist">Artist</div>
              <div className="track-duration">Duration</div>
              <div className="track-actions"></div>
            </div>
            
            {shuffledSongs.map((song, index) => (
              <div
                key={`${song._id}-${index}`}
                className="track-item"
                onClick={() => playSong(shuffledSongs, index)}
              >
                <div className="track-number">
                  <span className="number">{index + 1}</span>
                  <svg className="play-icon" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                
                <div className="track-title">
                  <div className="track-image">
                    {song.coverImage ? (
                      <img src={song.coverImage} alt={song.title} />
                    ) : (
                      <div className="track-image-placeholder">
                        <svg viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="title-text">{song.title}</span>
                </div>
                
                <div className="track-artist">{song.artist || 'Unknown Artist'}</div>
                <div className="track-duration">{song.duration || '3:45'}</div>
                
                <div className="track-actions">
                  <button
                    className="track-action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(song);
                    }}
                    title="Add to playlist"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                  </button>
                  <button 
                    className="track-action-button delete-button"
                    onClick={(e) => handleDeleteSong(e, song._id, song.title)}
                    disabled={deletingSongId === song._id}
                    title="Delete song"
                  >
                    {deletingSongId === song._id ? (
                      <svg viewBox="0 0 24 24" className="spinner">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {isModalOpen && <AddToPlaylistModal song={selectedSong} onClose={closeModal} />}
    </div>
  );
}
