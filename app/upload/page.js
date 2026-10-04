"use client";
import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { safeFetch } from "../lib/safeFetch";
import UploadProgressBar from "./UploadProgressBar";
import { motion } from "framer-motion";

export default function UploadPage() {
  const [playlists, setPlaylists] = useState([]);
  const [useNewPlaylist, setUseNewPlaylist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadType, setUploadType] = useState("file");
  const [serverAwake, setServerAwake] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const [cookieStatus, setCookieStatus] = useState("Checking YouTube backend...");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");

  const BACKEND_SERVER = process.env.NEXT_PUBLIC_YT_BACKEND_URL || "/yt-api";

  const fetchCookieExpiry = async () => {
    try {
      const data = await safeFetch(`${BACKEND_SERVER}/cookie-expiry`);
      setServerAwake(true);
      if (data.expiresAt) {
        const exp = new Date(data.expiresAt);
        setCookieStatus(
          exp < new Date()
            ? `⚠️ Cookie expired on ${exp.toLocaleDateString()}`
            : `✅ YouTube Ready · Valid until ${exp.toLocaleDateString()}`
        );
      } else {
        setCookieStatus("YouTube backend connected");
      }
    } catch {
      setServerAwake(false);
      setCookieStatus("⚠️ YouTube backend sleeping (File upload is always active)");
    }
  };

  useEffect(() => {
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((d) => setPlaylists(d.playlists || []))
      .catch(() => {});
    fetchCookieExpiry();
  }, []);

  const wakeServer = async () => {
    setIsWaking(true);
    toast.loading("Waking backend server...");
    try {
      await safeFetch(`${BACKEND_SERVER}/health`);
      setServerAwake(true);
      await fetchCookieExpiry();
      toast.dismiss();
      toast.success("Server is awake!");
    } catch (err) {
      toast.dismiss();
      toast.error(err.message || "Could not wake server");
    } finally {
      setIsWaking(false);
    }
  };

  const uploadFileWithProgress = (url, formData) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (ev) => {
        if (ev.lengthComputable) {
          setUploadProgress((ev.loaded / ev.total) * 100);
        }
      });
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error("Invalid JSON response"));
            }
          } else {
            let errMsg = `Upload failed (${xhr.status})`;
            try {
              const errData = JSON.parse(xhr.responseText);
              if (errData.error) errMsg = errData.error;
            } catch {}
            reject(new Error(errMsg));
          }
        }
      };
      xhr.onerror = () => reject(new Error("Network error occurred"));
      xhr.open("POST", url, true);
      xhr.send(formData);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setUploadProgress(0);
    setUploadStatus("");

    const formData = new FormData(e.target);

    try {
      if (uploadType === "youtube") {
        const ytUrl = formData.get("youtubeUrl");
        if (!ytUrl) {
          toast.error("Please enter a YouTube URL!");
          setIsLoading(false);
          return;
        }
        setUploadFileName(`YouTube: ${ytUrl}`);
        setUploadStatus("uploading");
        setUploadProgress(15);

        const ytData = await safeFetch(`${BACKEND_SERVER}/yt-upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: ytUrl,
            title: formData.get("title"),
            artist: formData.get("artist"),
            genre: formData.get("genre"),
            playlistId: formData.get("playlistId"),
            newPlaylistName: formData.get("newPlaylistName"),
          }),
        });

        setUploadProgress(80);
        setUploadStatus("processing");

        if (!ytData.success) {
          setUploadStatus("error");
          toast.error(ytData.error || "YouTube download failed");
          setIsLoading(false);
          return;
        }

        setUploadProgress(100);
        setUploadStatus("complete");
        toast.success("Song imported from YouTube!");
        e.target.reset();
        setUseNewPlaylist(false);
      } else {
        const songFile = formData.get("songFile");
        if (!songFile || !songFile.name) {
          toast.error("Please select an audio file!");
          setIsLoading(false);
          return;
        }
        setUploadFileName(songFile.name);
        setUploadStatus("uploading");

        const data = await uploadFileWithProgress("/api/upload", formData);
        setUploadStatus("processing");
        setUploadProgress(92);

        if (data.success) {
          setUploadProgress(100);
          setUploadStatus("complete");
          toast.success("Song uploaded to library!");
          e.target.reset();
          setUseNewPlaylist(false);
        } else {
          setUploadStatus("error");
          toast.error(data.error || "Upload failed");
        }
      }
    } catch (err) {
      setUploadStatus("error");
      toast.error(err.message || "Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  const labelStyle = {
    display: "block",
    fontFamily: "var(--font-display)",
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 6,
  };

  return (
    <div className="page-content" style={{ maxWidth: 740, margin: "0 auto", padding: "108px 20px 80px" }}>
      <Toaster position="top-right" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 28 }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 12px",
            borderRadius: 99,
            background: "var(--accent-soft)",
            color: "var(--accent-primary)",
            fontSize: "0.75rem",
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            marginBottom: 10,
          }}
        >
          Studio Ingest · {cookieStatus}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.9rem, 4vw, 2.7rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          Upload <span className="gradient-text">Music</span>
        </h1>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        onSubmit={handleSubmit}
        className="surface-card"
        style={{
          padding: "clamp(22px, 4vw, 34px)",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <div className="rainbow-line" style={{ position: "absolute", top: 0, left: 0, right: 0 }} />

        {/* Upload Source Selector */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            padding: 5,
            borderRadius: 14,
            background: "var(--bg-subtle)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {[
            { id: "file", label: "Audio File Upload" },
            { id: "youtube", label: "YouTube Link Import" },
          ].map((tab) => {
            const active = uploadType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setUploadType(tab.id)}
                className={active ? "rainbow-bar" : ""}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: active ? undefined : "transparent",
                  color: active ? "#FFFFFF" : "var(--text-secondary)",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "0.86rem",
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Metadata */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
          <div>
            <label style={labelStyle}>Song Title *</label>
            <input
              type="text"
              name="title"
              required
              placeholder="e.g. Midnight City"
              className="theme-input"
            />
          </div>
          <div>
            <label style={labelStyle}>Artist</label>
            <input
              type="text"
              name="artist"
              placeholder="e.g. M83"
              className="theme-input"
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Genre</label>
          <select name="genre" className="theme-input">
            <option value="">Select genre (optional)</option>
            {[
              "pop",
              "rock",
              "hip hop",
              "electronic",
              "indie",
              "jazz",
              "classical",
              "country",
              "r&b",
              "alternative",
              "other",
            ].map((g) => (
              <option key={g} value={g}>
                {g.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Source Input */}
        {uploadType === "file" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
            <div>
              <label style={labelStyle}>Audio File *</label>
              <input
                type="file"
                name="songFile"
                accept="audio/*"
                required
                className="theme-input"
              />
            </div>
            <div>
              <label style={labelStyle}>Cover Artwork (Optional)</label>
              <input
                type="file"
                name="songCover"
                accept="image/*"
                className="theme-input"
              />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>YouTube Video URL *</label>
              <input
                type="url"
                name="youtubeUrl"
                placeholder="https://www.youtube.com/watch?v=..."
                required
                className="theme-input"
              />
            </div>
            {!serverAwake && (
              <button
                type="button"
                onClick={wakeServer}
                disabled={isWaking}
                className="btn-secondary"
                style={{ alignSelf: "flex-start" }}
              >
                {isWaking ? "Waking Server..." : "⚡ Wake YouTube Backend Server"}
              </button>
            )}
          </div>
        )}

        {/* Playlist Assignment */}
        <div
          style={{
            padding: 18,
            borderRadius: 14,
            background: "var(--bg-subtle)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "0.88rem",
              color: "var(--text-primary)",
            }}
          >
            <input
              type="checkbox"
              checked={useNewPlaylist}
              onChange={(e) => setUseNewPlaylist(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--accent-primary)" }}
            />
            Create a new playlist for this track
          </label>

          {!useNewPlaylist ? (
            <div>
              <label style={labelStyle}>Assign to Existing Playlist</label>
              <select name="playlistId" className="theme-input">
                <option value="">Standalone (No playlist)</option>
                {playlists.map((pl) => (
                  <option key={pl._id} value={pl._id}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              <div>
                <label style={labelStyle}>New Playlist Name</label>
                <input
                  type="text"
                  name="newPlaylistName"
                  placeholder="e.g. Late Night Drive"
                  className="theme-input"
                />
              </div>
              <div>
                <label style={labelStyle}>Playlist Cover Image</label>
                <input
                  type="file"
                  name="playlistCover"
                  accept="image/*"
                  className="theme-input"
                />
              </div>
            </div>
          )}
        </div>

        {uploadStatus && (
          <UploadProgressBar
            progress={uploadProgress}
            fileName={uploadFileName}
            status={uploadStatus}
          />
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary"
          style={{
            padding: "14px 24px",
            fontSize: "0.95rem",
            opacity: isLoading ? 0.65 : 1,
          }}
        >
          {isLoading ? "Uploading..." : "Upload to MUSIO 2.0"}
        </button>
      </motion.form>
    </div>
  );
}
