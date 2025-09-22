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
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [equalizerBands, setEqualizerBands] = useState(
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  );
  const [isExpanded, setIsExpanded] = useState(false);

  const currentSong = playlist[currentIndex];

  // Handle play/pause on current song
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.play();
      else audioRef.current.pause();
    }
  }, [isPlaying, currentIndex]);

  // Handle volume/mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Visualizer mount/unmount
  useEffect(() => {
    if (showVisualizer && canvasRef.current && audioRef.current) {
      startVisualizer();
    } else {
      stopVisualizer();
    }
    return () => stopVisualizer();
  }, [showVisualizer]);

  const handleTimeUpdate = () => {
    if (!isDragging) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () =>
    setDuration(audioRef.current.duration);

  // === Visualizer ===
  const startVisualizer = () => {
    if (!audioRef.current || !canvasRef.current) return;

    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audioRef.current);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      if (!showVisualizer) return;

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        const gradient = ctx.createLinearGradient(
          0,
          canvas.height,
          0,
          canvas.height - barHeight
        );
        gradient.addColorStop(0, "#6366f1");
        gradient.addColorStop(0.5, "#8b5cf6");
        gradient.addColorStop(1, "#ec4899");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const stopVisualizer = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  // === Equalizer ===
  const handleEqualizerChange = (bandIndex, value) => {
    const newBands = [...equalizerBands];
    newBands[bandIndex] = value;
    setEqualizerBands(newBands);
  };

  const resetEqualizer = () => {
    setEqualizerBands([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  };

  // === Seek handlers ===
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
    <div className={`playbar ${isExpanded ? "expanded" : ""}`}>
      {/* Visualizer */}
      {showVisualizer && (
        <div className="visualizer-container">
          <canvas
            ref={canvasRef}
            width={800}
            height={100}
            className="visualizer-canvas"
          />
        </div>
      )}

      {/* Main Player */}
      <div className="player-main">
        {/* Song Info */}
        <div className="song-info">
          <div className="song-cover-container">
            <img
              src={currentSong.coverImage || "/default-song.png"}
              alt={currentSong.title}
              className="song-cover"
            />
            <div className="cover-overlay">
              {isPlaying ? (
                <div className="playing-indicator">
                  <div className="bar"></div>
                  <div className="bar"></div>
                  <div className="bar"></div>
                </div>
              ) : (
                <svg className="play-icon" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>
          </div>
          <div className="song-details">
            <h3 className="song-title">{currentSong.title}</h3>
            <p className="song-artist">
              {currentSong.artist || "Unknown Artist"}
            </p>
          </div>
        </div>

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
            onClick={handleSeekClick}
          >
            <div
              className="progress-bar"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <span className="time-display">{formatTime(duration)}</span>
        </div>

        {/* Controls Row */}
        <div className="controls-row">
          {/* Main Controls */}
          <div className="main-controls">
            {/* Shuffle */}
            <button
              className={`control-button ${isShuffling ? "active" : ""}`}
              onClick={() => setIsShuffling(!isShuffling)}
              aria-label={isShuffling ? "Disable shuffle" : "Enable shuffle"}
            >
              <svg className="control-icon" viewBox="0 0 24 24">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
              </svg>
            </button>

            {/* Previous */}
            <button
              className="control-button"
              onClick={prevSong}
              aria-label="Previous song"
            >
              <svg className="control-icon" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              className="control-button play-pause-button"
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

            {/* Next */}
            <button
              className="control-button"
              onClick={nextSong}
              aria-label="Next song"
            >
              <svg className="control-icon" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>

            {/* Loop */}
            <button
              className={`control-button ${isLooping ? "active" : ""}`}
              onClick={() => setIsLooping(!isLooping)}
              aria-label={isLooping ? "Disable loop" : "Enable loop"}
            >
              <svg className="control-icon" viewBox="0 0 24 24">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
              </svg>
            </button>
          </div>

          {/* Right Controls */}
          <div className="right-controls">
            {/* Volume */}
            <div className="volume-control">
              <button
                className="control-button"
                onClick={() => setIsMuted(!isMuted)}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <svg className="control-icon" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : (
                  <svg className="control-icon" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="volume-slider"
                aria-label="Volume control"
              />
            </div>

            {/* Extra controls */}
            <div className="additional-controls">
              {/* Equalizer */}
              <button
                className={`control-button ${showEqualizer ? "active" : ""}`}
                onClick={() => setShowEqualizer(!showEqualizer)}
                aria-label="Equalizer"
              >
                <svg className="control-icon" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </button>

              {/* Visualizer */}
              <button
                className={`control-button ${showVisualizer ? "active" : ""}`}
                onClick={() => setShowVisualizer(!showVisualizer)}
                aria-label="Visualizer"
              >
                <svg className="control-icon" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>

              {/* Sleep timer */}
              <button
                className={`control-button ${showSleepTimer ? "active" : ""}`}
                onClick={() => setShowSleepTimer(!showSleepTimer)}
                aria-label="Sleep Timer"
              >
                <svg className="control-icon" viewBox="0 0 24 24">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-2h2zm0-4h-2V7h2z" />
                </svg>
              </button>

              {/* Expand */}
              <button
                className="control-button"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? "Collapse player" : "Expand player"}
              >
                <svg className="control-icon" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Equalizer Panel */}
      {showEqualizer && (
        <div className="equalizer-panel">
          <div className="equalizer-header">
            <h3>Equalizer</h3>
            <button onClick={resetEqualizer} className="reset-button">
              Reset
            </button>
          </div>
          <div className="equalizer-bands">
            {equalizerBands.map((band, index) => (
              <div key={index} className="equalizer-band">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={band}
                  onChange={(e) =>
                    handleEqualizerChange(index, parseInt(e.target.value))
                  }
                  className="equalizer-slider"
                  aria-label={`Equalizer band ${index + 1}`}
                />
                <span className="band-label">{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sleep Timer Panel */}
      {showSleepTimer && (
        <div className="sleep-timer-panel">
          <div className="timer-header">
            <h3>Sleep Timer</h3>
            <button
              onClick={() => setShowSleepTimer(false)}
              className="close-button"
            >
              <svg viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
          <div className="timer-controls">
            <input
              type="number"
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(Number(e.target.value))}
              min={1}
              max={180}
              className="timer-input"
            />
            <span className="timer-label">minutes</span>
            <div className="timer-buttons">
              <button
                onClick={() => {
                  startSleepTimer(timerMinutes);
                  setShowSleepTimer(false);
                }}
                className="timer-button start"
              >
                Start
              </button>
              <button
                onClick={() => {
                  cancelSleepTimer();
                  setShowSleepTimer(false);
                }}
                className="timer-button cancel"
              >
                Cancel
              </button>
            </div>
          </div>
          {sleepTimer && (
            <div className="timer-status">{sleepTimer} minutes remaining</div>
          )}
        </div>
      )}

      {/* Audio Element */}
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
