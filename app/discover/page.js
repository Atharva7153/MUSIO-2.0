// app/discover/page.js
"use client";

import { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import './DiscoverPage.css';

export default function DiscoverPage() {
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [similarSongs, setSimilarSongs] = useState([]);
  const [genreRecommendations, setGenreRecommendations] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('pop');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { playlist, currentIndex, playSong, setIsPlaying } = usePlayer();
  
  // Get current song from playlist and currentIndex
  const currentSong = currentIndex >= 0 ? playlist[currentIndex] : null;
  
  const genres = [
    'pop', 'rock', 'electronic', 'hip hop', 'indie', 
    'jazz', 'classical', 'country', 'r&b', 'alternative'
  ];
  
  useEffect(() => {
    fetchDiscoveryData();
  }, []);
  
  useEffect(() => {
    if (selectedGenre) {
      fetchGenreRecommendations();
    }
  }, [selectedGenre]);
  
  const fetchDiscoveryData = async () => {
    try {
      setLoading(true);
      
      // Fetch trending songs
      const trendingResponse = await fetch('/api/recommendations?type=trending&limit=8');
      const trendingData = await trendingResponse.json();
      
      if (trendingData.success) {
        setTrendingSongs(trendingData.recommendations);
      }
      
      // If there's a current song, fetch similar songs
      if (currentSong?._id) {
        const similarResponse = await fetch(`/api/recommendations?basedOn=${currentSong._id}&limit=6`);
        const similarData = await similarResponse.json();
        
        if (similarData.success) {
          setSimilarSongs(similarData.recommendations);
        }
      }
      
    } catch (err) {
      console.error('Error fetching discovery data:', err);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchGenreRecommendations = async () => {
    try {
      const response = await fetch(`/api/recommendations?type=genre&genre=${selectedGenre}&limit=6`);
      const data = await response.json();
      
      if (data.success) {
        setGenreRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error('Error fetching genre recommendations:', err);
    }
  };
  
  const handleSongSelect = async (song) => {
    playSong([song], 0);
    
    // Record interaction for better recommendations
    try {
      await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          songId: song._id, 
          action: 'play_recommendation' 
        })
      });
    } catch (err) {
      console.error('Error recording interaction:', err);
    }
    
    // Refresh similar songs based on new selection
    setTimeout(() => {
      fetchDiscoveryData();
    }, 1000);
  };
  
  const formatDuration = (duration) => {
    if (!duration) return '0:00';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const SongCard = ({ song, reason }) => (
    <div 
      className="discovery-song-card"
      onClick={() => handleSongSelect(song)}
    >
      <div className="song-cover">
        {song.coverImage ? (
          <img src={song.coverImage} alt={song.title} />
        ) : (
          <div className="song-cover-placeholder">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
        )}
        <div className="play-overlay">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
      
      <div className="song-info">
        <h4 className="song-title">{song.title}</h4>
        <p className="song-artist">{song.artist}</p>
        <div className="song-meta">
          <span className="song-genre">{song.genre || 'Unknown'}</span>
          <span className="song-duration">{formatDuration(song.duration)}</span>
        </div>
        {reason && <div className="recommendation-reason">{reason}</div>}
      </div>
    </div>
  );
  
  if (loading) {
    return (
      <div className="discover-page">
        <div className="discover-header">
          <h1>Discover Music</h1>
          <p>Finding your next favorite song...</p>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="discover-page">
        <div className="discover-header">
          <h1>Discover Music</h1>
          <p className="error-message">{error}</p>
        </div>
        <button onClick={fetchDiscoveryData} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="discover-page page-content">
      <div className="discover-header">
        <h1>Discover Music</h1>
        <p>Personalized recommendations just for you</p>
      </div>
      
      {/* Trending Section */}
      <section className="discovery-section">
        <div className="section-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
            </svg>
            Trending Now
          </h2>
          <p>What everyone's listening to</p>
        </div>
        
        <div className="songs-grid">
          {trendingSongs.map(song => (
            <SongCard 
              key={song._id} 
              song={song} 
              reason={song.reason}
            />
          ))}
        </div>
      </section>
      
      {/* Similar to Current Song */}
      {currentSong && similarSongs.length > 0 && (
        <section className="discovery-section">
          <div className="section-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Similar to "{currentSong.title}"
            </h2>
            <p>More songs you might enjoy</p>
          </div>
          
          <div className="songs-grid">
            {similarSongs.map(song => (
              <SongCard 
                key={song._id} 
                song={song} 
                reason={song.reason}
              />
            ))}
          </div>
        </section>
      )}
      
      {/* Genre Exploration */}
      <section className="discovery-section">
        <div className="section-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Explore by Genre
          </h2>
          <p>Discover new sounds</p>
        </div>
        
        <div className="genre-selector">
          {genres.map(genre => (
            <button
              key={genre}
              className={`genre-pill ${selectedGenre === genre ? 'active' : ''}`}
              onClick={() => setSelectedGenre(genre)}
            >
              {genre.charAt(0).toUpperCase() + genre.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="songs-grid">
          {genreRecommendations.map(song => (
            <SongCard 
              key={song._id} 
              song={song} 
              reason={song.reason}
            />
          ))}
        </div>
      </section>
      
      {/* Quick Actions */}
      <section className="discovery-section">
        <div className="section-header">
          <h2>Quick Actions</h2>
        </div>
        
        <div className="quick-actions">
          <button 
            className="action-button"
            onClick={fetchDiscoveryData}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Refresh Recommendations
          </button>
          
          <button 
            className="action-button"
            onClick={() => window.location.href = '/playlists'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
            </svg>
            View My Playlists
          </button>
          
          <button 
            className="action-button"
            onClick={() => window.location.href = '/upload'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-3-7v-2h-4V9.5L7 13l4 3.5V15h4z"/>
            </svg>
            Upload Music
          </button>
        </div>
      </section>
    </div>
  );
}