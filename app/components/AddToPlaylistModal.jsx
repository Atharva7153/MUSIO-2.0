"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AddToPlaylistModal({ song, onClose }) {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState("");
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const res = await fetch("/api/playlists");
        const data = await res.json();
        setPlaylists(data.playlists || []);
        if (data.playlists?.length > 0) {
          setSelectedPlaylist(data.playlists[0]._id);
        }
      } catch {
        setMessage({ type: "error", text: "Could not load playlists." });
      }
    };
    fetchPlaylists();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlaylist || !song) return;
    setIsSubmitting(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch(`/api/playlist/${selectedPlaylist}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_song",
          songId: song._id,
          keyword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `Added to ${data.playlist.name}!` });
        setTimeout(onClose, 1200);
      } else {
        throw new Error(data.message || "Failed to add song.");
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
          background: "rgba(0, 0, 0, 0.55)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <motion.div
          initial={{ scale: 0.94, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="surface-card"
          style={{
            width: "100%",
            maxWidth: 440,
            background: "var(--bg-elevated)",
            padding: 24,
          }}
        >
          <div className="rainbow-line" style={{ position: "absolute", top: 0, left: 0, right: 0 }} />

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Add to Playlist
              </h2>
              {song && (
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 2 }}>
                  {song.title} · {song.artist || "Unknown Artist"}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-subtle)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-display)",
                  marginBottom: 6,
                }}
              >
                Select Playlist
              </label>
              <select
                value={selectedPlaylist}
                onChange={(e) => setSelectedPlaylist(e.target.value)}
                disabled={playlists.length === 0}
                className="theme-input"
              >
                {playlists.length === 0 && <option>No playlists found</option>}
                {playlists.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-display)",
                  marginBottom: 6,
                }}
              >
                Confirmation Keyword
              </label>
              <input
                type="password"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Enter keyword to confirm"
                required
                className="theme-input"
              />
            </div>

            {message.text && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: "0.84rem",
                  fontWeight: 500,
                  background:
                    message.type === "success"
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(239, 68, 68, 0.12)",
                  color: message.type === "success" ? "#10B981" : "#EF4444",
                  border: `1px solid ${
                    message.type === "success"
                      ? "rgba(16, 185, 129, 0.3)"
                      : "rgba(239, 68, 68, 0.3)"
                  }`,
                }}
              >
                {message.text}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedPlaylist || !keyword}
                className="btn-primary"
                style={{
                  flex: 1.5,
                  opacity: isSubmitting || !selectedPlaylist || !keyword ? 0.5 : 1,
                }}
              >
                {isSubmitting ? "Adding..." : "Add Track"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
