"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePlayer } from "../../context/PlayerContext";
import AddToPlaylistModal from "../../components/AddToPlaylistModal";
import { motion } from "framer-motion";

const shuffleArray = (arr) => {
  const s = [...arr];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
};

export default function PlaylistPage() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [shuffledSongs, setShuffledSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playSong, playlist: activeQueue, currentIndex, isPlaying } = usePlayer();
  const [selectedSong, setSelectedSong] = useState(null);
  const [deletingSongId, setDeletingSongId] = useState(null);

  const currentSong = currentIndex >= 0 ? activeQueue[currentIndex] : null;

  const refetch = async () => {
    const res = await fetch(`/api/playlist/${id}`);
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) throw new Error("Non-JSON");
    const data = await res.json();
    setPlaylist(data.playlist);
    if (data.playlist?.songs) {
      setShuffledSongs(shuffleArray(data.playlist.songs));
    }
  };

  useEffect(() => {
    setIsLoading(true);
    refetch()
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleDeleteSong = async (e, songId, songTitle) => {
    e.stopPropagation();
    const key = prompt(`To delete "${songTitle}", enter confirmation key:`);
    if (!key) return;
    setDeletingSongId(songId);
    try {
      const res = await fetch(
        `/api/songs/delete?id=${songId}&key=${encodeURIComponent(key)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        await refetch();
      } else {
        alert(`Failed to delete song: ${data.error}`);
      }
    } catch {
      alert("Failed to delete song.");
    } finally {
      setDeletingSongId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="page-content" style={{ maxWidth: 1080, margin: "0 auto", padding: "110px 20px 72px" }}>
        <div className="surface-card" style={{ padding: 28, display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 32 }}>
          <div className="skeleton" style={{ width: 180, height: 180, borderRadius: 16 }} />
          <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
            <div className="skeleton" style={{ height: 16, width: 100 }} />
            <div className="skeleton" style={{ height: 36, width: "60%" }} />
            <div className="skeleton" style={{ height: 40, width: 220 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="page-content" style={{ maxWidth: 1080, margin: "0 auto", padding: "120px 20px" }}>
        <div className="empty-state">
          <h3>Playlist Not Found</h3>
          <p>This playlist does not exist or has been removed.</p>
          <Link href="/playlists" className="btn-primary">
            Back to Playlists
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ maxWidth: 1080, margin: "0 auto", padding: "108px 20px 80px" }}>
      {/* Playlist Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-card"
        style={{
          padding: "clamp(22px, 4vw, 36px)",
          marginBottom: 32,
          display: "flex",
          alignItems: "center",
          gap: 28,
          flexWrap: "wrap",
        }}
      >
        <div className="rainbow-line" style={{ position: "absolute", top: 0, left: 0, right: 0 }} />

        <img
          src={playlist.coverImage || "/playlist.png"}
          alt={playlist.name}
          onError={(e) => {
            e.target.src = "/playlist.png";
          }}
          style={{
            width: 170,
            height: 170,
            borderRadius: 16,
            objectFit: "cover",
            flexShrink: 0,
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-card)",
          }}
        />

        <div style={{ flex: 1, minWidth: 220 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: 99,
              background: "var(--accent-soft)",
              color: "var(--accent-primary)",
              fontSize: "0.74rem",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 10,
            }}
          >
            Playlist · {shuffledSongs.length} {shuffledSongs.length === 1 ? "Track" : "Tracks"}
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 10,
            }}
          >
            {playlist.name}
          </h1>

          {playlist.description && (
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: 18 }}>
              {playlist.description}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button
              onClick={() => shuffledSongs.length > 0 && playSong(shuffledSongs, 0)}
              disabled={shuffledSongs.length === 0}
              className="btn-primary"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play All
            </button>

            <button
              onClick={() => setShuffledSongs(shuffleArray(playlist.songs || []))}
              disabled={shuffledSongs.length <= 1}
              className="btn-secondary"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="16,3 21,3 21,8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21,16 21,21 16,21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
              Reshuffle
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tracklist */}
      {shuffledSongs.length === 0 ? (
        <div className="empty-state">
          <h3>No tracks in this playlist</h3>
          <p>Add tracks from the home page or upload new songs directly to this playlist.</p>
          <Link href="/upload" className="btn-primary">
            Upload Songs
          </Link>
        </div>
      ) : (
        <div className="surface-card" style={{ padding: 10 }}>
          {shuffledSongs.map((song, index) => {
            const active = currentSong?._id === song._id;
            return (
              <motion.div
                key={`${song._id}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                onClick={() => playSong(shuffledSongs, index)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "10px 14px",
                  borderRadius: 12,
                  cursor: "pointer",
                  background: active ? "var(--accent-soft)" : "transparent",
                  borderBottom:
                    index < shuffledSongs.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--bg-subtle)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  style={{
                    width: 26,
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: active ? "var(--accent-primary)" : "var(--text-muted)",
                    fontVariantNumeric: "tabular-nums",
                    flexShrink: 0,
                  }}
                >
                  {active && isPlaying ? "▶" : index + 1}
                </span>

                <img
                  src={song.coverImage || "/music-player.png"}
                  alt={song.title}
                  onError={(e) => {
                    e.target.src = "/music-player.png";
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "0.92rem",
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
                      fontSize: "0.78rem",
                      color: "var(--text-secondary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {song.artist || "Unknown Artist"}
                  </div>
                </div>

                {/* Actions */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setSelectedSong(song)}
                    title="Add to another playlist"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-elevated)",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    +
                  </button>
                  <button
                    onClick={(e) => handleDeleteSong(e, song._id, song.title)}
                    disabled={deletingSongId === song._id}
                    title="Delete song"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: "1px solid rgba(239,68,68,0.25)",
                      background: "rgba(239,68,68,0.08)",
                      color: "#EF4444",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {selectedSong && (
        <AddToPlaylistModal song={selectedSong} onClose={() => setSelectedSong(null)} />
      )}
    </div>
  );
}
