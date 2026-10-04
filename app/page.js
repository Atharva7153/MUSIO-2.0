"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePlayer } from "./context/PlayerContext";
import SplashScreen from "./components/SplashScreen";
import AddToPlaylistModal from "./components/AddToPlaylistModal";
import { motion } from "framer-motion";
import { gsap } from "gsap";

/* ── 60fps Music-Reactive Sonic Canvas behind Hero Title ── */
function HeroSonicCanvas() {
  const canvasRef = useRef(null);
  const { subscribeAudio, isPlaying } = usePlayer();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let phase = 0;

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
      ctx.clearRect(0, 0, width, height);

      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark" ||
        document.documentElement.classList.contains("dark");

      phase += isPlaying ? 0.045 + audio.energy * 0.08 : 0.012;
      const cy = height * 0.52;

      const barCount = 48;
      const totalBarSpan = Math.min(width * 0.82, 760);
      const startX = (width - totalBarSpan) / 2;
      const step = totalBarSpan / barCount;

      for (let i = 0; i < barCount; i++) {
        const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2);
        const binIdx = Math.min(63, Math.floor(distFromCenter * 42));
        const val = audio.bins[binIdx] || 0.04;
        const barH = Math.max(4, val * (height * 0.58) * (1 - distFromCenter * 0.35));
        const x = startX + i * step + step * 0.5;

        if (isDark) {
          const hue = (i * 5 + phase * 25) % 360;
          ctx.fillStyle = `hsla(${hue}, 90%, 62%, ${0.16 + val * 0.38})`;
        } else {
          ctx.fillStyle = `rgba(255, 85, 0, ${0.12 + val * 0.34})`;
        }

        ctx.beginPath();
        ctx.roundRect(x - 2, cy - barH / 2, 4, barH, 99);
        ctx.fill();
      }

      const waves = isDark
        ? [
            { color: "rgba(255, 85, 0, 0.42)", amp: 34, freq: 0.008, speed: 1.0 },
            { color: "rgba(168, 85, 247, 0.38)", amp: 26, freq: 0.011, speed: -1.3 },
            { color: "rgba(6, 182, 212, 0.34)", amp: 20, freq: 0.014, speed: 0.8 },
          ]
        : [
            { color: "rgba(255, 85, 0, 0.38)", amp: 32, freq: 0.008, speed: 1.0 },
            { color: "rgba(255, 136, 0, 0.26)", amp: 24, freq: 0.011, speed: -1.2 },
            { color: "rgba(255, 59, 48, 0.18)", amp: 18, freq: 0.014, speed: 0.8 },
          ];

      waves.forEach((w, idx) => {
        ctx.beginPath();
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 2;

        const dynamicAmp = w.amp * (0.22 + audio.bass * 1.45);
        for (let x = 0; x <= width; x += 6) {
          const normX = x / width;
          const envelope = Math.sin(normX * Math.PI);
          const y =
            cy +
            Math.sin(x * w.freq + phase * w.speed + idx) * dynamicAmp * envelope +
            Math.cos(x * w.freq * 2.1 - phase * 0.7) * (dynamicAmp * 0.35) * envelope;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
    });

    return () => {
      unsubscribe();
      window.removeEventListener("resize", resize);
    };
  }, [subscribeAudio, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

/* ── Mini Reactive Spectrum Overlay for Playing Card ── */
function CardReactiveMiniBars({ active }) {
  const wrapRef = useRef(null);
  const { subscribeAudio } = usePlayer();

  useEffect(() => {
    if (!active) return;
    const unsub = subscribeAudio((audio) => {
      if (!wrapRef.current) return;
      const bars = wrapRef.current.children;
      const indices = [2, 6, 12, 18, 26];
      for (let i = 0; i < bars.length; i++) {
        const v = Math.max(0.18, audio.bins[indices[i]] || 0.2);
        bars[i].style.transform = `scaleY(${v.toFixed(2)})`;
      }
    });
    return unsub;
  }, [active, subscribeAudio]);

  if (!active) return null;

  return (
    <div
      ref={wrapRef}
      style={{
        position: "absolute",
        bottom: 12,
        left: 12,
        display: "flex",
        alignItems: "flex-end",
        gap: 3,
        height: 20,
        padding: "4px 7px",
        borderRadius: 8,
        background: "rgba(10, 10, 14, 0.72)",
        backdropFilter: "blur(6px)",
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="rainbow-bar"
          style={{
            width: 3,
            height: "100%",
            borderRadius: 99,
            transformOrigin: "bottom",
            transform: "scaleY(0.25)",
            display: "inline-block",
          }}
        />
      ))}
    </div>
  );
}

