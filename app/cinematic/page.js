"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "../context/PlayerContext";
import { gsap } from "gsap";

const ASPECT_RATIOS = [
  { id: "16:9", label: "16:9", name: "Widescreen", value: 16 / 9 },
  { id: "1.43:1", label: "1.43:1", name: "IMAX 70mm", value: 1.43 },
  { id: "2.39:1", label: "2.39:1", name: "Anamorphic", value: 2.39 },
  { id: "1.85:1", label: "1.85:1", name: "Cinema Flat", value: 1.85 },
  { id: "2.76:1", label: "2.76:1", name: "Ultra Panavision", value: 2.76 },
  { id: "4:3", label: "4:3", name: "Academy", value: 4 / 3 },
];

const BIOMES = [
  {
    id: "solar",
    label: "Solar Dusk",
    skyTop: "#0B0716",
    skyMid: "#2A0F2D",
    skyHorizon: "#FF5500",
    sunCore: "#FFF3D1",
    sunGlow: "#FF5500",
    ridge1: "#230D26",
    ridge2: "#16081C",
    ridge3: "#0A0410",
    rimLight: "rgba(255, 115, 0, 0.7)",
    waterTop: "#1C091D",
    waterBot: "#050208",
    emberColors: ["#FF5500", "#FF9E00", "#FF2E63", "#FFF3B0"],
  },
  {
    id: "aurora",
    label: "Midnight Aurora",
    skyTop: "#020308",
    skyMid: "#081226",
    skyHorizon: "#0F3847",
    sunCore: "#E0F2FE",
    sunGlow: "#06B6D4",
    ridge1: "#0B1D2C",
    ridge2: "#07131E",
    ridge3: "#030910",
    rimLight: "rgba(16, 185, 129, 0.65)",
    waterTop: "#071925",
    waterBot: "#02050A",
    emberColors: ["#10B981", "#06B6D4", "#8B5CF6", "#38BDF8"],
  },
  {
    id: "prism",
    label: "Prism Horizon",
    skyTop: "#05030A",
    skyMid: "#190B2E",
    skyHorizon: "#701A75",
    sunCore: "#FDF4FF",
    sunGlow: "#EC4899",
    ridge1: "#1E0B36",
    ridge2: "#120624",
    ridge3: "#080212",
    rimLight: "rgba(236, 72, 153, 0.72)",
    waterTop: "#17072B",
    waterBot: "#04010A",
    emberColors: ["#EC4899", "#8B5CF6", "#06B6D4", "#FF5500"],
  },
];

