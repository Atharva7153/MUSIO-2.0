"use client";
import { useEffect, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import "./AnalyticsPage.css";

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalPlaylists: 0,
    totalArtists: 0,
    totalPlaytime: 0,
    topSongs: [],
    topArtists: [],
    recentlyAdded: [],
    genreDistribution: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const { playSong } = usePlayer();

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Fetch playlists and songs data
        const [playlistsRes, songsRes] = await Promise.all([
          fetch("/api/playlists"),
          fetch("/api/songs/all")
        ]);

        const playlistsData = await playlistsRes.json();
        const songsData = await songsRes.json();

        const playlists = playlistsData.playlists || [];
        const songs = songsData.songs || [];

        // Calculate statistics
        const totalSongs = songs.length;
        const totalPlaylists = playlists.length;
        
        // Get unique artists
        const artists = [...new Set(songs.map(song => song.artist))];
        const totalArtists = artists.length;
        
        // Calculate total playtime in seconds
        const totalPlaytime = songs.reduce((total, song) => total + (song.duration || 0), 0);
        
        // Get top songs by playCount
        const topSongs = [...songs]
          .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
          .slice(0, 5);
        
        // Calculate top artists by song count
        const artistCounts = songs.reduce((acc, song) => {
          const artist = song.artist || "Unknown";
          acc[artist] = (acc[artist] || 0) + 1;
          return acc;
        }, {});
        
        const topArtists = Object.entries(artistCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        // Get recently added songs
        const recentlyAdded = [...songs]
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, 5);
        
        // Calculate genre distribution
        const genreCounts = songs.reduce((acc, song) => {
          const genre = song.genre || "Unknown";
          acc[genre] = (acc[genre] || 0) + 1;
          return acc;
        }, {});
        
        const genreDistribution = Object.entries(genreCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        
        setStats({
          totalSongs,
          totalPlaylists,
          totalArtists,
          totalPlaytime,
          topSongs,
          topArtists,
          recentlyAdded,
          genreDistribution
        });
        
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleSongPlay = (song) => {
    playSong([song], 0);
  };

  // Format time (seconds to MM:SS)
  const formatTime = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format total time (seconds to HH:MM:SS)
  const formatTotalTime = (seconds) => {
    if (!seconds) return "0h 0m";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>Music Analytics</h1>
        <p className="analytics-subtitle">Your library statistics and insights</p>
      </div>
      
      {isLoading ? (
        <div className="analytics-loading">
          <div className="analytics-spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      ) : (
        <div className="analytics-content">
          {/* Summary Cards */}
          <div className="analytics-summary">
            <div className="analytics-card">
              <div className="card-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
              <div className="card-content">
                <h3>{stats.totalSongs}</h3>
                <p>Total Songs</p>
              </div>
            </div>
            
            <div className="analytics-card">
              <div className="card-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                </svg>
              </div>
              <div className="card-content">
                <h3>{stats.totalPlaylists}</h3>
                <p>Playlists</p>
              </div>
            </div>
            
            <div className="analytics-card">
              <div className="card-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              </div>
              <div className="card-content">
                <h3>{stats.totalArtists}</h3>
                <p>Artists</p>
              </div>
            </div>
            
            <div className="analytics-card">
              <div className="card-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                  <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
              </div>
              <div className="card-content">
                <h3>{formatTotalTime(stats.totalPlaytime)}</h3>
                <p>Total Playtime</p>
              </div>
            </div>
          </div>
          
          {/* Top Songs Section */}
          <div className="analytics-section">
            <h2>Top Songs</h2>
            <div className="analytics-list">
              {stats.topSongs.length > 0 ? (
                stats.topSongs.map((song, index) => (
                  <div key={song._id} className="analytics-list-item" onClick={() => handleSongPlay(song)}>
                    <div className="item-rank">{index + 1}</div>
                    <img
                      src={song.coverImage || "/music-player.png"}
                      alt={song.title}
                      className="item-image"
                      onError={(e) => {e.target.src = "/music-player.png"}}
                    />
                    <div className="item-details">
                      <span className="item-title">{song.title}</span>
                      <span className="item-subtitle">{song.artist}</span>
                    </div>
                    <div className="item-meta">
                      <span className="item-count">{song.playCount || 0} plays</span>
                      <span className="item-duration">{formatTime(song.duration)}</span>
                    </div>
                    <button className="play-button" aria-label={`Play ${song.title}`}>
                      <svg viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-message">No play data available yet.</p>
              )}
            </div>
          </div>
          
          {/* Top Artists Section */}
          <div className="analytics-section">
            <h2>Top Artists</h2>
            <div className="analytics-grid">
              {stats.topArtists.length > 0 ? (
                stats.topArtists.map((artist, index) => (
                  <div key={artist.name} className="artist-card">
                    <div className="artist-rank">{index + 1}</div>
                    <div className="artist-avatar">
                      {artist.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="artist-details">
                      <span className="artist-name">{artist.name}</span>
                      <span className="artist-count">{artist.count} {artist.count === 1 ? 'song' : 'songs'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-message">No artist data available yet.</p>
              )}
            </div>
          </div>
          
          {/* Genre Distribution Section */}
          <div className="analytics-section">
            <h2>Genre Distribution</h2>
            <div className="genre-distribution">
              {stats.genreDistribution.length > 0 ? (
                stats.genreDistribution.map(genre => (
                  <div key={genre.name} className="genre-item">
                    <div className="genre-name">{genre.name}</div>
                    <div className="genre-bar-container">
                      <div 
                        className="genre-bar" 
                        style={{ 
                          width: `${(genre.count / stats.totalSongs) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <div className="genre-count">{genre.count}</div>
                  </div>
                ))
              ) : (
                <p className="empty-message">No genre data available yet.</p>
              )}
            </div>
          </div>
          
          {/* Recently Added Section */}
          <div className="analytics-section">
            <h2>Recently Added</h2>
            <div className="analytics-list">
              {stats.recentlyAdded.length > 0 ? (
                stats.recentlyAdded.map((song) => (
                  <div key={song._id} className="analytics-list-item" onClick={() => handleSongPlay(song)}>
                    <img
                      src={song.coverImage || "/music-player.png"}
                      alt={song.title}
                      className="item-image"
                      onError={(e) => {e.target.src = "/music-player.png"}}
                    />
                    <div className="item-details">
                      <span className="item-title">{song.title}</span>
                      <span className="item-subtitle">{song.artist}</span>
                    </div>
                    <div className="item-meta">
                      <span className="item-date">
                        {new Date(song.createdAt).toLocaleDateString()}
                      </span>
                      <span className="item-duration">{formatTime(song.duration)}</span>
                    </div>
                    <button className="play-button" aria-label={`Play ${song.title}`}>
                      <svg viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-message">No recently added songs.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}