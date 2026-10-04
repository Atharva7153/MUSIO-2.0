"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePlayer } from "./context/PlayerContext";
import SplashScreen from "./components/SplashScreen";
import AddToPlaylistModal from "./components/AddToPlaylistModal";
import { motion } from "framer-motion";
import { gsap } from "gsap";

function SongCard({ song, onPlay, onAddToPlaylist, isCurrent, isPlaying, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ y: -5 }}
      onClick={onPlay}
      className="surface-card"
      style={{
        cursor: "pointer",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        borderColor: isCurrent ? "var(--accent-primary)" : undefined,
      }}
    >
      {/* Cover Art */}
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
            transition: "transform 0.4s ease",
          }}
        />

        {/* Floating Play Button Badge */}
        <div
          className="rainbow-bar"
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

        {/* Add to Playlist Quick Action */}
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

      {/* Metadata */}
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
  const { playSong, playlist: activeQueue, currentIndex, isPlaying } = usePlayer();

  const currentSong = currentIndex >= 0 ? activeQueue[currentIndex] : null;
  const heroRef = useRef(null);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  const orb3Ref = useRef(null);

  /* ── GSAP Ambient Orbs & Hero Entrance ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (orb1Ref.current) {
        gsap.to(orb1Ref.current, {
          x: 70,
          y: -40,
          scale: 1.12,
          duration: 8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
      if (orb2Ref.current) {
        gsap.to(orb2Ref.current, {
          x: -60,
          y: 50,
          scale: 0.92,
          duration: 10,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
      if (orb3Ref.current) {
        gsap.to(orb3Ref.current, {
          x: 45,
          y: 45,
          scale: 1.08,
          duration: 9,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }

      gsap.fromTo(
        ".gsap-hero-item",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.1,
          ease: "power3.out",
        }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  /* ── Fetch Playlists & Songs ── */
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
  const totalPlaylistTracks = playlists.reduce(
    (sum, pl) => sum + (pl.songs?.length || 0),
    0
  );

  return (
    <SplashScreen>
      <div className="page-content">
        {/* ── HERO SECTION ── */}
        <section
          ref={heroRef}
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "44px 20px 56px",
          }}
        >
          {/* GSAP Ambient Orbs (Solar Orange in Light Mode, Subtle Prismatic in Dark Mode) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              overflow: "hidden",
              zIndex: 0,
            }}
            aria-hidden="true"
          >
            <div
              ref={orb1Ref}
              style={{
                position: "absolute",
                top: "-10%",
                left: "8%",
                width: 420,
                height: 420,
                borderRadius: "50%",
                background: "var(--orb-1-color)",
                filter: "blur(95px)",
                opacity: "var(--orb-opacity)",
              }}
            />
            <div
              ref={orb2Ref}
              style={{
                position: "absolute",
                top: "15%",
                right: "6%",
                width: 380,
                height: 380,
                borderRadius: "50%",
                background: "var(--orb-2-color)",
                filter: "blur(95px)",
                opacity: "var(--orb-opacity)",
              }}
            />
            <div
              ref={orb3Ref}
              style={{
                position: "absolute",
                bottom: "-15%",
                left: "38%",
                width: 340,
                height: 340,
                borderRadius: "50%",
                background: "var(--orb-3-color)",
                filter: "blur(95px)",
                opacity: "var(--orb-opacity)",
              }}
            />
          </div>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              maxWidth: 1080,
              margin: "0 auto",
            }}
          >
            <div
              className="surface-card"
              style={{
                padding: "clamp(28px, 5vw, 52px)",
                background: "var(--bg-glass)",
                backdropFilter: "blur(24px)",
              }}
            >
              <div className="rainbow-line" style={{ position: "absolute", top: 0, left: 0, right: 0 }} />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 32,
                  alignItems: "center",
                }}
              >
                {/* Left Column: Hero Copy & Actions */}
                <div>
                  <div
                    className="gsap-hero-item"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 14px",
                      borderRadius: 999,
                      background: "var(--accent-soft)",
                      border: "1px solid var(--accent-border)",
                      fontFamily: "var(--font-display)",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      color: "var(--accent-primary)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      marginBottom: 18,
                    }}
                  >
                    <span
                      className="rainbow-bar"
                      style={{ width: 8, height: 8, borderRadius: "50%" }}
                    />
                    High-Fidelity Audio Player
                  </div>

                  <h1
                    className="gsap-hero-item"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
                      fontWeight: 800,
                      letterSpacing: "-0.04em",
                      lineHeight: 1.06,
                      marginBottom: 14,
                    }}
                  >
                    Pure Sound on{" "}
                    <span className="gradient-text">MUSIO 2.0</span>
                  </h1>

                  <p
                    className="gsap-hero-item"
                    style={{
                      fontSize: "0.98rem",
                      color: "var(--text-secondary)",
                      maxWidth: 480,
                      marginBottom: 26,
                      lineHeight: 1.65,
                    }}
                  >
                    Crafted by Atharva Sharma — stream your curated tracks and playlists with zero distractions, tactile controls, and dual Solar &amp; Prism themes.
                  </p>

                  <div
                    className="gsap-hero-item"
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    {allSongs.length > 0 && (
                      <button
                        onClick={() => playSong(allSongs, 0)}
                        className="btn-primary"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Play Library
                      </button>
                    )}
                    <Link href="/upload" className={allSongs.length > 0 ? "btn-secondary" : "btn-primary"}>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                      </svg>
                      Upload Music
                    </Link>
                    <Link href="/playlists" className="btn-secondary">
                      Browse Playlists
                    </Link>
                  </div>
                </div>

                {/* Right Column: Live Telemetry / Stats */}
                <div
                  className="gsap-hero-item"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      padding: 20,
                      borderRadius: 16,
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--text-muted)",
                        marginBottom: 6,
                      }}
                    >
                      Tracks Ready
                    </div>
                    <div
                      className="gradient-text"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "2.1rem",
                        fontWeight: 800,
                        lineHeight: 1.1,
                      }}
                    >
                      {allSongs.length || totalPlaylistTracks}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 20,
                      borderRadius: 16,
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--text-muted)",
                        marginBottom: 6,
                      }}
                    >
                      Playlists
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "2.1rem",
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        lineHeight: 1.1,
                      }}
                    >
                      {playlists.length}
                    </div>
                  </div>

                  <Link
                    href="/visualizer"
                    style={{
                      gridColumn: "span 2",
                      padding: "16px 20px",
                      borderRadius: 16,
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      textDecoration: "none",
                      transition: "border-color 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        className="rainbow-bar"
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#FFF",
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                        </svg>
                      </div>
                      <div>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "0.92rem",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          Launch Audio Stage
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>
                          Fullscreen reactive visualizer &amp; vinyl deck
                        </div>
                      </div>
                    </div>
                    <span style={{ color: "var(--accent-primary)", fontWeight: 700 }}>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── MAIN LIBRARY CONTENT ── */}
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px 64px" }}>
          {/* ── SONGS SECTION ── */}
          <section style={{ marginBottom: 56 }}>
            <div className="section-header">
              <h2 className="section-title">
                <span
                  className="rainbow-bar"
                  style={{ width: 10, height: 22, borderRadius: 4, display: "inline-block" }}
                />
                {showAllSongs ? `All Tracks (${allSongs.length})` : "Recently Added"}
              </h2>

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
                  className="rainbow-bar"
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
