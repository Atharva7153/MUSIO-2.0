"use client";
import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import "./UploadPage.css";

export default function UploadPage() {
  const [playlists, setPlaylists] = useState([]);
  const [useNewPlaylist, setUseNewPlaylist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadType, setUploadType] = useState("file"); // "file" | "youtube"
  const [serverAwake, setServerAwake] = useState(false); // track yt-server status
  const [isWaking, setIsWaking] = useState(false);

  const YT_SERVER = "https://musio-2-0-yt-backend.onrender.com"; // replace with your Render server URL

  useEffect(() => {
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((data) => setPlaylists(data.playlists));
  }, []);

  // Wake server button functionality
  const wakeServer = async () => {
    setIsWaking(true);
    toast.loading("Waking up YouTube server... please wait");
    try {
      const res = await fetch(`${YT_SERVER}/health`);
      if (res.ok) {
        setServerAwake(true);
        toast.dismiss();
        toast.success("Server is awake! You can upload YouTube songs now.");
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
      if (uploadType === "youtube") {
        if (!serverAwake) {
          toast.error("Please wake up the server first!");
          setIsLoading(false);
          return;
        }

        const youtubeUrl = formData.get("youtubeUrl");
        if (!youtubeUrl) {
          toast.error("Please enter a YouTube URL!");
          setIsLoading(false);
          return;
        }

        // Call yt-server to download & upload YouTube song
        const ytRes = await fetch(`${YT_SERVER}/yt-upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: youtubeUrl,
            title: formData.get("title"),
            artist: formData.get("artist"),
            playlistId: formData.get("playlistId"),
            newPlaylistName: formData.get("newPlaylistName"),
          }),
        });

        const ytData = await ytRes.json();
        if (!ytData.success) {
          toast.error(ytData.error || "YouTube download failed");
          setIsLoading(false);
          return;
        }

        // Send metadata + Cloudinary URL to Next.js API
        const payload = {
          title: formData.get("title"),
          artist: formData.get("artist"),
          uploadType: "youtube",
          youtubeSongUrl: ytData.song.url, // Cloudinary URL from yt-server
          playlistId: formData.get("playlistId"),
          newPlaylistName: formData.get("newPlaylistName"),
        };

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
          toast.success("Song uploaded from YouTube!");
          e.target.reset();
          setUseNewPlaylist(false);
        } else {
          toast.error(data.error || "Something went wrong!");
        }
      } else {
        // ---- File Upload Flow ----
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
            Upload a file or paste a YouTube link
          </p>
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
                  value="youtube"
                  checked={uploadType === "youtube"}
                  onChange={() => setUploadType("youtube")}
                />
                YouTube Link
              </label>
            </div>
          </div>

          {uploadType === "file" ? (
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
          ) : (
            <>
              <div className="input-group">
                <label className="input-label">YouTube URL *</label>
                <input
                  type="url"
                  name="youtubeUrl"
                  placeholder="Paste YouTube link"
                  required
                  className="text-input"
                />
              </div>

              {/* Wake Server Button */}
              {!serverAwake && (
                <button
                  type="button"
                  className={`wake-button ${isWaking ? "loading" : ""}`}
                  onClick={wakeServer}
                  disabled={isWaking}
                >
                  {isWaking ? "Waking Server..." : "Wake YouTube Server"}
                </button>
              )}
            </>
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