export default function CinematicPage() {
  const router = useRouter();
  const {
    playlist,
    currentIndex,
    isPlaying,
    playSong,
    nextSong,
    prevSong,
    setIsPlaying,
    subscribeAudio,
  } = usePlayer();

  const [ratioIdx, setRatioIdx] = useState(0); // Default 16:9
  const [biomeIdx, setBiomeIdx] = useState(0); // Default Solar Dusk
  const [hudVisible, setHudVisible] = useState(false);

  const canvasRef = useRef(null);
  const topBarRef = useRef(null);
  const bottomBarRef = useRef(null);
  const leftBarRef = useRef(null);
  const rightBarRef = useRef(null);

  const ratioIdxRef = useRef(ratioIdx);
  const biomeIdxRef = useRef(biomeIdx);
  const transitionRef = useRef({
    active: false,
    progress: 0,
    title: "",
    artist: "",
    particles: [],
  });

  useEffect(() => {
    ratioIdxRef.current = ratioIdx;
  }, [ratioIdx]);

  useEffect(() => {
    biomeIdxRef.current = biomeIdx;
  }, [biomeIdx]);

  const currentSong = currentIndex >= 0 ? playlist[currentIndex] : null;

  /* ── Auto-load library if opened directly with empty queue ── */
  useEffect(() => {
    if (playlist.length === 0) {
      fetch("/api/songs/all")
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d?.songs) && d.songs.length > 0) {
            playSong(d.songs, 0);
          }
        })
        .catch(() => {});
    }
  }, [playlist.length, playSong]);

  /* ── Smooth GSAP Aspect Ratio Letterbox & Pillarbox Masking Bars ── */
  const animateCinemaBars = useCallback((targetRatioValue, initialMount = false) => {
    if (typeof window === "undefined") return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const viewportRatio = vw / vh;

    // Leave a subtle cinematic frame margin so even matching ratios show smooth framing
    const frameScale = 0.92;
    let activeW = vw * frameScale;
    let activeH = vh * frameScale;

    if (viewportRatio > targetRatioValue) {
      // Viewport is wider than target aspect ratio -> Pillarbox + subtle letterbox
      activeH = vh * frameScale;
      activeW = activeH * targetRatioValue;
    } else {
      // Viewport is taller than target aspect ratio -> Letterbox + subtle pillarbox
      activeW = vw * frameScale;
      activeH = activeW / targetRatioValue;
    }

    const barTopBottom = Math.max(0, (vh - activeH) / 2);
    const barLeftRight = Math.max(0, (vw - activeW) / 2);

    const dur = initialMount ? 1.15 : 0.85;
    const ease = "power3.inOut";

    if (initialMount) {
      gsap.fromTo(
        [topBarRef.current, bottomBarRef.current],
        { height: 0 },
        { height: barTopBottom, duration: dur, ease }
      );
      gsap.fromTo(
        [leftBarRef.current, rightBarRef.current],
        { width: 0 },
        { width: barLeftRight, duration: dur, ease }
      );
    } else {
      gsap.to([topBarRef.current, bottomBarRef.current], {
        height: barTopBottom,
        duration: dur,
        ease,
        overwrite: "auto",
      });
      gsap.to([leftBarRef.current, rightBarRef.current], {
        width: barLeftRight,
        duration: dur,
        ease,
        overwrite: "auto",
      });
    }
  }, []);

  useEffect(() => {
    const target = ASPECT_RATIOS[ratioIdx].value;
    animateCinemaBars(target, true);

    const onResize = () => {
      animateCinemaBars(ASPECT_RATIOS[ratioIdxRef.current].value, false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [animateCinemaBars]);

  useEffect(() => {
    animateCinemaBars(ASPECT_RATIOS[ratioIdx].value, false);
  }, [ratioIdx, animateCinemaBars]);

  /* ── Particle Transition Cutscene on Track Change ── */
  const triggerParticleTransition = useCallback((songTitle, songArtist) => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight : 720;
    const cx = vw / 2;
    const cy = vh / 2;
    const palette = BIOMES[biomeIdxRef.current].emberColors;

    const count = 520;
    const pts = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const burstDist = 80 + Math.random() * Math.max(vw, vh) * 0.48;
      const ringRadius = Math.min(vw, vh) * 0.16;
      const ringAngle = (i / count) * Math.PI * 2;

      return {
        // Start tightly clustered at center core
        sx: cx + (Math.random() - 0.5) * 40,
        sy: cy + (Math.random() - 0.5) * 40,
        // Midpoint explosion vortex
        mx: cx + Math.cos(angle) * burstDist,
        my: cy + Math.sin(angle) * burstDist,
        // Converge into celestial ring around new track emblem
        tx: cx + Math.cos(ringAngle) * ringRadius + (Math.random() - 0.5) * 14,
        ty: cy * 0.78 + Math.sin(ringAngle) * (ringRadius * 0.42) + (Math.random() - 0.5) * 14,
        size: 1.5 + Math.random() * 3.5,
        color: palette[i % palette.length],
        swirl: (Math.random() - 0.5) * 3.2,
      };
    });

    transitionRef.current = {
      active: true,
      progress: 0,
      title: songTitle || "MUSIO 2.0",
      artist: songArtist || "",
      particles: pts,
    };

    gsap.killTweensOf(transitionRef.current);
    gsap.fromTo(
      transitionRef.current,
      { progress: 0 },
      {
        progress: 1,
        duration: 2.6,
        ease: "power2.inOut",
        onComplete: () => {
          transitionRef.current.active = false;
        },
      }
    );
  }, []);

  // Trigger Particle Transition whenever currentSong changes
  useEffect(() => {
    if (currentSong) {
      triggerParticleTransition(currentSong.title, currentSong.artist);
    }
  }, [currentSong?._id, triggerParticleTransition]);

  /* ── Auto-Hide Minimal Overlay after 1.6s of No Mouse Movement ── */
  useEffect(() => {
    let timer;
    const wakeHud = () => {
      setHudVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setHudVisible(false);
      }, 1600);
    };

    window.addEventListener("mousemove", wakeHud);
    window.addEventListener("touchstart", wakeHud);
    return () => {
      window.removeEventListener("mousemove", wakeHud);
      window.removeEventListener("touchstart", wakeHud);
      clearTimeout(timer);
    };
  }, []);

  /* ── Keyboard Shortcuts so user never needs UI ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        nextSong();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        prevSong();
      } else if (e.code === "KeyR") {
        e.preventDefault();
        setRatioIdx((prev) => (prev + 1) % ASPECT_RATIOS.length);
      } else if (e.code === "KeyB") {
        e.preventDefault();
        setBiomeIdx((prev) => (prev + 1) % BIOMES.length);
      } else if (e.code === "KeyF") {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.code === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          router.push("/");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPlaying, nextSong, prevSong, router, setIsPlaying]);

  /* ── 60FPS 2D Music-Reactive Scenery Canvas Engine ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let scrollX = 0;
    let skyPhase = 0;

    // Generate Starfield
    const stars = Array.from({ length: 140 }, (_, i) => ({
      x: Math.random(),
      y: Math.random() * 0.56,
      r: 0.6 + Math.random() * 1.8,
      twinkleOffset: Math.random() * Math.PI * 2,
      bin: i % 48,
    }));

    // Shooting stars triggered by high-frequency peaks
    const meteors = [];

    // Drifting atmospheric fireflies / embers
    const fireflies = Array.from({ length: 55 }, (_, i) => ({
      x: Math.random(),
      y: 0.35 + Math.random() * 0.6,
      vx: (Math.random() - 0.5) * 0.0005,
      vy: -0.0003 - Math.random() * 0.0006,
      size: 1.5 + Math.random() * 2.8,
      phase: Math.random() * Math.PI * 2,
      colorIdx: i % 4,
    }));

    // Deterministic procedural mountain height function
    const getMountainHeight = (xCoord, seed, roughness, scale) => {
      return (
        Math.sin(xCoord * 0.0022 * scale + seed) * 52 * roughness +
        Math.sin(xCoord * 0.0058 * scale + seed * 2.1) * 26 * roughness +
        Math.cos(xCoord * 0.013 * scale - seed * 1.4) * 12 * roughness
      );
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const unsubscribe = subscribeAudio((audio) => {
      if (!width || !height) return;

      const biome = BIOMES[biomeIdxRef.current];
      const horizonY = height * 0.66;

      // Advance parallax camera speed based on musical energy
      scrollX += isPlaying ? 0.55 + audio.energy * 2.2 : 0.18;
      skyPhase += isPlaying ? 0.025 + audio.mid * 0.06 : 0.008;

      /* 1. SKY GRADIENT */
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, biome.skyTop);
      skyGrad.addColorStop(0.55, biome.skyMid);
      skyGrad.addColorStop(1, biome.skyHorizon);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, horizonY);

      /* 2. TWINKLING AUDIO-REACTIVE STARFIELD */
      stars.forEach((st) => {
        const freqVal = audio.bins[st.bin] || 0.05;
        const alpha =
          0.25 +
          0.45 * Math.sin(skyPhase * 2 + st.twinkleOffset) +
          freqVal * 0.45;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, Math.max(0.1, alpha))})`;
        ctx.beginPath();
        ctx.arc(st.x * width, st.y * height, st.r * (1 + freqVal * 0.6), 0, Math.PI * 2);
        ctx.fill();
      });

      /* 3. SHOOTING STARS ON TREBLE / SNARE PEAKS */
      if (isPlaying && audio.treble > 0.36 && meteors.length < 3 && Math.random() < 0.18) {
        meteors.push({
          x: width * (0.2 + Math.random() * 0.7),
          y: height * (0.08 + Math.random() * 0.25),
          vx: -9 - Math.random() * 6,
          vy: 4 + Math.random() * 3,
          life: 1,
        });
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx;
        m.y += m.vy;
        m.life -= 0.035;
        if (m.life <= 0) {
          meteors.splice(i, 1);
          continue;
        }
        const tailGrad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 6, m.y - m.vy * 6);
        tailGrad.addColorStop(0, `rgba(255, 255, 255, ${m.life})`);
        tailGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.strokeStyle = tailGrad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 6, m.y - m.vy * 6);
        ctx.stroke();
      }

      /* 4. AURORA / HARMONIC SKY RIBBONS */
      for (let a = 0; a < 2; a++) {
        ctx.beginPath();
        ctx.strokeStyle = biome.emberColors[a];
        ctx.globalAlpha = 0.14 + audio.mid * 0.24;
        ctx.lineWidth = 28 + audio.bass * 36;
        ctx.lineCap = "round";

        for (let x = 0; x <= width; x += 24) {
          const norm = x / width;
          const y =
            height * (0.24 + a * 0.08) +
            Math.sin(norm * Math.PI * 3 + skyPhase * (1 + a * 0.4)) * (24 + audio.mid * 55);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      /* 5. CELESTIAL SUN / MOON (Bass-Reactive + Horizon Slices) */
      const sunX = width * 0.5;
      const sunY = horizonY - height * 0.12;
      const baseSunR = Math.min(width, height) * 0.135;
      const sunR = baseSunR * (1 + audio.bass * 0.18);

      // Outer atmospheric sun halo
      const haloGrad = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.6);
      haloGrad.addColorStop(0, biome.sunCore);
      haloGrad.addColorStop(0.35, biome.sunGlow);
      haloGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 2.6, 0, Math.PI * 2);
      ctx.fill();

      // Sun disc with horizontal cinematic scanline cutouts
      ctx.save();
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.clip();

      const discGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
      discGrad.addColorStop(0, biome.sunCore);
      discGrad.addColorStop(1, biome.sunGlow);
      ctx.fillStyle = discGrad;
      ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);

      // Horizontal synth/cinema slices in lower half of sun
      ctx.fillStyle = biome.skyMid;
      for (let s = 0; s < 6; s++) {
        const sliceY = sunY + sunR * (0.12 + s * 0.15);
        const sliceH = 2 + s * 1.6;
        ctx.fillRect(sunX - sunR, sliceY, sunR * 2, sliceH);
      }
      ctx.restore();

      /* 6. PARALLAX MOUNTAIN RIDGES + AUDIO-REACTIVE RIM LIGHT */
      const layers = [
        { speed: 0.25, seed: 1.2, roughness: 1.15, scale: 0.9, baseOffset: 95, color: biome.ridge1, rim: true },
        { speed: 0.55, seed: 3.7, roughness: 0.85, scale: 1.25, baseOffset: 52, color: biome.ridge2, rim: true },
        { speed: 1.0, seed: 6.4, roughness: 0.55, scale: 1.7, baseOffset: 18, color: biome.ridge3, rim: false },
      ];

      layers.forEach((layer, idx) => {
        ctx.beginPath();
        ctx.moveTo(0, horizonY);

        for (let x = 0; x <= width; x += 8) {
          const worldX = x + scrollX * layer.speed;
          const binIdx = Math.min(63, Math.floor((x / width) * 48));
          const audioLift = (audio.bins[binIdx] || 0) * (idx === 0 ? 22 : 12);
          const h =
            layer.baseOffset +
            getMountainHeight(worldX, layer.seed, layer.roughness, layer.scale) +
            audioLift;
          ctx.lineTo(x, horizonY - Math.max(4, h));
        }

        ctx.lineTo(width, horizonY);
        ctx.closePath();
        ctx.fillStyle = layer.color;
        ctx.fill();

        if (layer.rim) {
          ctx.strokeStyle = biome.rimLight;
          ctx.lineWidth = 1.2 + audio.bass * 1.8;
          ctx.stroke();
        }
      });

      /* 7. FOREGROUND MIRROR LAKE & AUDIO-REACTIVE WATER SHIMMER */
      const waterH = height - horizonY;
      const waterGrad = ctx.createLinearGradient(0, horizonY, 0, height);
      waterGrad.addColorStop(0, biome.waterTop);
      waterGrad.addColorStop(1, biome.waterBot);
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, horizonY, width, waterH);

      // Sun reflection column shimmering on the lake
      for (let i = 0; i < 34; i++) {
        const normY = i / 34;
        const ry = horizonY + 6 + normY * (waterH * 0.88);
        const binVal = audio.bins[i] || 0.08;
        const shimmerW =
          (sunR * 1.4 * (1 - normY * 0.55) + binVal * 95) *
          (0.65 + 0.35 * Math.sin(skyPhase * 3 + i * 0.9));
        const offsetX = Math.sin(skyPhase * 2.2 + i * 0.7) * (8 + normY * 18);

        ctx.fillStyle = biome.sunGlow;
        ctx.globalAlpha = (1 - normY * 0.75) * (0.22 + binVal * 0.45);
        ctx.beginPath();
        ctx.roundRect(sunX - shimmerW / 2 + offsetX, ry, shimmerW, 2.2 + normY * 2.5, 99);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Crisp horizon divider line
      ctx.strokeStyle = biome.sunGlow;
      ctx.globalAlpha = 0.45 + audio.bass * 0.4;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(width, horizonY);
      ctx.stroke();
      ctx.globalAlpha = 1;

      /* 8. DRIFTING ATMOSPHERIC FIREFLIES / EMBERS */
      fireflies.forEach((f) => {
        f.x += f.vx * (1 + audio.energy * 2);
        f.y += f.vy * (1 + audio.bass * 2.5);
        f.phase += 0.05;
        if (f.y < 0.05) {
          f.y = 0.95;
          f.x = Math.random();
        }
        if (f.x < 0) f.x = 1;
        if (f.x > 1) f.x = 0;

        const glowAlpha = 0.35 + 0.45 * Math.sin(f.phase) + audio.bass * 0.2;
        ctx.fillStyle = biome.emberColors[f.colorIdx];
        ctx.globalAlpha = Math.min(1, Math.max(0.1, glowAlpha));
        ctx.beginPath();
        ctx.arc(f.x * width, f.y * height, f.size * (1 + audio.bass * 0.5), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      /* 9. PARTICLE TRACK-TRANSITION CUTSCENE */
      const tr = transitionRef.current;
      if (tr.active) {
        const p = tr.progress;
        // Phase 1 (0 -> 0.45): Explode outward into vortex
        // Phase 2 (0.45 -> 0.85): Converge into celestial ring
        // Phase 3 (0.85 -> 1.0): Dissolve gently into sky
        const fadeOut = p > 0.8 ? 1 - (p - 0.8) / 0.2 : 1;

        tr.particles.forEach((pt) => {
          let x, y;
          if (p < 0.45) {
            const t = p / 0.45;
            const easeOut = 1 - Math.pow(1 - t, 3);
            const swirlAngle = easeOut * pt.swirl;
            const dx = (pt.mx - pt.sx) * easeOut;
            const dy = (pt.my - pt.sy) * easeOut;
            x = pt.sx + dx * Math.cos(swirlAngle) - dy * Math.sin(swirlAngle);
            y = pt.sy + dx * Math.sin(swirlAngle) + dy * Math.cos(swirlAngle);
          } else {
            const t = Math.min(1, (p - 0.45) / 0.4);
            const easeInOut = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            x = pt.mx + (pt.tx - pt.mx) * easeInOut;
            y = pt.my + (pt.ty - pt.my) * easeInOut;
          }

          ctx.fillStyle = pt.color;
          ctx.globalAlpha = fadeOut * 0.9;
          ctx.beginPath();
          ctx.arc(x, y, pt.size * (1 + Math.sin(p * Math.PI) * 0.8), 0, Math.PI * 2);
          ctx.fill();
        });

        // Subtle sky title projection during convergence (dissolves completely so 0 UI remains)
        if (p > 0.32 && p < 0.92) {
          const textAlpha =
            p < 0.55
              ? (p - 0.32) / 0.23
              : p > 0.75
              ? 1 - (p - 0.75) / 0.17
              : 1;
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, textAlpha * 0.88));
          ctx.textAlign = "center";
          ctx.fillStyle = "#FFFFFF";
          ctx.font = `700 ${Math.round(Math.min(width, height) * 0.038)}px 'Space Grotesk', sans-serif`;
          ctx.fillText(tr.title, width / 2, height * 0.38);

          if (tr.artist) {
            ctx.font = `500 ${Math.round(Math.min(width, height) * 0.018)}px 'Inter', sans-serif`;
            ctx.fillStyle = "rgba(255,255,255,0.72)";
            ctx.fillText(tr.artist.toUpperCase(), width / 2, height * 0.38 + 28);
          }
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener("resize", resize);
    };
  }, [subscribeAudio, isPlaying]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        background: "#000000",
        overflow: "hidden",
        cursor: hudVisible ? "default" : "none",
        userSelect: "none",
        zIndex: 9990,
      }}
    >
      {/* 2D Scenery Canvas */}
      <canvas
        ref={canvasRef}
        onClick={() => setIsPlaying(!isPlaying)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />

      {/* ── 4 SMOOTH GSAP ASPECT-RATIO CINEMA MASK BARS ── */}
      {/* Top Letterbox Bar */}
      <div
        ref={topBarRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 0,
          background: "#000000",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />
      {/* Bottom Letterbox Bar */}
      <div
        ref={bottomBarRef}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 0,
          background: "#000000",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />
      {/* Left Pillarbox Bar */}
      <div
        ref={leftBarRef}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 0,
          background: "#000000",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />
      {/* Right Pillarbox Bar */}
      <div
        ref={rightBarRef}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: 0,
          background: "#000000",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />

      {/* ── AUTO-HIDING ZERO-UI RATIO & SCENE STRIP (Hidden unless mouse moves) ── */}
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          borderRadius: 999,
          background: "rgba(10, 10, 14, 0.72)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          opacity: hudVisible ? 1 : 0,
          pointerEvents: hudVisible ? "auto" : "none",
          transition: "opacity 0.45s ease",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {/* Aspect Ratio Buttons */}
        {ASPECT_RATIOS.map((r, i) => {
          const active = ratioIdx === i;
          return (
            <button
              key={r.id}
              onClick={() => setRatioIdx(i)}
              title={r.name}
              style={{
                padding: "5px 11px",
                borderRadius: 999,
                border: "none",
                background: active ? "#FF5500" : "transparent",
                color: active ? "#FFFFFF" : "rgba(255,255,255,0.68)",
                fontFamily: "var(--font-display)",
                fontSize: "0.74rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {r.label}
            </button>
          );
        })}

        <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />

        {/* Biome Switcher */}
        {BIOMES.map((b, i) => {
          const active = biomeIdx === i;
          return (
            <button
              key={b.id}
              onClick={() => setBiomeIdx(i)}
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: "none",
                background: active ? "rgba(255,255,255,0.16)" : "transparent",
                color: active ? "#FFFFFF" : "rgba(255,255,255,0.55)",
                fontFamily: "var(--font-display)",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {b.label}
            </button>
          );
        })}

        <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />

        {/* Trigger Particle Cutscene / Next Track */}
        <button
          onClick={nextSong}
          title="Next Track (Particle Transition)"
          style={{
            padding: "5px 10px",
            borderRadius: 999,
            border: "none",
            background: "rgba(255,255,255,0.1)",
            color: "#FFFFFF",
            fontFamily: "var(--font-display)",
            fontSize: "0.72rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ✦ Next
        </button>

        {/* Exit Cinema */}
        <button
          onClick={() => router.push("/")}
          title="Exit Cinematic Mode (Esc)"
          style={{
            padding: "5px 10px",
            borderRadius: 999,
            border: "none",
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.7)",
            fontFamily: "var(--font-display)",
            fontSize: "0.72rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
