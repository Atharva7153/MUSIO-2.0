"use client";
import { useState, useEffect } from "react";
import "./AddToPlaylistModal.css";

export default function AddToPlaylistModal({ song, onClose }) {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState("");
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch all playlists to populate the dropdown
    const fetchPlaylists = async () => {
      try {
        const res = await fetch("/api/playlists");
        const data = await res.json();
        setPlaylists(data.playlists || []);
        if (data.playlists && data.playlists.length > 0) {
          setSelectedPlaylist(data.playlists[0]._id);
        }
      } catch (error) {
        console.error("Error fetching playlists:", error);
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
          keyword: keyword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: `Added to ${data.playlist.name}!` });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(data.message || "Failed to add song.");
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add to Playlist</h2>
          <button className="modal-close-button" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="playlist-select">Choose a playlist:</label>
              <select
                id="playlist-select"
                value={selectedPlaylist}
                onChange={(e) => setSelectedPlaylist(e.target.value)}
                disabled={playlists.length === 0}
              >
                {playlists.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="keyword-input">Keyword:</label>
              <input
                id="keyword-input"
                type="password"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Enter keyword to confirm"
                required
              />
            </div>
            {message.text && (
              <div className={`modal-message ${message.type}`}>
                {message.text}
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="modal-button secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-button primary"
              disabled={isSubmitting || !selectedPlaylist || !keyword}
            >
              {isSubmitting ? "Adding..." : "Add Song"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
