"use client";
import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { safeFetch } from "../lib/safeFetch";
import UploadProgressBar from "./UploadProgressBar";
import "./UploadPage.css";

export default function UploadPage() {
  const [playlists, setPlaylists] = useState([]);
  const [useNewPlaylist, setUseNewPlaylist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadType, setUploadType] = useState("file"); // "file" | "youtube"
  const [serverAwake, setServerAwake] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const [cookieStatus, setCookieStatus] = useState("Checking..."); // 👈 added
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');

  const BACKEND_SERVER = "https://musio-2-0-yt-backend-1.onrender.com"; // your backend

  useEffect(() => {
    const parseJsonSafe = async (res) => {
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text().catch(() => '<unreadable body>');
        throw new Error(`Expected JSON but received non-JSON response (status ${res.status}): ${text.slice(0,200)}`);
      }
      return res.json();
    };

    fetch("/api/playlists")
      .then((res) => parseJsonSafe(res))
      .then((data) => setPlaylists(data.playlists))
      .catch((err) => console.error('Failed to load playlists:', err));
  }, []);

  // 👇 fetch cookie expiry once (use safeFetch to avoid parsing HTML)
  useEffect(() => {
    const fetchCookieExpiry = async () => {
      try {
        const data = await safeFetch(`${BACKEND_SERVER}/cookie-expiry`);
        if (data.expiresAt) {
          const expiryDate = new Date(data.expiresAt);
          if (expiryDate < new Date()) {
            setCookieStatus(`⚠️ Expired on ${expiryDate.toLocaleString()}`);
          } else {
            setCookieStatus(`✅ Valid until ${expiryDate.toLocaleString()}`);
          }
        } else {
          setCookieStatus("No cookie expiry info found");
        }
      } catch (err) {
        console.error('cookie-expiry error:', err);
        setCookieStatus("⚠️ Could not fetch cookie expiry (non-JSON response or server down)");
      }
    };
    fetchCookieExpiry();
  }, []);

  // Wake server button
  const wakeServer = async () => {
    setIsWaking(true);
    toast.loading("Waking up backend server... please wait");
    try {
      // health endpoint may return non-JSON; safeFetch will throw if so
      await safeFetch(`${BACKEND_SERVER}/health`);
      setServerAwake(true);
      toast.dismiss();
      toast.success("Server is awake! You can upload songs now.");
    } catch (err) {
      console.error('wakeServer error:', err);
      toast.dismiss();
      toast.error(err.message || "Could not wake server");
    } finally {
      setIsWaking(false);
    }
  };
  
  // Function to upload files with progress tracking
  const uploadFileWithProgress = (url, formData) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(percentComplete);
        }
      });
      
      // Handle state changes
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) { // Request completed
          if (xhr.status >= 200 && xhr.status < 300) {
            // Success
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            // Error
            reject(new Error(`Request failed with status ${xhr.status}`));
          }
        }
      };
      
      // Handle errors
      xhr.onerror = () => {
        reject(new Error('Network error occurred'));
      };
      
      // Open and send the request
      xhr.open('POST', url, true);
      xhr.send(formData);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setUploadProgress(0);
    setUploadStatus('');

    const formData = new FormData(e.target);

    try {
      if (uploadType === "youtube") {
        const ytUrl = formData.get("youtubeUrl");
        if (!ytUrl) {
          toast.error("Please enter a YouTube URL!");
          setIsLoading(false);
          return;
        }

        // Set status for YouTube uploads
        setUploadFileName(`YouTube: ${ytUrl}`);
        setUploadStatus('uploading');
        setUploadProgress(10); // Start with some progress to show user something is happening

        try {
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
          
          // Update progress for processing stage
          setUploadProgress(75);
          setUploadStatus('processing');

          if (!ytData.success) {
            setUploadStatus('error');
            toast.error(ytData.error || "YouTube download failed");
            setIsLoading(false);
            return;
          }

          // Complete!
          setUploadProgress(100);
          setUploadStatus('complete');
          toast.success("Song uploaded from YouTube!");
          e.target.reset();
          setUseNewPlaylist(false);
        } catch (err) {
          console.error('yt-upload error:', err);
          setUploadStatus('error');
          toast.error('YouTube upload failed: non-JSON response or server error');
          setIsLoading(false);
          return;
        }
      }

      if (uploadType === "file") {
        // Get song file info for display
        const songFile = formData.get("songFile");
        if (songFile) {
          setUploadFileName(songFile.name);
          setUploadStatus('uploading');
        } else {
          toast.error("Please select a song file!");
          setIsLoading(false);
          return;
        }
        
        try {
          // Use XHR for progress tracking
          const data = await uploadFileWithProgress("/api/upload", formData);
          
          setUploadStatus('processing');
          setUploadProgress(90); // Almost done, processing on server
          
          if (data.success) {
            setUploadProgress(100);
            setUploadStatus('complete');
            toast.success("Song uploaded successfully!");
            e.target.reset();
            setUseNewPlaylist(false);
          } else {
            setUploadStatus('error');
            toast.error(data.error || "Something went wrong!");
          }
        } catch (err) {
          console.error('/api/upload error:', err);
          setUploadStatus('error');
          toast.error(err.message || 'Server error');
        }
      }
    } catch (err) {
      setUploadStatus('error');
      toast.error(err.message || "Server error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="upload-page page-content">
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
          {/* 👇 Cookie expiry status */}
          <p className="cookie-expiry">{cookieStatus}</p>
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
            <div className="input-group">
              <label className="input-label">Genre</label>
              <select name="genre" className="text-input">
                <option value="">Select genre (optional)</option>
                <option value="pop">Pop</option>
                <option value="rock">Rock</option>
                <option value="hip hop">Hip Hop</option>
                <option value="electronic">Electronic</option>
                <option value="indie">Indie</option>
                <option value="jazz">Jazz</option>
                <option value="classical">Classical</option>
                <option value="country">Country</option>
                <option value="r&b">R&B</option>
                <option value="alternative">Alternative</option>
                <option value="folk">Folk</option>
                <option value="metal">Metal</option>
                <option value="reggae">Reggae</option>
                <option value="blues">Blues</option>
                <option value="other">Other</option>
              </select>
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

          {uploadType === "youtube" && (
            <div className="input-group">
              <label className="input-label">YouTube URL *</label>
              <input
                type="url"
                name="youtubeUrl"
                placeholder="Paste YouTube link"
                required
                className="text-input"
              />

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

          {/* Upload Progress Bar */}
          {uploadStatus && (
            <UploadProgressBar 
              progress={uploadProgress} 
              fileName={uploadFileName} 
              status={uploadStatus} 
            />
          )}
          
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