function SongCard({ song, onPlay, onAddToPlaylist, isCurrent, isPlaying, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ y: -5 }}
      onClick={onPlay}
      className={`surface-card ${isCurrent && isPlaying ? "playing-card" : ""}`}
      style={{
        cursor: "pointer",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          borderRadius: 12,
          overflow: "hidden",
          background: "var(--bg-subtle)",
        }}
      >
        <img
          src={song.coverImage || "/music-player.png"}
          alt={song.title}
          onError={(e) => {
            e.target.src = "/music-player.png";
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: isCurrent && isPlaying ? "scale(var(--music-scale, 1))" : "scale(1)",
            transition: "transform 0.1s linear",
          }}
        />

        <CardReactiveMiniBars active={isCurrent && isPlaying} />

        <div
          className={`rainbow-bar ${isCurrent && isPlaying ? "music-reactive-pulse" : ""}`}
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
          }}
        >
          {isCurrent && isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToPlaylist(song);
          }}
          title="Add to playlist"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 30,
            height: 30,
            borderRadius: 9,
            border: "1px solid rgba(255,255,255,0.22)",
            background: "rgba(15, 15, 18, 0.65)",
            backdropFilter: "blur(8px)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>
      </div>

      <div style={{ minWidth: 0, padding: "0 2px 2px" }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.94rem",
            fontWeight: 700,
            color: isCurrent ? "var(--accent-primary)" : "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: 2,
          }}
        >
          {song.title}
        </h3>
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {song.artist || "Unknown Artist"}
        </p>
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const [playlists, setPlaylists] = useState([]);
  const [allSongs, setAllSongs] = useState([]);
  const [showAllSongs, setShowAllSongs] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modalSong, setModalSong] = useState(null);
  const { playSong, playlist: activeQueue, currentIndex, isPlaying, subscribeAudio } = usePlayer();

  const currentSong = currentIndex >= 0 ? activeQueue[currentIndex] : null;
  const heroTitleRef = useRef(null);
  const heroGlowRef = useRef(null);

  useEffect(() => {
    if (!heroTitleRef.current) return;
    gsap.fromTo(
      heroTitleRef.current,
      { y: 28, opacity: 0, scale: 0.94 },
      { y: 0, opacity: 1, scale: 1, duration: 0.85, ease: "power3.out" }
    );
  }, []);

  useEffect(() => {
    const unsub = subscribeAudio((audio) => {
      if (heroTitleRef.current) {
        const s = 1 + audio.bass * 0.055;
        heroTitleRef.current.style.transform = `scale(${s.toFixed(4)})`;
      }
      if (heroGlowRef.current) {
        const opacity = 0.14 + audio.energy * 0.42;
        const scale = 0.95 + audio.bass * 0.35;
        heroGlowRef.current.style.opacity = opacity.toFixed(3);
        heroGlowRef.current.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      }
    });
    return unsub;
  }, [subscribeAudio]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plRes, snRes] = await Promise.all([
          fetch("/api/playlists"),
          fetch("/api/songs/all"),
        ]);
        const parseJsonSafe = async (res) => {
          const ct = res.headers.get("content-type") || "";
          if (!ct.includes("application/json")) return {};
          return res.json();
        };
        const [plData, snData] = await Promise.all([
          parseJsonSafe(plRes),
          parseJsonSafe(snRes),
        ]);
        setPlaylists(plData.playlists || []);
        setAllSongs(snData.songs || []);
      } catch (err) {
        console.error("Error loading library:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const displayedSongs = showAllSongs ? allSongs : allSongs.slice(0, 8);

  return (
    <SplashScreen>
      <div className="page-content">
        {/* ── MINIMAL MUSIC-REACTIVE HERO SECTION: ONLY "MUSIO 2.0" ── */}
        <section
          style={{
            position: "relative",
            height: "clamp(240px, 38vh, 360px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          <div
            ref={heroGlowRef}
            className="rainbow-bar"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "clamp(260px, 45vw, 520px)",
              height: "clamp(120px, 20vw, 220px)",
              borderRadius: "50%",
              filter: "blur(85px)",
              opacity: 0.16,
              transform: "translate(-50%, -50%) scale(1)",
              pointerEvents: "none",
            }}
          />

          <HeroSonicCanvas />

          <h1
            ref={heroTitleRef}
            style={{
              position: "relative",
              zIndex: 2,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(3.2rem, 10vw, 7.2rem)",
              fontWeight: 800,
              letterSpacing: "-0.055em",
              lineHeight: 1,
              color: "var(--text-primary)",
              textAlign: "center",
              display: "flex",
              alignItems: "baseline",
              justifyContent: "center",
              gap: "0.18em",
              willChange: "transform",
            }}
          >
            <span>MUSIO</span>
            <span className="gradient-text">2.0</span>
          </h1>
        </section>

        {/* ── MAIN LIBRARY CONTENT ── */}
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "8px 20px 64px" }}>
          {/* ── SONGS SECTION ── */}
          <section style={{ marginBottom: 56 }}>
            <div className="section-header" style={{ flexWrap: "wrap", gap: 12 }}>
              <h2 className="section-title">
                <span
                  className="rainbow-bar music-reactive-pulse"
                  style={{ width: 10, height: 22, borderRadius: 4, display: "inline-block" }}
                />
                {showAllSongs ? `All Tracks (${allSongs.length})` : "Recently Added"}
              </h2>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Link href="/constellation" className="view-all-link">
                  ✦ Fullscreen Galaxy →
                </Link>

                {allSongs.length > 8 && (
                  <button
                    onClick={() => setShowAllSongs((v) => !v)}
                    className="view-all-link"
                    style={{ border: "none", cursor: "pointer" }}
                  >
                    {showAllSongs ? "Show Less" : `View All (${allSongs.length})`}
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))",
                  gap: 18,
                }}
              >
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="surface-card" style={{ padding: 12 }}>
                    <div className="skeleton" style={{ aspectRatio: "1/1", marginBottom: 12 }} />
                    <div className="skeleton" style={{ height: 14, width: "75%", marginBottom: 6 }} />
                    <div className="skeleton" style={{ height: 11, width: "50%" }} />
                  </div>
                ))}
              </div>
            ) : displayedSongs.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))",
                  gap: 18,
                }}
              >
                {displayedSongs.map((song, idx) => (
                  <SongCard
                    key={song._id || idx}
                    song={song}
                    index={idx}
                    isCurrent={currentSong?._id === song._id}
                    isPlaying={isPlaying}
                    onPlay={() => playSong(allSongs, idx)}
                    onAddToPlaylist={(s) => setModalSong(s)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
                <h3>No songs in your library yet</h3>
                <p>Upload your first audio file or import from YouTube to start listening.</p>
                <Link href="/upload" className="btn-primary">
                  Upload Music
                </Link>
              </div>
            )}
          </section>

          {/* ── PLAYLISTS SECTION ── */}
          <section>
            <div className="section-header">
              <h2 className="section-title">
                <span
                  className="rainbow-bar music-reactive-pulse"
                  style={{ width: 10, height: 22, borderRadius: 4, display: "inline-block" }}
                />
                Your Playlists
              </h2>
              <Link href="/playlists" className="view-all-link">
                View All →
              </Link>
            </div>

            {isLoading ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 16,
                }}
              >
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="surface-card" style={{ padding: 14, display: "flex", gap: 14 }}>
                    <div className="skeleton" style={{ width: 64, height: 64, borderRadius: 12, flexShrink: 0 }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
                      <div className="skeleton" style={{ height: 15, width: "70%" }} />
                      <div className="skeleton" style={{ height: 12, width: "45%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : playlists.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                {playlists.slice(0, 6).map((pl, idx) => (
                  <motion.div
                    key={pl._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ y: -3 }}
                  >
                    <Link
                      href={`/playlist/${pl._id}`}
                      className="surface-card"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: 14,
                        textDecoration: "none",
                      }}
                    >
                      <img
                        src={pl.coverImage || "/playlist.png"}
                        alt={pl.name}
                        onError={(e) => {
                          e.target.src = "/playlist.png";
                        }}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 12,
                          objectFit: "cover",
                          flexShrink: 0,
                          border: "1px solid var(--border-subtle)",
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "0.98rem",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            marginBottom: 4,
                          }}
                        >
                          {pl.name}
                        </h3>
                        <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                          {pl.songs?.length || 0} {pl.songs?.length === 1 ? "track" : "tracks"}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (pl.songs?.length > 0) playSong(pl.songs, 0);
                        }}
                        disabled={!pl.songs?.length}
                        aria-label={`Play ${pl.name}`}
                        className="rainbow-bar"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          border: "none",
                          color: "#FFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: pl.songs?.length ? "pointer" : "not-allowed",
                          opacity: pl.songs?.length ? 1 : 0.35,
                          flexShrink: 0,
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                  </svg>
                </div>
                <h3>No playlists yet</h3>
                <p>Create your first playlist when uploading a track.</p>
                <Link href="/upload" className="btn-primary">
                  Create Playlist
                </Link>
              </div>
            )}
          </section>
        </div>

        {modalSong && (
          <AddToPlaylistModal song={modalSong} onClose={() => setModalSong(null)} />
        )}
      </div>
    </SplashScreen>
  );
}
