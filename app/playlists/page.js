"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePlayer } from "../context/PlayerContext";
import { motion } from "framer-motion";

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { playSong } = usePlayer();

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const res = await fetch("/api/playlists");
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) throw new Error("Non-JSON");
        const data = await res.json();
        setPlaylists(data.playlists || []);
      } catch (err) {
        console.error("Failed to fetch playlists:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlaylists();
  }, []);

  const filtered = playlists.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-content" style={{ maxWidth: 1080, margin: "0 auto", padding: "110px 20px 72px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 28,
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--accent-primary)",
              marginBottom: 6,
              fontFamily: "var(--font-display)",
            }}
          >
            Curated Collections
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.9rem, 4vw, 2.75rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            Your <span className="gradient-text">Playlists</span>
          </h1>
        </div>

        <Link href="/upload" className="btn-primary">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Create Playlist
        </Link>
      </div>

      {/* Filter Input */}
      <div style={{ maxWidth: 380, marginBottom: 32 }}>
        <input
          type="text"
          placeholder="Filter playlists by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="theme-input"
        />
      </div>

      {/* Playlists Grid */}
      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          {[...Array(6)].map((_, i) => (
            <div key={i} className="surface-card" style={{ padding: 14 }}>
              <div className="skeleton" style={{ aspectRatio: "1/1", marginBottom: 14 }} />
              <div className="skeleton" style={{ height: 16, width: "70%", marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 12, width: "40%" }} />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          {filtered.map((pl, index) => (
            <motion.div
              key={pl._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              className="surface-card"
              style={{
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <Link
                href={`/playlist/${pl._id}`}
                style={{
                  position: "relative",
                  aspectRatio: "1/1",
                  borderRadius: 12,
                  overflow: "hidden",
                  display: "block",
                  background: "var(--bg-subtle)",
                }}
              >
                <img
                  src={pl.coverImage || "/playlist.png"}
                  alt={pl.name}
                  onError={(e) => {
                    e.target.src = "/playlist.png";
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
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
                    position: "absolute",
                    bottom: 10,
                    right: 10,
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    border: "none",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: pl.songs?.length ? "pointer" : "not-allowed",
                    opacity: pl.songs?.length ? 1 : 0.4,
                    boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </Link>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <Link
                    href={`/playlist/${pl._id}`}
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      textDecoration: "none",
                      display: "block",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {pl.name}
                  </Link>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    {pl.songs?.length || 0} {pl.songs?.length === 1 ? "track" : "tracks"}
                  </span>
                </div>

                <Link
                  href={`/playlist/${pl._id}`}
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    fontFamily: "var(--font-display)",
                    color: "var(--accent-primary)",
                    textDecoration: "none",
                    padding: "6px 10px",
                    borderRadius: 99,
                    background: "var(--accent-soft)",
                    flexShrink: 0,
                  }}
                >
                  Open →
                </Link>
              </div>
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
          <h3>{searchQuery ? "No matching playlists" : "No playlists created yet"}</h3>
          <p>
            {searchQuery
              ? `Nothing matched "${searchQuery}". Try another search.`
              : "Organize your favorite tracks into custom playlists."}
          </p>
          <Link href="/upload" className="btn-primary">
            Create Playlist
          </Link>
        </div>
      )}
    </div>
  );
}
