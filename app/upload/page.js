"use client";
import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import "./UploadPage.css";

export default function UploadPage() {
  const [playlists, setPlaylists] = useState([]);
  const [useNewPlaylist, setUseNewPlaylist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/playlists")
      .then(res => res.json())
      .then(data => setPlaylists(data.playlists));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.target);

    const songCover = formData.get("songCover");
    const playlistId = formData.get("playlistId");
    const newPlaylistName = formData.get("newPlaylistName");
    const playlistCover = formData.get("playlistCover");

    // Frontend validation
    if (!songCover) {
      toast.error("Please upload a song cover!");
      setIsLoading(false);
      return;
    }

    if (useNewPlaylist && !playlistCover) {
      toast.error("Please upload a playlist cover!");
      setIsLoading(false);
      return;
    }

    try {
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
            background: 'rgba(15, 15, 35, 0.95)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
          },
        }}
      />
      
      <div className="upload-container">
        <div className="upload-header">
          <h1 className="upload-title">Upload Music</h1>
          <p className="upload-subtitle">Share your favorite songs with the world</p>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {/* Song Information Section */}
          <div className="form-section">
            <h2 className="section-title">
              <svg className="section-icon" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
              Song Information
            </h2>
            
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

          {/* File Upload Section */}
          <div className="form-section">
            <h2 className="section-title">
              <svg className="section-icon" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Upload Files
            </h2>

            <div className="input-group">
              <label className="input-label">Song File *</label>
              <div className="file-input-wrapper">
                <input 
                  type="file" 
                  name="songFile" 
                  accept="audio/*" 
                  required 
                  className="file-input"
                  id="songFile"
                />
                <label htmlFor="songFile" className="file-input-label">
                  <svg className="file-input-icon" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Choose audio file (MP3, WAV, etc.)
                </label>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Song Cover Image</label>
              <div className="file-input-wrapper">
                <input 
                  type="file" 
                  name="songCover" 
                  accept="image/*" 
                  className="file-input"
                  id="songCover"
                />
                <label htmlFor="songCover" className="file-input-label">
                  <svg className="file-input-icon" viewBox="0 0 24 24">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                  Choose cover image (JPG, PNG, etc.)
                </label>
              </div>
            </div>
          </div>

          {/* Playlist Section */}
          <div className="form-section">
            <h2 className="section-title">
              <svg className="section-icon" viewBox="0 0 24 24">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18C16.69 14.07 16.35 14 16 14c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
              </svg>
              Playlist Options
            </h2>

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
                    <option key={pl._id} value={pl._id}>{pl.name}</option>
                  ))}
                  <option value="new">Create New Playlist</option>
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
                  <div className="file-input-wrapper">
                    <input 
                      type="file" 
                      name="playlistCover" 
                      accept="image/*" 
                      className="file-input"
                      id="playlistCover"
                    />
                    <label htmlFor="playlistCover" className="file-input-label">
                      <svg className="file-input-icon" viewBox="0 0 24 24">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                      </svg>
                      Choose playlist cover image
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>

          <button 
            type="submit" 
            className={`submit-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Uploading...' : 'Upload Song'}
          </button>
        </form>
      </div>
    </div>
  );
}
