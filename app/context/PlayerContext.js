// context/PlayerContext.js
"use client";
import { createContext, useContext, useState } from "react";

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false); // ✅ shuffle

  const playSong = (songs, index) => {
    setPlaylist(songs);
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  const nextSong = () => {
    if (isShuffling && playlist.length > 1) {
      // Pick a random index different from current
      let rand;
      do {
        rand = Math.floor(Math.random() * playlist.length);
      } while (rand === currentIndex);
      setCurrentIndex(rand);
    } else if (currentIndex < playlist.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    setIsPlaying(true);
  };

  const prevSong = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    setIsPlaying(true);
  };

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
        setIsLooping,
        isShuffling,
        setIsShuffling, // ✅ expose toggle
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
