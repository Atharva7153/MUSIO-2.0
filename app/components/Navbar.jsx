"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "../context/PlayerContext";
import "./Navbar.css";

const Navbar = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const router = useRouter();
  const { playSong } = usePlayer();
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  const handleSearch = async (e) => {
    setQuery(e.target.value);

    if (e.target.value.length === 0) {
      setResults([]);
      return;
    }

    const res = await fetch(`/api/songs/search?query=${e.target.value}`);
    const data = await res.json();
    setResults(data.songs || []);
  };

  const handleSongClick = (song) => {
    playSong([song], 0);
    setResults([]);
    setQuery("");
    setIsSearchActive(false);
  };

  const toggleSearch = () => {
    setIsSearchActive(!isSearchActive);
    if (!isSearchActive) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setResults([]);
      setQuery("");
    }
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setResults([]);
        setIsSearchActive(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link href="/">
        <h1 className="navbar-logo">MUSIO 2.0</h1>
      </Link>
      <h1>1.12v</h1>

      {/* Right Side Navigation */}
      <div className="navbar-right">
        {/* Navigation Menu */}
        <div className="navbar-menu">
          <Link href="/" className="navbar-link">
            <svg className="navbar-icon" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            <span>Home</span>
          </Link>
          <Link href="/upload" className="navbar-link">
            <svg className="navbar-icon" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <span>Upload</span>
          </Link>
        </div>

        {/* Search Container */}
        <div className="search-container" ref={searchRef}>
          <button 
            className="search-button" 
            onClick={toggleSearch}
            aria-label="Search songs"
          >
            <svg className="search-icon" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>

          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Search songs..."
            className={`search-input ${isSearchActive ? 'active' : ''}`}
          />

          {/* Search results dropdown */}
          {results.length > 0 && isSearchActive && (
            <div className="search-results">
              {results.map((song) => (
                <div
                  key={song._id}
                  onClick={() => handleSongClick(song)}
                  className="search-result-item"
                >
                  <img
                    src={song.coverImage || "/default-song.png"}
                    alt={song.title}
                    className="search-result-image"
                  />
                  <div className="search-result-content">
                    <span className="search-result-title">{song.title}</span>
                    <span className="search-result-artist">{song.artist}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
