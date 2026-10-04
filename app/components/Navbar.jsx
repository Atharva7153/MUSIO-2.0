"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { usePlayer } from "../context/PlayerContext";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    href: "/playlists",
    label: "Playlists",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
      </svg>
    ),
  },
  {
    href: "/visualizer",
    label: "Stage",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
      </svg>
    ),
  },
  {
    href: "/upload",
    label: "Upload",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
      </svg>
    ),
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const { playSong } = usePlayer();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchTimeout = useRef(null);

  /* ── Initialize and sync theme (White+Orange Light vs Black+Rainbow Dark) ── */
  useEffect(() => {
    const saved = localStorage.getItem("musio-theme");
    const initial = saved === "dark" || saved === "light" ? saved : "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("musio-theme", next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  /* ── Click outside to close search ── */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Debounced song search ── */
  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsSearchOpen(true);

    if (!val.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setIsSearching(true);

    searchTimeout.current = setTimeout(async () => {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`/api/songs/search?query=${encodeURIComponent(val)}`, {
          signal: controller.signal,
        });
        clearTimeout(tid);
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = await res.json();
        setResults(Array.isArray(data?.songs) ? data.songs : []);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  };

  const handleSongClick = (song, closeMobile = false) => {
    if (!song?.url) return;
    playSong(
      [
        {
          ...song,
          _id: song._id || `tmp-${Date.now()}`,
          title: song.title || "Unknown Title",
          artist: song.artist || "Unknown Artist",
          coverImage: song.coverImage || "/music-player.png",
        },
      ],
      0
    );
    setResults([]);
    setQuery("");
    setIsSearchOpen(false);
    if (closeMobile) setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 14,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
          padding: "0 16px",
          pointerEvents: "none",
        }}
      >
        <motion.nav
          initial={{ y: -32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass-pill"
          style={{
            pointerEvents: "auto",
            width: "100%",
            maxWidth: 1080,
            borderRadius: 9999,
            padding: "8px 12px 8px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Brand Logo */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <div
              className="rainbow-bar"
              style={{
                width: 34,
                height: 34,
                borderRadius: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "var(--glow-accent)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "1.15rem",
                  letterSpacing: "-0.03em",
                  color: "var(--text-primary)",
                }}
              >
                MUSIO
              </span>
              <span
                className="gradient-text"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                2.0
              </span>
            </div>
          </Link>

          {/* Center Navigation Pills (Desktop) */}
          <div
            className="hide-mobile"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "var(--bg-subtle)",
              padding: 4,
              borderRadius: 9999,
              border: "1px solid var(--border-subtle)",
            }}
          >
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "7px 16px",
                    borderRadius: 9999,
                    textDecoration: "none",
                    fontFamily: "var(--font-display)",
                    fontSize: "0.85rem",
                    fontWeight: active ? 600 : 500,
                    color: active ? "#FFFFFF" : "var(--text-secondary)",
                    zIndex: 1,
                    transition: "color 0.2s ease",
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill-active"
                      className="rainbow-bar"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 9999,
                        zIndex: -1,
                        boxShadow: "var(--glow-accent)",
                      }}
                    />
                  )}
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Controls: Search + Theme Switch + Mobile Menu */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Search Box */}
            <div ref={searchRef} style={{ position: "relative" }} className="hide-mobile">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--bg-subtle)",
                  border: `1px solid ${isSearchOpen ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                  borderRadius: 9999,
                  padding: "5px 12px",
                  gap: 8,
                  width: isSearchOpen ? 230 : 170,
                  transition: "width 0.25s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.2s ease",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-muted)"
                  strokeWidth="2"
                  width="15"
                  height="15"
                  style={{ flexShrink: 0 }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onFocus={() => setIsSearchOpen(true)}
                  onChange={handleSearch}
                  placeholder="Search tracks..."
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: "var(--text-primary)",
                    fontSize: "0.84rem",
                    outline: "none",
                    fontFamily: "var(--font-body)",
                  }}
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setResults([]);
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      lineHeight: 1,
                    }}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Search Dropdown */}
              <AnimatePresence>
                {isSearchOpen && query.trim().length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="surface-card"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      right: 0,
                      width: 320,
                      maxHeight: 360,
                      overflowY: "auto",
                      background: "var(--bg-glass-heavy)",
                      backdropFilter: "blur(24px)",
                      zIndex: 1200,
                      padding: 6,
                    }}
                  >
                    {isSearching ? (
                      <div
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          color: "var(--text-muted)",
                          fontSize: "0.85rem",
                        }}
                      >
                        Searching library...
                      </div>
                    ) : results.length > 0 ? (
                      results.map((song) =>
                        song?.url ? (
                          <div
                            key={song._id || `${song.title}-${song.artist}`}
                            onClick={() => handleSongClick(song)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "8px 10px",
                              borderRadius: 12,
                              cursor: "pointer",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "var(--bg-subtle)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <img
                              src={song.coverImage || "/music-player.png"}
                              alt={song.title}
                              onError={(e) => {
                                e.target.src = "/music-player.png";
                              }}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 9,
                                objectFit: "cover",
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  fontFamily: "var(--font-display)",
                                  fontSize: "0.88rem",
                                  fontWeight: 600,
                                  color: "var(--text-primary)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {song.title}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--text-muted)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {song.artist || "Unknown Artist"}
                              </div>
                            </div>
                            <span
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background: "var(--accent-soft)",
                                color: "var(--accent-primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </span>
                          </div>
                        ) : null
                      )
                    ) : (
                      <div
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          color: "var(--text-muted)",
                          fontSize: "0.85rem",
                        }}
                      >
                        No tracks matching &ldquo;{query}&rdquo;
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle Button: White+Orange vs Black+Rainbow */}
            <motion.button
              onClick={toggleTheme}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              title={
                theme === "light"
                  ? "Switch to Dark Mode (Black + Subtle Rainbow)"
                  : "Switch to Light Mode (White + Solar Orange)"
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 13px",
                borderRadius: 9999,
                border: "1px solid var(--border-strong)",
                background: "var(--bg-subtle)",
                color: "var(--text-primary)",
                cursor: "pointer",
                fontFamily: "var(--font-display)",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
            >
              {theme === "light" ? (
                <>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#FF5500",
                      boxShadow: "0 0 8px #FF5500",
                    }}
                  />
                  <span className="hide-mobile">Solar</span>
                </>
              ) : (
                <>
                  <span
                    className="rainbow-bar"
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                    }}
                  />
                  <span className="hide-mobile">Prism</span>
                </>
              )}
            </motion.button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="show-mobile-only"
              aria-label="Toggle Menu"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-subtle)",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="18"
                height="18"
              >
                {isMobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </motion.nav>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 995,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              padding: "84px 16px 24px",
            }}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="surface-card"
              style={{
                maxWidth: 480,
                margin: "0 auto",
                padding: 20,
                background: "var(--bg-elevated)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <input
                type="text"
                value={query}
                onChange={handleSearch}
                placeholder="Search songs or artists..."
                className="theme-input"
              />

              {query.trim().length > 0 && (
                <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                  {results.map((song) =>
                    song?.url ? (
                      <div
                        key={song._id}
                        onClick={() => handleSongClick(song, true)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: 8,
                          borderRadius: 10,
                          background: "var(--bg-subtle)",
                          cursor: "pointer",
                        }}
                      >
                        <img
                          src={song.coverImage || "/music-player.png"}
                          alt={song.title}
                          style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>
                            {song.title}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {song.artist || "Unknown"}
                          </div>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {NAV_LINKS.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={active ? "rainbow-bar" : ""}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "12px 14px",
                        borderRadius: 12,
                        textDecoration: "none",
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        color: active ? "#FFF" : "var(--text-primary)",
                        background: active ? undefined : "var(--bg-subtle)",
                      }}
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
