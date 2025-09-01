"use client";
import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import "./Playbar.css";

export default function Playbar() {
  const {
    playlist,
    currentIndex,
    nextSong,
    prevSong,
    isPlaying,
    setIsPlaying,
    isLooping,
    setIsLooping,
    isShuffling,
    setIsShuffling,
    sleepTimer,
    startSleepTimer,
    cancelSleepTimer,
  } = usePlayer();

  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(30); // default 30 min
  const [showSleepTimer, setShowSleepTimer] = useState(false); // popup toggle
  const [isDragging, setIsDragging] = useState(false);

  const currentSong = playlist[currentIndex];

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.play();
      else audioRef.current.pause();
    }
  }, [isPlaying, currentIndex]);

  const handleTimeUpdate = () => {
    if (!isDragging) setCurrentTime(audioRef.current.currentTime);
  };
  const handleLoadedMetadata = () => setDuration(audioRef.current.duration);

  // Seek handlers for dragging
  const handleSeekStart = (e) => {
    setIsDragging(true);
    handleSeekMove(e);
  };

  const handleSeekMove = (e) => {
    if (!isDragging) return;
    const rect = e.target.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let progress = (clientX - rect.left) / rect.width;
    progress = Math.max(0, Math.min(1, progress));
    setCurrentTime(progress * duration);
  };

  const handleSeekEnd = (e) => {
    if (!isDragging) return;
    handleSeekMove(e);
    audioRef.current.currentTime = currentTime;
    setIsDragging(false);
  };

  const handleSeekClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const progress = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = progress * duration;
    setCurrentTime(progress * duration);
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  if (!currentSong) return null;

  return (
    <div className="playbar">
      {/* Progress Bar */}
      <div className="progress-section">
        <span className="time-display">{formatTime(currentTime)}</span>
        <div
          className="progress-container"
          role="progressbar"
          aria-label="Song progress"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration}
          onMouseDown={handleSeekStart}
          onMouseMove={handleSeekMove}
          onMouseUp={handleSeekEnd}
          onMouseLeave={handleSeekEnd}
          onTouchStart={handleSeekStart}
          onTouchMove={handleSeekMove}
          onTouchEnd={handleSeekEnd}
          onClick={handleSeekClick} // still allow click
        >
          <div
            className="progress-bar"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        <span className="time-display">{formatTime(duration)}</span>
      </div>

      {/* Song Info */}
      <div className="song-info">
        <img
          src={currentSong.coverImage || "/default-song.png"}
          alt={currentSong.title}
          className="song-cover"
        />
        <div className="song-details">
          <h2 className="song-title">{currentSong.title}</h2>
          <p className="song-artist">{currentSong.artist || "Unknown Artist"}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        <button
          className={`control-button ${isShuffling ? "active" : ""}`}
          onClick={() => setIsShuffling(!isShuffling)}
          aria-label={isShuffling ? "Disable shuffle" : "Enable shuffle"}
        >
          <svg className="control-icon" viewBox="0 0 24 24">
            <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
          </svg>
        </button>

        <button className="control-button" onClick={prevSong} aria-label="Previous song">
          <svg className="control-icon" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        <button
          className={`control-button play-pause-button`}
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg className="play-pause-icon" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="play-pause-icon" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button className="control-button" onClick={nextSong} aria-label="Next song">
          <svg className="control-icon" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>

        <button
          className={`control-button ${isLooping ? "active" : ""}`}
          onClick={() => setIsLooping(!isLooping)}
          aria-label={isLooping ? "Disable loop" : "Enable loop"}
        >
          <svg className="control-icon" viewBox="0 0 24 24">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
          </svg>
        </button>

        {/* Sleep Timer Button */}
        <div style={{ position: "relative" }}>
          <button
            className={`control-button ${sleepTimer ? "active" : ""}`}
            onClick={() => setShowSleepTimer((prev) => !prev)}
            aria-label="Sleep Timer"
          >
            <svg className="control-icon" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-2h2zm0-4h-2V7h2z" />
            </svg>
          </button>

          {showSleepTimer && (
            <div
              style={{
                position: "absolute",
                bottom: "40px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "#222",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                zIndex: 50,
                minWidth: "200px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              <input
                type="number"
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(Number(e.target.value))}
                min={1}
                max={180}
                style={{
                  width: "60px",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  textAlign: "center",
                  fontSize: "0.9rem",
                }}
              />
              <span style={{ fontSize: "0.9rem" }}>min</span>
              <button
                onClick={() => {
                  startSleepTimer(timerMinutes);
                  setShowSleepTimer(false);
                }}
                style={{
                  padding: "0.25rem 0.5rem",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#4caf50",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Start
              </button>
              <button
                onClick={() => {
                  cancelSleepTimer();
                  setShowSleepTimer(false);
                }}
                style={{
                  padding: "0.25rem 0.5rem",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#f44336",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Remaining Time Display */}
      {sleepTimer && (
        <div
          style={{
            position: "absolute",
            bottom: "5px",
            right: "10px",
            fontSize: "0.85rem",
            color: "#fff",
            background: "rgba(0,0,0,0.4)",
            padding: "0.25rem 0.5rem",
            borderRadius: "4px",
          }}
        >
          {sleepTimer} min remaining
        </div>
      )}

      <audio
        ref={audioRef}
        src={currentSong.url}
        autoPlay
        loop={isLooping}
        onEnded={nextSong}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
    </div>
  );
}
