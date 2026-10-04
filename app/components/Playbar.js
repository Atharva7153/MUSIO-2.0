"use client";
import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { motion, AnimatePresence } from "framer-motion";

function PlaybarReactiveSpectrum() {
  const wrapRef = useRef(null);
  const { subscribeAudio, isPlaying } = usePlayer();

  useEffect(() => {
    const unsub = subscribeAudio((audio) => {
      if (!wrapRef.current) return;
      const bars = wrapRef.current.children;
      const indices = [1, 3, 6, 10, 15, 22, 30, 40];
      for (let i = 0; i < bars.length; i++) {
        const v = isPlaying ? Math.max(0.18, audio.bins[indices[i]] || 0.18) : 0.18;
        bars[i].style.transform = `scaleY(${v.toFixed(2)})`;
      }
    });
    return unsub;
  }, [subscribeAudio, isPlaying]);

  return (
    <div
      ref={wrapRef}
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 2.5,
        height: 22,
        paddingBottom: 2,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {[...Array(8)].map((_, i) => (
        <span
          key={i}
          className="rainbow-bar"
          style={{
            width: 3,
            height: "100%",
            borderRadius: 99,
            transformOrigin: "bottom",
            transform: "scaleY(0.2)",
            display: "inline-block",
          }}
        />
      ))}
    </div>
  );
}

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
    audioElementRef,
  } = usePlayer();

  const localAudioRef = useRef(null);
  const progressRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [volume, setVolume] = useState(1);

  const currentSong = playlist[currentIndex];
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    audioElementRef.current = localAudioRef.current;
  }, [audioElementRef, currentSong]);

  useEffect(() => {
    if (localAudioRef.current) {
      if (isPlaying) {
        localAudioRef.current.play().catch(() => {});
      } else {
        localAudioRef.current.pause();
      }
    }
  }, [isPlaying, currentIndex]);

  useEffect(() => {
    if (localAudioRef.current) {
      localAudioRef.current.volume = volume;
    }
  }, [volume]);

  const handleTimeUpdate = () => {
    if (!isDragging && localAudioRef.current) {
      setCurrentTime(localAudioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (localAudioRef.current) {
      setDuration(localAudioRef.current.duration || 0);
    }
  };

  const seekTo = (e) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = ratio * duration;
    setCurrentTime(newTime);
    if (localAudioRef.current) localAudioRef.current.currentTime = newTime;
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!currentSong) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 14,
        left: 0,
        right: 0,
        zIndex: 950,
        display: "flex",
        justifyContent: "center",
        padding: "0 16px",
        pointerEvents: "none",
      }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 26, stiffness: 260 }}
        className="glass-pill"
        style={{
          pointerEvents: "auto",
          width: "100%",
          maxWidth: 1020,
          borderRadius: 22,
          padding: "10px 18px 12px",
          boxShadow: "var(--shadow-playbar)",
        }}
      >
        {/* Top Interactive Scrub Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              minWidth: 34,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatTime(currentTime)}
          </span>

          <div
            ref={progressRef}
            role="progressbar"
            aria-label="Song progress"
            aria-valuenow={currentTime}
            aria-valuemin={0}
            aria-valuemax={duration}
            onMouseDown={(e) => {
              setIsDragging(true);
              seekTo(e);
            }}
            onMouseMove={(e) => {
              if (isDragging) seekTo(e);
            }}
            onMouseUp={(e) => {
              if (isDragging) {
                seekTo(e);
                setIsDragging(false);
              }
            }}
            onMouseLeave={() => setIsDragging(false)}
            onTouchStart={(e) => {
              setIsDragging(true);
              seekTo(e);
            }}
            onTouchMove={(e) => {
              if (isDragging) seekTo(e);
            }}
            onTouchEnd={() => setIsDragging(false)}
            onClick={seekTo}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 999,
              background: "var(--bg-subtle)",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              className="rainbow-bar"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${progressPercent}%`,
                borderRadius: 999,
                transition: isDragging ? "none" : "width 0.15s linear",
              }}
            />
          </div>

          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              minWidth: 34,
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatTime(duration)}
          </span>
        </div>

        {/* Bottom Controls Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Left: Track Info + 8-bar Live Spectrum */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flex: 1,
              minWidth: 0,
            }}
          >
            <motion.img
              key={currentSong._id}
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={currentSong.coverImage || "/music-player.png"}
              alt={currentSong.title}
              onError={(e) => {
                e.target.src = "/music-player.png";
              }}
              className={isPlaying ? "music-reactive-pulse" : ""}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                objectFit: "cover",
                flexShrink: 0,
                border: "1px solid var(--border-subtle)",
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {currentSong.title}
              </div>
              <div
                style={{
                  fontSize: "0.76rem",
                  color: "var(--text-secondary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {currentSong.artist || "Unknown Artist"}
              </div>
            </div>
            <PlaybarReactiveSpectrum />
          </div>

          {/* Center: Transport Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsShuffling()}
              aria-label="Toggle shuffle"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "none",
                background: isShuffling ? "var(--accent-soft)" : "transparent",
                color: isShuffling ? "var(--accent-primary)" : "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="16,3 21,3 21,8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21,16 21,21 16,21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              onClick={prevSong}
              aria-label="Previous track"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
              </svg>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? "Pause" : "Play"}
              className={`rainbow-bar ${isPlaying ? "music-reactive-pulse" : ""}`}
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                border: "none",
                color: "#FFFFFF",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--glow-accent)",
              }}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              onClick={nextSong}
              aria-label="Next track"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsLooping()}
              aria-label="Toggle loop"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "none",
                background: isLooping ? "var(--accent-soft)" : "transparent",
                color: isLooping ? "var(--accent-primary)" : "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </motion.button>
          </div>

          {/* Right: Volume + Sleep Timer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 10,
              flex: 1,
              minWidth: 0,
            }}
          >
            <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg viewBox="0 0 24 24" fill="var(--text-secondary)" width="16" height="16">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                aria-label="Volume"
                style={{
                  width: 72,
                  accentColor: "var(--accent-primary)",
                  cursor: "pointer",
                }}
              />
            </div>

            {/* Sleep Timer Popup */}
            <div style={{ position: "relative" }}>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowSleepTimer((v) => !v)}
                aria-label="Sleep Timer"
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: "1px solid var(--border-subtle)",
                  background: sleepTimer ? "var(--accent-soft)" : "var(--bg-subtle)",
                  color: sleepTimer ? "var(--accent-primary)" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
                {sleepTimer && <span>{sleepTimer}m</span>}
              </motion.button>

              <AnimatePresence>
                {showSleepTimer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.96 }}
                    className="surface-card"
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 12px)",
                      right: 0,
                      padding: 16,
                      minWidth: 220,
                      background: "var(--bg-elevated)",
                      zIndex: 1000,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        marginBottom: 10,
                      }}
                    >
                      Sleep Timer
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={timerMinutes}
                        onChange={(e) => setTimerMinutes(Number(e.target.value))}
                        className="theme-input"
                        style={{ width: 72, padding: "6px 10px", textAlign: "center" }}
                      />
                      <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>minutes</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => {
                          startSleepTimer(timerMinutes);
                          setShowSleepTimer(false);
                        }}
                        className="btn-primary"
                        style={{ flex: 1, padding: "7px 12px", fontSize: "0.8rem" }}
                      >
                        Start
                      </button>
                      {sleepTimer && (
                        <button
                          onClick={() => {
                            cancelSleepTimer();
                            setShowSleepTimer(false);
                          }}
                          className="btn-secondary"
                          style={{ flex: 1, padding: "7px 12px", fontSize: "0.8rem" }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <audio
          ref={localAudioRef}
          src={currentSong.url}
          autoPlay
          loop={isLooping}
          onEnded={nextSong}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
      </motion.div>
    </div>
  );
}
