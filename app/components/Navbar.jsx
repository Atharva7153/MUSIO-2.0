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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Dark mode toggle
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
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

  // Check for system dark mode preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <nav className="navbar">
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle mobile menu"
      >
        <svg className="hamburger-icon" viewBox="0 0 24 24">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>

      {/* Logo */}
      <Link href="/" className="navbar-logo-container">
        <div className="logo-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
        <div className="logo-text">
          <h1 className="navbar-logo">MUSIO</h1>
          <span className="version-badge">2.0</span>
        </div>
      </Link>

      {/* Desktop Navigation */}
      <div className="navbar-center">
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
          <Link href="/playlists" className="navbar-link">
            <svg className="navbar-icon" viewBox="0 0 24 24">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
            </svg>
            <span>Playlists</span>
          </Link>
          <Link href="/discover" className="navbar-link">
            <svg className="navbar-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span>Discover</span>
          </Link>
        </div>
      </div>

      {/* Right Side Navigation */}
      <div className="navbar-right">
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
            placeholder="Search songs, artists..."
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

        {/* Dark Mode Toggle */}
        <button 
          className="theme-toggle"
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? (
            <svg className="theme-icon" viewBox="0 0 24 24">
              <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
            </svg>
          ) : (
            <svg className="theme-icon" viewBox="0 0 24 24">
              <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay">
          <div className="mobile-menu">
            <div className="mobile-menu-header">
              <h2>Menu</h2>
              <button 
                className="close-button"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="mobile-menu-links">
              <Link href="/" className="mobile-link" onClick={() => setIsMobileMenuOpen(false)}>
                <svg viewBox="0 0 24 24">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                <span>Home</span>
              </Link>
              <Link href="/upload" className="mobile-link" onClick={() => setIsMobileMenuOpen(false)}>
                <svg viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <span>Upload</span>
              </Link>
              <Link href="/playlists" className="mobile-link" onClick={() => setIsMobileMenuOpen(false)}>
                <svg viewBox="0 0 24 24">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                </svg>
                <span>Playlists</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
