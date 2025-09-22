// app/visualizer/page.js
"use client";

import { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import Link from 'next/link';
import './VisualizerPage.css';

export default function VisualizerPage() {
  const { playlist, currentIndex, isPlaying, nextSong, prevSong, setIsPlaying } = usePlayer();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const currentSong = currentIndex >= 0 ? playlist[currentIndex] : null;

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls after inactivity
  useEffect(() => {
    let timeout;
    
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      
      if (isFullscreen) {
        timeout = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [isFullscreen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevSong();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextSong();
          break;
        case 'F11':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isFullscreen]);

  if (!currentSong) {
    return (
      <div className="visualizer-page no-song">
        <div className="no-song-content">
          <div className="no-song-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <h1>No Music Playing</h1>
          <p>Start playing a song to see the visualizer in action</p>
          <div className="no-song-actions">
            <Link href="/" className="action-button primary">
              Go to Homepage
            </Link>
            <Link href="/discover" className="action-button secondary">
              Discover Music
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`visualizer-page page-content ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Background Visualizer */}
      <div className="background-visualizer">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'white',
          fontSize: '1.5rem'
        }}>
          Visualizer has been removed
        </div>
      </div>

      {/* Main Visualizer */}
      <div className="main-visualizer">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'white',
          fontSize: '2rem'
        }}>
          Music Player Only
        </div>
      </div>

      {/* Controls Overlay */}
      <div className={`controls-overlay ${showControls ? 'visible' : 'hidden'}`}>
        {/* Top Bar */}
        <div className="top-bar">
          <div className="song-info-expanded">
            {currentSong.coverImage && (
              <img src={currentSong.coverImage} alt={currentSong.title} className="song-cover-large" />
            )}
            <div className="song-details">
              <h1 className="song-title-large">{currentSong.title}</h1>
              <p className="song-artist-large">{currentSong.artist}</p>
              {currentSong.genre && (
                <span className="song-genre-large">{currentSong.genre}</span>
              )}
            </div>
          </div>

          <div className="top-controls">
            <button 
              className="control-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen (F11)" : "Enter Fullscreen (F11)"}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                {isFullscreen ? (
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                ) : (
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                )}
              </svg>
            </button>

            <Link href="/" className="control-btn" title="Back to App">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </Link>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="bottom-controls">
          <div className="playback-controls">
            <button 
              className="control-btn" 
              onClick={prevSong}
              title="Previous Song (←)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <button 
              className="control-btn play-pause" 
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            <button 
              className="control-btn" 
              onClick={nextSong}
              title="Next Song (→)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          {/* Keyboard Shortcuts Info */}
          <div className="shortcuts-info">
            <span>Space: Play/Pause</span>
            <span>←/→: Prev/Next</span>
            <span>F11: Fullscreen</span>
            <span>ESC: Exit</span>
          </div>
        </div>
      </div>

      {/* Immersive Mode Toggle */}
      <button 
        className={`immersive-toggle ${showControls ? 'visible' : 'hidden'}`}
        onClick={() => setShowControls(!showControls)}
        title="Toggle Controls"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </button>
    </div>
  );
}