"use client";
import { createContext, useContext, useState, useEffect } from "react";

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleQueue, setShuffleQueue] = useState([]);

  // Sleep timer states
  const [sleepTimer, setSleepTimer] = useState(null); // minutes
  const [sleepTimeoutId, setSleepTimeoutId] = useState(null);

  const createShuffleQueue = (length, excludeIndex) => {
    const indices = Array.from({ length }, (_, i) => i).filter(i => i !== excludeIndex);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  };

  const playSong = (songs, index) => {
    setPlaylist(songs);
    setCurrentIndex(index);
    setIsPlaying(true);

    if (isShuffling) {
      setShuffleQueue(createShuffleQueue(songs.length, index));
    }
  };

  const nextSong = () => {
    if (playlist.length === 0) return;

    if (isShuffling) {
      if (shuffleQueue.length === 0) {
        setShuffleQueue(createShuffleQueue(playlist.length, currentIndex));
      }

      setCurrentIndex(prev => {
        const nextIndex = shuffleQueue[0];
        setShuffleQueue(prevQueue => prevQueue.slice(1));
        return nextIndex;
      });
    } else {
      setCurrentIndex(prev => {
        if (prev + 1 < playlist.length) return prev + 1;
        return isLooping ? 0 : prev;
      });
    }

    setIsPlaying(true);
  };

  const prevSong = () => {
    if (playlist.length === 0) return;

    if (isShuffling) {
      const prevIndex = Math.floor(Math.random() * playlist.length);
      setCurrentIndex(prevIndex);
    } else {
      setCurrentIndex(prev => {
        if (prev - 1 >= 0) return prev - 1;
        return isLooping ? playlist.length - 1 : prev;
      });
    }

    setIsPlaying(true);
  };

  const toggleShuffle = () => {
    setIsShuffling(prev => {
      const newState = !prev;
      if (newState) setIsLooping(false); // disable loop
      if (newState && playlist.length > 0 && currentIndex !== -1) {
        setShuffleQueue(createShuffleQueue(playlist.length, currentIndex));
      }
      return newState;
    });
  };

  const toggleLoop = () => {
    setIsLooping(prev => {
      const newState = !prev;
      if (newState) setIsShuffling(false); // disable shuffle
      return newState;
    });
  };

  // --- Sleep Timer Functions ---
  const startSleepTimer = (minutes) => {
    cancelSleepTimer(); // clear existing
    const id = setTimeout(() => {
      setIsPlaying(false);
      setSleepTimer(null);
      setSleepTimeoutId(null);
    }, minutes * 60 * 1000);

    setSleepTimer(minutes);
    setSleepTimeoutId(id);
  };

  const cancelSleepTimer = () => {
    if (sleepTimeoutId) clearTimeout(sleepTimeoutId);
    setSleepTimer(null);
    setSleepTimeoutId(null);
  };

  // --- Media Session API Integration ---
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!playlist.length || currentIndex === -1) return;

    const currentSong = playlist[currentIndex];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist || "Unknown Artist",
      album: currentSong.album || "",
      artwork: [
        { src: currentSong.coverImage || "/default-song.png", sizes: "512x512", type: "image/png" }
      ]
    });

    navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
    navigator.mediaSession.setActionHandler('previoustrack', prevSong);
    navigator.mediaSession.setActionHandler('nexttrack', nextSong);

  }, [playlist, currentIndex, isPlaying]);

  return (
    <PlayerContext.Provider
      value={{
        playlist,
        currentIndex,
        playSong,
        nextSong,
        prevSong,
        isPlaying,
        setIsPlaying,
        isLooping,
        setIsLooping: toggleLoop,
        isShuffling,
        setIsShuffling: toggleShuffle,
        sleepTimer,
        startSleepTimer,
        cancelSleepTimer,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
