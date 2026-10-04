"use client";
import { useState, useEffect, useRef } from "react";
import { usePlayer } from "../context/PlayerContext";
import Link from "next/link";
import { motion } from "framer-motion";
import { gsap } from "gsap";

export default function VisualizerPage() {
  const { playlist, currentIndex, isPlaying, nextSong, prevSong, setIsPlaying } = usePlayer();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const barsRef = useRef(null);

  const currentSong = currentIndex >= 0 ? playlist[currentIndex] : null;

  /* ── GSAP 28-Bar Audio Stage Spectrum ── */
  useEffect(() => {
    if (!barsRef.current) return;
    const bars = barsRef.current.querySelectorAll(".stage-bar");
    gsap.killTweensOf(bars);

    if (isPlaying) {
      bars.forEach((bar, i) => {
        gsap.to(bar, {
          scaleY: () => 0.18 + Math.random() * 0.82,
          duration: 0.24 + (i % 5) * 0.06,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });
    } else {
      gsap.to(bars, {
        scaleY: 0.15,
        duration: 0.4,
        ease: "power2.out",
      });
    }

    return () => gsap.killTweensOf(bars);
  }, [isPlaying, currentSong]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  if (!currentSong) {
    return (
      <div className="page-content" style={{ maxWidth: 680, margin: "0 auto", padding: "120px 20px" }}>
        <div className="empty-state">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <h3>Audio Stage Standby</h3>
          <p>Select any song from your library or playlists to activate the reactive visualizer stage.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/" className="btn-primary">
              Go to Library
            </Link>
            <Link href="/playlists" className="btn-secondary">
              Browse Playlists
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="page-content"
      style={{
        maxWidth: 1080,
        margin: "0 auto",
        padding: "108px 20px 80px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="surface-card"
        style={{
          width: "100%",
          padding: "clamp(28px, 5vw, 56px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 28,
        }}
      >
        <div className="rainbow-line" style={{ position: "absolute", top: 0, left: 0, right: 0 }} />

        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link href="/" className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.8rem" }}>
            ← Library
          </Link>
          <button
            onClick={toggleFullscreen}
            className="btn-secondary"
            style={{ padding: "8px 16px", fontSize: "0.8rem" }}
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen Stage"}
          </button>
        </div>

        {/* Album Art Turntable Stage */}
        <motion.div
          animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
          transition={
            isPlaying
              ? { duration: 18, repeat: Infinity, ease: "linear" }
              : { duration: 0.5 }
          }
          style={{
            width: "clamp(190px, 32vw, 260px)",
            height: "clamp(190px, 32vw, 260px)",
            borderRadius: "50%",
            padding: 8,
            background: "var(--brand-gradient)",
            backgroundSize: "250% 250%",
            boxShadow: "var(--shadow-hover)",
            position: "relative",
          }}
        >
          <img
            src={currentSong.coverImage || "/music-player.png"}
            alt={currentSong.title}
            onError={(e) => {
              e.target.src = "/music-player.png";
            }}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              objectFit: "cover",
              display: "block",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "var(--bg-card)",
              border: "3px solid var(--accent-primary)",
            }}
          />
        </motion.div>

        {/* Track Title & Artist */}
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
              fontWeight: 800,
              marginBottom: 6,
            }}
          >
            {currentSong.title}
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>
            {currentSong.artist || "Unknown Artist"}
          </p>
        </div>

        {/* 28-Bar GSAP Reactive Spectrum */}
        <div
          ref={barsRef}
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 5,
            height: 84,
            width: "100%",
            maxWidth: 580,
            padding: "0 12px",
          }}
        >
          {[...Array(28)].map((_, i) => (
            <span
              key={i}
              className="stage-bar rainbow-bar"
              style={{
                flex: 1,
                height: "100%",
                borderRadius: 99,
                transformOrigin: "bottom",
                transform: "scaleY(0.18)",
                display: "inline-block",
              }}
            />
          ))}
        </div>

        {/* Stage Transport */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={prevSong} className="btn-secondary">
            Prev
          </button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="btn-primary">
            {isPlaying ? "Pause Stage" : "Play Stage"}
          </button>
          <button onClick={nextSong} className="btn-secondary">
            Next
          </button>
        </div>
      </motion.div>
    </div>
  );
}