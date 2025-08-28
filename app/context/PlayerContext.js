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
        // reshuffle
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
      // For simplicity, in shuffle mode prev just picks random (optional: implement shuffle history)
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
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
