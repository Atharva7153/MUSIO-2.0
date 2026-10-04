"use client";
import { useState, useEffect, useRef } from "react";
import { usePlayer } from "../context/PlayerContext";
import { motion, AnimatePresence } from "framer-motion";

const VISUAL_MODES = [
  { id: "radial", label: "Radial Halo" },
  { id: "spectrum", label: "Studio Spectrum" },
  { id: "wave", label: "Harmonic Wave" },
  { id: "vortex", label: "Particle Vortex" },
];

export default function VisualizerPage() {
  const {
    playlist,
    currentIndex,
    isPlaying,
    playSong,
    nextSong,
    prevSong,
    setIsPlaying,
    subscribeAudio,
  } = usePlayer();

  const [mode, setMode] = useState("radial");
  const [librarySongs, setLibrarySongs] = useState([]);
  const [showTrackDrawer, setShowTrackDrawer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canvasRef = useRef(null);
  const modeRef = useRef(mode);
  const coverRef = useRef(null);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const currentSong = currentIndex >= 0 ? playlist[currentIndex] : null;

  // Fetch library songs so user can start playback directly from Visualizer page
  useEffect(() => {
    fetch("/api/songs/all")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.songs)) {
          setLibrarySongs(data.songs);
        }
      })
      .catch(() => {});
  }, []);

  const handlePlayToggle = () => {
    if (currentSong) {
      setIsPlaying(!isPlaying);
    } else if (librarySongs.length > 0) {
      playSong(librarySongs, 0);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* ── 60FPS Multi-Mode Canvas Audio Visualizer ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let phase = 0;

    // Initialize particles for vortex mode & ambient background
    const particles = Array.from({ length: 95 }, (_, i) => ({
      angle: (i / 95) * Math.PI * 2,
      radius: 40 + Math.random() * 360,
      speed: 0.003 + Math.random() * 0.008,
      size: 1.5 + Math.random() * 3,
      bin: i % 48,
    }));

    // Peak hold array for Studio Spectrum mode
    const peaks = new Float32Array(64);

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const unsubscribe = subscribeAudio((audio) => {
      if (!width || !height) return;

      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark" ||
        document.documentElement.classList.contains("dark");

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height * 0.46;
      phase += 0.035 + audio.energy * 0.09;

      // Update center vinyl scale
      if (coverRef.current) {
        const s = 1 + audio.bass * 0.14;
        coverRef.current.style.transform = `translate(-50%, -50%) scale(${s.toFixed(3)})`;
      }

      const getBarColor = (idx, total, alpha = 0.85) => {
        if (isDark) {
          const hue = ((idx / total) * 300 + phase * 22) % 360;
          return `hsla(${hue}, 92%, 62%, ${alpha})`;
        } else {
          const t = idx / total;
          const r = 255;
          const g = Math.round(70 + t * 90);
          const b = Math.round(t * 20);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
      };

      const activeMode = modeRef.current;

      /* ════════════════════════════════════════════════════════
         MODE 1: RADIAL HALO (Circular 64-Band Spectrum + Rings)
         ════════════════════════════════════════════════════════ */
      if (activeMode === "radial") {
        const baseRadius = Math.min(width, height) * 0.17;

        // Expanding bass shockwave rings
        for (let r = 0; r < 3; r++) {
          const ringR =
            baseRadius * (1.15 + r * 0.38) +
            audio.bass * (35 + r * 22) +
            Math.sin(phase * 1.5 + r) * 6;
          ctx.beginPath();
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = isDark
            ? `hsla(${(phase * 30 + r * 90) % 360}, 85%, 60%, ${0.12 + audio.bass * 0.22})`
            : `rgba(255, 85, 0, ${0.1 + audio.bass * 0.2})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // 72 Radial Bars around center core
        const numBars = 72;
        const maxBarLen = Math.min(width, height) * 0.22;

        for (let i = 0; i < numBars; i++) {
          const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2 + phase * 0.08;
          // Mirror frequency bins so circle is symmetrical
          const mirrorRatio = i < numBars / 2 ? i / (numBars / 2) : (numBars - i) / (numBars / 2);
          const binIdx = Math.min(63, Math.floor(mirrorRatio * 48));
          const val = audio.bins[binIdx] || 0.05;
          const barLen = 10 + val * maxBarLen;

          const x1 = cx + Math.cos(angle) * (baseRadius + 8);
          const y1 = cy + Math.sin(angle) * (baseRadius + 8);
          const x2 = cx + Math.cos(angle) * (baseRadius + 8 + barLen);
          const y2 = cy + Math.sin(angle) * (baseRadius + 8 + barLen);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = getBarColor(i, numBars, 0.35 + val * 0.65);
          ctx.lineWidth = 4.5;
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }

      /* ════════════════════════════════════════════════════════
         MODE 2: STUDIO SPECTRUM (64-Band Analyzer + Peak Hold)
         ════════════════════════════════════════════════════════ */
      if (activeMode === "spectrum") {
        const count = 48;
        const spanW = Math.min(width * 0.88, 920);
        const startX = (width - spanW) / 2;
        const slotW = spanW / count;
        const barW = Math.max(4, slotW * 0.64);
        const maxH = height * 0.42;
        const baselineY = cy + maxH * 0.42;

        for (let i = 0; i < count; i++) {
          const val = audio.bins[i] || 0.04;
          if (val > peaks[i]) peaks[i] = val;
          else peaks[i] = Math.max(0.04, peaks[i] - 0.008);

          const h = Math.max(6, val * maxH);
          const x = startX + i * slotW + (slotW - barW) / 2;
          const y = baselineY - h;

          // Main bar
          ctx.fillStyle = getBarColor(i, count, 0.88);
          ctx.beginPath();
          ctx.roundRect(x, y, barW, h, 6);
          ctx.fill();

          // Peak cap
          const peakY = baselineY - peaks[i] * maxH - 6;
          ctx.fillStyle = getBarColor(i, count, 1);
          ctx.beginPath();
          ctx.roundRect(x, peakY, barW, 3, 2);
          ctx.fill();

          // Subtle floor reflection
          ctx.fillStyle = getBarColor(i, count, 0.16);
          ctx.beginPath();
          ctx.roundRect(x, baselineY + 6, barW, h * 0.28, 4);
          ctx.fill();
        }
      }

      /* ════════════════════════════════════════════════════════
         MODE 3: HARMONIC WAVE (Multi-Layer Oscilloscope Ribbons)
         ════════════════════════════════════════════════════════ */
      if (activeMode === "wave") {
        const layers = 5;
        for (let l = 0; l < layers; l++) {
          ctx.beginPath();
          ctx.strokeStyle = getBarColor(l * 12, 60, 0.75 - l * 0.1);
          ctx.lineWidth = 3 - l * 0.35;

          const amp = (height * 0.22) * (0.25 + audio.bass * 1.15) * (1 - l * 0.12);
          const steps = 64;

          for (let s = 0; s <= steps; s++) {
            const norm = s / steps;
            const x = norm * width;
            const env = Math.sin(norm * Math.PI);
            const waveSample = audio.wave[s % 64] || 0;
            const harmonic =
              Math.sin(norm * Math.PI * (3 + l) + phase * (1.2 + l * 0.25)) * 0.55 +
              waveSample * 0.65;
            const y = cy + harmonic * amp * env;

            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      /* ════════════════════════════════════════════════════════
         MODE 4: PARTICLE VORTEX (Bass-Reactive Orbital Field)
         ════════════════════════════════════════════════════════ */
      if (activeMode === "vortex") {
        const maxR = Math.min(width, height) * 0.45;
        particles.forEach((p, idx) => {
          const binVal = audio.bins[p.bin] || 0.1;
          p.angle += p.speed * (1 + audio.energy * 3.5);
          const dynamicR =
            ((p.radius + phase * 18) % maxR) + audio.bass * 38;

          const px = cx + Math.cos(p.angle) * dynamicR;
          const py = cy + Math.sin(p.angle) * dynamicR;
          const r = p.size * (0.8 + binVal * 2.4);

          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fillStyle = getBarColor(idx, particles.length, 0.45 + binVal * 0.55);
          ctx.fill();
        });
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener("resize", resize);
    };
  }, [subscribeAudio]);

  return (
    <div
      className="page-content"
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Full-Viewport 60fps Audio Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
        }}
      />

      {/* Center Rotating Vinyl Core (Visible in Radial & Vortex modes) */}
      {(mode === "radial" || mode === "vortex") && (
        <div
          ref={coverRef}
          onClick={handlePlayToggle}
          title={isPlaying ? "Click to Pause" : "Click to Play"}
          style={{
            position: "absolute",
            top: "46%",
            left: "50%",
            transform: "translate(-50%, -50%) scale(1)",
            width: "clamp(130px, 22vw, 190px)",
            height: "clamp(130px, 22vw, 190px)",
            borderRadius: "50%",
            padding: 5,
            background: "var(--brand-gradient)",
            backgroundSize: "250% 250%",
            boxShadow: "var(--shadow-hover)",
            cursor: "pointer",
            zIndex: 2,
            willChange: "transform",
          }}
        >
          <motion.img
            animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
            transition={
              isPlaying
                ? { duration: 16, repeat: Infinity, ease: "linear" }
                : { duration: 0.4 }
            }
            src={currentSong?.coverImage || "/music-player.png"}
            alt={currentSong?.title || "MUSIO Stage"}
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
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--bg-card)",
              border: "3px solid var(--accent-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-primary)",
              fontSize: "0.7rem",
            }}
          >
            {isPlaying ? "❚❚" : "▶"}
          </div>
        </div>
      )}

      {/* Top HUD Bar: Mode Switcher + Track Drawer Toggle + Fullscreen */}
      <div
        style={{
          position: "relative",
          zIndex: 5,
          maxWidth: 1080,
          width: "100%",
          margin: "0 auto",
          padding: "16px 20px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {/* Visual Mode Pills */}
        <div
          className="glass-pill"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: 5,
            borderRadius: 999,
            flexWrap: "wrap",
          }}
        >
          {VISUAL_MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={active ? "rainbow-bar" : ""}
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: active ? undefined : "transparent",
                  color: active ? "#FFFFFF" : "var(--text-secondary)",
                  fontFamily: "var(--font-display)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "color 0.2s ease",
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Right HUD Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setShowTrackDrawer((v) => !v)}
            className="btn-secondary"
            style={{ padding: "8px 16px", fontSize: "0.82rem" }}
          >
            🎵 {showTrackDrawer ? "Hide Tracks" : `Select Track (${librarySongs.length})`}
          </button>
          <button
            onClick={toggleFullscreen}
            className="btn-secondary"
            style={{ padding: "8px 16px", fontSize: "0.82rem" }}
          >
            {isFullscreen ? "Exit Fullscreen" : "⛶ Fullscreen"}
          </button>
        </div>
      </div>

      {/* Bottom Stage Info & Quick Transport */}
      <div
        style={{
          position: "relative",
          zIndex: 5,
          maxWidth: 720,
          width: "100%",
          margin: "0 auto",
          padding: "0 20px 32px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.35rem, 3vw, 2rem)",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
            }}
          >
            {currentSong ? currentSong.title : "MUSIO 2.0 Live Stage"}
          </div>
          <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
            {currentSong
              ? currentSong.artist || "Unknown Artist"
              : librarySongs.length > 0
              ? "Click Play below to launch reactive audio"
              : "Upload a track to start"}
          </div>
        </div>

        {!currentSong && librarySongs.length > 0 && (
          <button onClick={handlePlayToggle} className="btn-primary">
            ▶ Play Library on Stage
          </button>
        )}
      </div>

      {/* Slide-Over Track Selector Drawer */}
      <AnimatePresence>
        {showTrackDrawer && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="surface-card"
            style={{
              position: "fixed",
              top: 96,
              right: 20,
              bottom: 124,
              width: "min(360px, calc(100vw - 40px))",
              zIndex: 980,
              background: "var(--bg-glass-heavy)",
              backdropFilter: "blur(24px)",
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700 }}>
                Stage Queue ({librarySongs.length})
              </h3>
              <button
                onClick={() => setShowTrackDrawer(false)}
                style={{
                  border: "none",
                  background: "var(--bg-subtle)",
                  color: "var(--text-secondary)",
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {librarySongs.map((song, idx) => {
                const active = currentSong?._id === song._id;
                return (
                  <div
                    key={song._id || idx}
                    onClick={() => playSong(librarySongs, idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 10,
                      cursor: "pointer",
                      background: active ? "var(--accent-soft)" : "var(--bg-subtle)",
                      border: `1px solid ${active ? "var(--accent-primary)" : "transparent"}`,
                    }}
                  >
                    <img
                      src={song.coverImage || "/music-player.png"}
                      alt={song.title}
                      onError={(e) => {
                        e.target.src = "/music-player.png";
                      }}
                      style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "0.86rem",
                          fontWeight: 700,
                          color: active ? "var(--accent-primary)" : "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {song.title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.74rem",
                          color: "var(--text-secondary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {song.artist || "Unknown Artist"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}