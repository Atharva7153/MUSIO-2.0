"use client";
import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import "./UploadPage.css";

export default function UploadPage() {
  const [playlists, setPlaylists] = useState([]);
  const [useNewPlaylist, setUseNewPlaylist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadType, setUploadType] = useState("file"); // "file" | "soundcloud"
  const [serverAwake, setServerAwake] = useState(false); // track backend status
  const [isWaking, setIsWaking] = useState(false);
  const [showScInfo, setShowScInfo] = useState(false); // toggle for SC info

  const BACKEND_SERVER = "https://musio-2-0-yt-backend.onrender.com"; // your backend

  useEffect(() => {
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((data) => setPlaylists(data.playlists));
  }, []);

  // Wake server button
  const wakeServer = async () => {
    setIsWaking(true);
    toast.loading("Waking up backend server... please wait");
    try {
      const res = await fetch(`${BACKEND_SERVER}/health`);
      if (res.ok) {
        setServerAwake(true);
        toast.dismiss();
        toast.success("Server is awake! You can upload songs now.");
      } else {
        throw new Error("Failed to wake server");
      }
    } catch (err) {
      toast.dismiss();
      toast.error(err.message || "Could not wake server");
    } finally {
      setIsWaking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.target);

    try {
      if (uploadType === "soundcloud") {
        const scUrl = formData.get("soundcloudUrl");
        if (!scUrl) {
          toast.error("Please enter a SoundCloud URL!");
          setIsLoading(false);
          return;
        }

        const scRes = await fetch(`${BACKEND_SERVER}/sc-upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: scUrl,
            title: formData.get("title"),
            artist: formData.get("artist"),
            playlistId: formData.get("playlistId"),
            newPlaylistName: formData.get("newPlaylistName"),
          }),
        });

        const scData = await scRes.json();
        if (!scData.success) {
          toast.error(scData.error || "SoundCloud download failed");
          setIsLoading(false);
          return;
        }

        toast.success("Song uploaded from SoundCloud!");
        e.target.reset();
        setUseNewPlaylist(false);
      }

      if (uploadType === "file") {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          toast.success("Song uploaded successfully!");
          e.target.reset();
          setUseNewPlaylist(false);
        } else {
          toast.error(data.error || "Something went wrong!");
        }
      }
    } catch (err) {
      toast.error(err.message || "Server error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="upload-page">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(15, 15, 35, 0.95)",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(20px)",
          },
        }}
      />

      <div className="upload-container">
        <div className="upload-header">
          <h1 className="upload-title">Upload Music</h1>
          <p className="upload-subtitle">
            Upload a file or paste a SoundCloud link
          </p>
          <p>Make sure to read Instructions for soundcloud</p>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {/* Song Info */}
          <div className="form-section">
            <h2 className="section-title">Song Information</h2>
            <div className="input-group">
              <label className="input-label">Song Title *</label>
              <input
                type="text"
                name="title"
                placeholder="Enter song title"
                required
                className="text-input"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Artist</label>
              <input
                type="text"
                name="artist"
                placeholder="Enter artist name"
                className="text-input"
              />
            </div>
          </div>

          {/* Upload Method */}
          <div className="form-section">
            <h2 className="section-title">Upload Method</h2>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="uploadType"
                  value="file"
                  checked={uploadType === "file"}
                  onChange={() => setUploadType("file")}
                />
                Upload File
              </label>
              <label>
                <input
                  type="radio"
                  name="uploadType"
                  value="soundcloud"
                  checked={uploadType === "soundcloud"}
                  onChange={() => setUploadType("soundcloud")}
                />
                SoundCloud Link
              </label>
            </div>
          </div>

          {uploadType === "file" && (
            <>
              <div className="input-group">
                <label className="input-label">Song File *</label>
                <input
                  type="file"
                  name="songFile"
                  accept="audio/*"
                  className="file-input"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Song Cover Image</label>
                <input
                  type="file"
                  name="songCover"
                  accept="image/*"
                  className="file-input"
                />
              </div>
            </>
          )}

          {uploadType === "soundcloud" && (
            <div className="input-group">
              <label className="input-label">SoundCloud URL *</label>
              <input
                type="url"
                name="soundcloudUrl"
                placeholder="Paste SoundCloud link"
                required
                className="text-input"
              />

              {/* Info Button */}
              <button
                type="button"
                className="info-button"
                onClick={() => setShowScInfo(!showScInfo)}
              >
                {showScInfo ? "Hide Instructions" : "SoundCloud Link Rules"}
              </button>
              {showScInfo && (
                <p className="info-text">
                  ⚠️ Please use full SoundCloud links, not shortened (e.g.
                  use <b>https://soundcloud.com/artist/track</b>, not
                  <b> https://on.soundcloud.com/xyz<br/>
                  and make sure track is not restricted else download failed</b>)
                </p>
                
              )}

              {/* Wake button ONLY visible here */}
              {!serverAwake && (
                <button
                  type="button"
                  className={`wake-button ${isWaking ? "loading" : ""}`}
                  onClick={wakeServer}
                  disabled={isWaking}
                >
                  {isWaking ? "Waking Server..." : "Wake Backend Server"}
                </button>
              )}
            </div>
          )}

          {/* Playlist Section */}
          <div className="form-section">
            <h2 className="section-title">Playlist Options</h2>
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="newPlaylist"
                className="checkbox-input"
                onChange={() => setUseNewPlaylist(!useNewPlaylist)}
              />
              <label htmlFor="newPlaylist" className="checkbox-label">
                Create New Playlist
              </label>
            </div>

            {!useNewPlaylist ? (
              <div className="input-group">
                <label className="input-label">Choose Existing Playlist</label>
                <select name="playlistId" className="select-input">
                  <option value="">No playlist</option>
                  {playlists.map((pl) => (
                    <option key={pl._id} value={pl._id}>
                      {pl.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="input-group">
                  <label className="input-label">New Playlist Name</label>
                  <input
                    type="text"
                    name="newPlaylistName"
                    placeholder="Enter playlist name"
                    className="text-input"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Playlist Cover Image</label>
                  <input
                    type="file"
                    name="playlistCover"
                    accept="image/*"
                    className="file-input"
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            className={`submit-button ${isLoading ? "loading" : ""}`}
            disabled={isLoading}
          >
            {isLoading ? "Uploading..." : "Upload Song"}
          </button>
        </form>
      </div>
    </div>
  );
}
