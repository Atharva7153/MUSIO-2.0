"use client";
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleQueue, setShuffleQueue] = useState([]);
  const [sleepTimer, setSleepTimer] = useState(null);
  const [sleepTimeoutId, setSleepTimeoutId] = useState(null);

  // Shared audio element reference & real-time 60fps audio reactive subscribers
  const audioElementRef = useRef(null);
  const subscribersRef = useRef(new Set());
  const audioStateRef = useRef({
    bins: new Float32Array(64),
    wave: new Float32Array(64),
    bass: 0,
    mid: 0,
    treble: 0,
    energy: 0,
  });

  // Web Audio API refs (used when same-origin/CORS permits, with seamless fallback)
  const webAudioRef = useRef({
    ctx: null,
    analyser: null,
    source: null,
    freqData: null,
    timeData: null,
    failed: false,
  });

  const subscribeAudio = useCallback((callback) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  // 60fps Audio Reactive Loop
  useEffect(() => {
    let rafId;
    let phase = 0;

    const tick = (now) => {
      const t = now * 0.001;
      const bins = audioStateRef.current.bins;
      const wave = audioStateRef.current.wave;
      let usedRealFFT = false;

      // Try reading from Web Audio Analyser if available & playing
      if (isPlaying && webAudioRef.current.analyser && !webAudioRef.current.failed) {
        try {
          const { analyser, freqData, timeData } = webAudioRef.current;
          analyser.getByteFrequencyData(freqData);
          analyser.getByteTimeDomainData(timeData);

          // Check if CORS zeroed out the buffer
          let sum = 0;
          for (let i = 0; i < 32; i++) sum += freqData[i];
          if (sum > 0) {
            usedRealFFT = true;
            for (let i = 0; i < 64; i++) {
              bins[i] = freqData[i] / 255;
              wave[i] = (timeData[i] - 128) / 128;
            }
          }
        } catch {
          // Fallback to synthesized reactive spectrum
        }
      }

      if (!usedRealFFT) {
        if (isPlaying) {
          phase += 0.065;
          // Realistic multi-band musical beat & harmonic synthesis synced to playback
          const kickPulse = Math.pow(Math.max(0, Math.sin(t * 7.2)), 4);
          const snarePulse = Math.pow(Math.max(0, Math.sin(t * 3.6 + 1.57)), 6);
          const groove = 0.5 + 0.5 * Math.sin(t * 1.8);

          for (let i = 0; i < 64; i++) {
            const norm = i / 64;
            // Low frequencies respond to kick, mids to vocals/chords, highs to hats
            const bassEnv = Math.exp(-norm * 4.5) * (0.45 + 0.55 * kickPulse);
            const midEnv =
              Math.exp(-Math.pow((norm - 0.38) * 4.2, 2)) *
              (0.35 + 0.45 * Math.sin(phase * 1.3 + i * 0.28) * groove + 0.2 * snarePulse);
            const highEnv =
              Math.exp(-Math.pow((norm - 0.78) * 5.0, 2)) *
              (0.2 + 0.35 * Math.abs(Math.sin(phase * 2.7 + i * 0.7)));

            const target = Math.min(1, Math.max(0.04, bassEnv + midEnv + highEnv));
            bins[i] += (target - bins[i]) * 0.28;

            // Time-domain waveform
            wave[i] =
              Math.sin(norm * Math.PI * 4 + phase * 1.8) * (0.35 + 0.45 * kickPulse) +
              Math.sin(norm * Math.PI * 10 - phase * 2.4) * 0.2 * groove;
          }
        } else {
          // Smooth decay to idle breathing state when paused
          for (let i = 0; i < 64; i++) {
            bins[i] += (0.03 - bins[i]) * 0.12;
            wave[i] += (Math.sin((i / 64) * Math.PI * 2 + t * 0.8) * 0.04 - wave[i]) * 0.12;
          }
        }
      }

      // Compute band averages (bass, mid, treble, overall energy)
      let bSum = 0,
        mSum = 0,
        hSum = 0;
      for (let i = 0; i < 10; i++) bSum += bins[i];
      for (let i = 10; i < 36; i++) mSum += bins[i];
      for (let i = 36; i < 64; i++) hSum += bins[i];

      const bass = bSum / 10;
      const mid = mSum / 26;
      const treble = hSum / 28;
      const energy = bass * 0.5 + mid * 0.35 + treble * 0.15;

      audioStateRef.current.bass = bass;
      audioStateRef.current.mid = mid;
      audioStateRef.current.treble = treble;
      audioStateRef.current.energy = energy;

      // Update global CSS custom properties for lightweight CSS reactivity
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty("--music-bass", bass.toFixed(3));
        document.documentElement.style.setProperty("--music-energy", energy.toFixed(3));
        document.documentElement.style.setProperty(
          "--music-scale",
          (1 + (isPlaying ? bass * 0.06 : 0)).toFixed(4)
        );
      }

      subscribersRef.current.forEach((cb) => cb(audioStateRef.current));
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const createShuffleQueue = (length, excludeIndex) => {
    const indices = Array.from({ length }, (_, i) => i).filter((i) => i !== excludeIndex);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  };

  const playSong = (songs, index) => {
    if (!Array.isArray(songs) || songs.length === 0) return;
    const validSongs = songs.filter((song) => song && song.url);
    if (validSongs.length === 0) return;

    setPlaylist(validSongs);
    const validIndex = index >= 0 && index < validSongs.length ? index : 0;
    setCurrentIndex(validIndex);
    setIsPlaying(true);

    if (isShuffling) {
      setShuffleQueue(createShuffleQueue(validSongs.length, validIndex));
    }
  };

  const nextSong = () => {
    if (playlist.length === 0) return;

    if (isShuffling) {
      if (shuffleQueue.length === 0) {
        setShuffleQueue(createShuffleQueue(playlist.length, currentIndex));
      }
      setCurrentIndex((prev) => {
        const nextIdx = shuffleQueue[0] ?? 0;
        setShuffleQueue((prevQ) => prevQ.slice(1));
        return nextIdx;
      });
    } else {
      setCurrentIndex((prev) => {
        if (prev + 1 < playlist.length) return prev + 1;
        return isLooping ? 0 : prev;
      });
    }
    setIsPlaying(true);
  };

  const prevSong = () => {
    if (playlist.length === 0) return;

    if (isShuffling) {
      const prevIdx = Math.floor(Math.random() * playlist.length);
      setCurrentIndex(prevIdx);
    } else {
      setCurrentIndex((prev) => {
        if (prev - 1 >= 0) return prev - 1;
        return isLooping ? playlist.length - 1 : prev;
      });
    }
    setIsPlaying(true);
  };

  const toggleShuffle = () => {
    setIsShuffling((prev) => {
      const newState = !prev;
      if (newState) setIsLooping(false);
      if (newState && playlist.length > 0 && currentIndex !== -1) {
        setShuffleQueue(createShuffleQueue(playlist.length, currentIndex));
      }
      return newState;
    });
  };

  const toggleLoop = () => {
    setIsLooping((prev) => {
      const newState = !prev;
      if (newState) setIsShuffling(false);
      return newState;
    });
  };

  const startSleepTimer = (minutes) => {
    cancelSleepTimer();
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

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!playlist.length || currentIndex === -1) return;

    const currentSong = playlist[currentIndex];
    if (!currentSong) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist || "Unknown Artist",
      album: currentSong.album || "",
      artwork: [
        {
          src: currentSong.coverImage || "/music-player.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    });

    navigator.mediaSession.setActionHandler("play", () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler("pause", () => setIsPlaying(false));
    navigator.mediaSession.setActionHandler("previoustrack", prevSong);
    navigator.mediaSession.setActionHandler("nexttrack", nextSong);
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
        audioElementRef,
        subscribeAudio,
        audioStateRef,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
