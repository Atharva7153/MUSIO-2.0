"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "../context/PlayerContext";
import { gsap } from "gsap";

const ASPECT_RATIOS = [
  { id: "16:9", label: "16:9", name: "Widescreen", value: 16 / 9 },
  { id: "1.43:1", label: "1.43:1", name: "IMAX 70mm", value: 1.43 },
  { id: "2.39:1", label: "2.39:1", name: "Anamorphic Scope", value: 2.39 },
  { id: "1.85:1", label: "1.85:1", name: "Cinema Flat", value: 1.85 },
  { id: "2.76:1", label: "2.76:1", name: "Ultra Panavision", value: 2.76 },
  { id: "4:3", label: "4:3", name: "Academy 35mm", value: 4 / 3 },
];

const SCENES = [
  { id: "meadow", label: "Summer Meadow (Day)" },
  { id: "sakura", label: "Kyoto Cliffside" },
  { id: "train", label: "Midnight Express" },
  { id: "canyon", label: "Firewatch Canyon" },
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
  } = usePlayer();

  const [ratioIdx, setRatioIdx] = useState(0); // 16:9 default
  const [sceneIdx, setSceneIdx] = useState(0); // Summer Meadow (Day) default
  const [hudVisible, setHudVisible] = useState(false);

  const canvasRef = useRef(null);
  const topBarRef = useRef(null);
  const bottomBarRef = useRef(null);
  const leftBarRef = useRef(null);
  const rightBarRef = useRef(null);

  const ratioIdxRef = useRef(ratioIdx);
  const sceneIdxRef = useRef(sceneIdx);
  const prevSongIdRef = useRef(null);
  const hasMountedRef = useRef(false);

  // Gentle wind-swept particle drift state (ONLY on track change, NEVER on initial mount)
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
    sceneIdxRef.current = sceneIdx;
  }, [sceneIdx]);

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

    const frameScale = 0.92;
    let activeW = vw * frameScale;
    let activeH = vh * frameScale;

    if (viewportRatio > targetRatioValue) {
      activeH = vh * frameScale;
      activeW = activeH * targetRatioValue;
    } else {
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
    animateCinemaBars(ASPECT_RATIOS[ratioIdx].value, true);
    const onResize = () => {
      animateCinemaBars(ASPECT_RATIOS[ratioIdxRef.current].value, false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [animateCinemaBars]);

  useEffect(() => {
    animateCinemaBars(ASPECT_RATIOS[ratioIdx].value, false);
  }, [ratioIdx, animateCinemaBars]);

  /* ── Gentle Wind-Swept Particle Drift ONLY When Switching Tracks ── */
  const triggerTrackTransition = useCallback((songTitle, songArtist) => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight : 720;

    const colors = ["#FFB7C5", "#FFD166", "#FF7B54", "#FFF8F0"];
    const pts = Array.from({ length: 140 }, (_, i) => ({
      startX: -60 - Math.random() * vw * 0.35,
      startY: Math.random() * vh,
      endX: vw + 60 + Math.random() * vw * 0.35,
      endY: Math.random() * vh - 80,
      waveAmp: 18 + Math.random() * 45,
      waveFreq: 1.5 + Math.random() * 2.5,
      size: 2 + Math.random() * 3.5,
      color: colors[i % colors.length],
      rot: Math.random() * Math.PI * 2,
    }));

    transitionRef.current = {
      active: true,
      progress: 0,
      title: songTitle || "",
      artist: songArtist || "",
      particles: pts,
    };

    gsap.killTweensOf(transitionRef.current);
    gsap.fromTo(
      transitionRef.current,
      { progress: 0 },
      {
        progress: 1,
        duration: 2.8,
        ease: "power1.inOut",
        onComplete: () => {
          transitionRef.current.active = false;
        },
      }
    );
  }, []);

  // Only fire transition when switching from one song ID to a DIFFERENT song ID (never on mount!)
  useEffect(() => {
    if (!currentSong?._id) return;
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      prevSongIdRef.current = currentSong._id;
      return;
    }
    if (prevSongIdRef.current && prevSongIdRef.current !== currentSong._id) {
      prevSongIdRef.current = currentSong._id;
      triggerTrackTransition(currentSong.title, currentSong.artist);
    }
  }, [currentSong?._id, currentSong?.title, currentSong?.artist, triggerTrackTransition]);

  /* ── Auto-Hide Minimal Overlay after 1.5s of Inactivity ── */
  useEffect(() => {
    let timer;
    const wakeHud = () => {
      setHudVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setHudVisible(false);
      }, 1500);
    };

    window.addEventListener("mousemove", wakeHud);
    window.addEventListener("touchstart", wakeHud);
    return () => {
      window.removeEventListener("mousemove", wakeHud);
      window.removeEventListener("touchstart", wakeHud);
      clearTimeout(timer);
    };
  }, []);

  /* ── Keyboard Shortcuts ── */
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
        setSceneIdx((prev) => (prev + 1) % SCENES.length);
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

  /* ── Pure Non-Music-Synced 60FPS 2D Scenery Animation Engine ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let rafId;
    let t = 0;

    // Stars
    const stars = Array.from({ length: 160 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.65,
      r: 0.5 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.2,
    }));

    // Volumetric painted clouds
    const clouds = Array.from({ length: 7 }, (_, i) => ({
      x: (i / 7) * 1.2 - 0.1,
      y: 0.16 + (i % 3) * 0.1,
      w: 220 + (i % 4) * 90,
      h: 28 + (i % 3) * 14,
      speed: 0.0001 + (i % 3) * 0.00005,
    }));

    // Falling Sakura Petals / Dandelion Seeds / Embers
    const petals = Array.from({ length: 65 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      vx: -0.00045 - Math.random() * 0.0005,
      vy: 0.00035 + Math.random() * 0.00045,
      size: 2.5 + Math.random() * 3.5,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.03,
      swayPhase: Math.random() * Math.PI * 2,
      flowerColor: ["#FF5964", "#FFD166", "#FFFFFF", "#FF9F1C"][i % 4],
    }));

    // Soaring Daytime Flock of Birds
    const birds = Array.from({ length: 7 }, (_, i) => ({
      x: 0.15 + i * 0.045 + (i % 2) * 0.02,
      y: 0.24 + Math.abs(i - 3) * 0.022,
      wingPhase: i * 0.7,
      scale: 0.8 + (i % 3) * 0.2,
    }));

    // Occasional calm shooting star
    let shootingStar = null;

    // Helper for smooth procedural mountain ridge
    const ridgeHeight = (x, seed, amp1, amp2) =>
      Math.sin(x * 0.0018 + seed) * amp1 +
      Math.sin(x * 0.0045 + seed * 2.3) * amp2 +
      Math.cos(x * 0.009 - seed) * (amp2 * 0.4);

    // Helper to draw pine tree silhouettes along a ridge
    const drawPineForest = (baseYFn, step, treeH, color) => {
      ctx.fillStyle = color;
      for (let x = 0; x <= width; x += step) {
        const by = baseYFn(x);
        const h = treeH * (0.75 + 0.35 * Math.sin(x * 0.37));
        ctx.beginPath();
        ctx.moveTo(x, by - h);
        ctx.lineTo(x - step * 0.85, by + 4);
        ctx.lineTo(x + step * 0.85, by + 4);
        ctx.closePath();
        ctx.fill();
      }
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

    const render = () => {
      t += 0.016;
      const activeScene = SCENES[sceneIdxRef.current].id;

      /* ════════════════════════════════════════════════════════════════
         SCENE 0: SUMMER MEADOW (DAYTIME — Ghibli Sky, Windmill & Hills)
         ════════════════════════════════════════════════════════════════ */
      if (activeScene === "meadow") {
        // 1. Bright Cerulean-to-Sunlit-Cyan Daytime Sky
        const sky = ctx.createLinearGradient(0, 0, 0, height * 0.78);
        sky.addColorStop(0, "#1A66B8");
        sky.addColorStop(0.42, "#4AA3DF");
        sky.addColorStop(0.78, "#90D5F5");
        sky.addColorStop(1, "#E8F8FC");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        // 2. Radiant Daytime Sun & Soft Diagonal Sunbeams
        const sunX = width * 0.18;
        const sunY = height * 0.22;
        const sunR = Math.min(width, height) * 0.075;

        const sunHalo = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 4.2);
        sunHalo.addColorStop(0, "rgba(255, 255, 240, 0.98)");
        sunHalo.addColorStop(0.28, "rgba(255, 245, 190, 0.55)");
        sunHalo.addColorStop(0.65, "rgba(255, 235, 150, 0.15)");
        sunHalo.addColorStop(1, "rgba(255, 235, 150, 0)");
        ctx.fillStyle = sunHalo;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR * 4.2, 0, Math.PI * 2);
        ctx.fill();

        // Diagonal volumetric sunbeams
        ctx.save();
        for (let r = 0; r < 4; r++) {
          const beamAngle = 0.45 + r * 0.16 + Math.sin(t * 0.25 + r) * 0.02;
          ctx.save();
          ctx.translate(sunX, sunY);
          ctx.rotate(beamAngle);
          const bGrad = ctx.createLinearGradient(0, 0, width * 0.9, 0);
          bGrad.addColorStop(0, "rgba(255, 253, 225, 0.12)");
          bGrad.addColorStop(1, "rgba(255, 253, 225, 0)");
          ctx.fillStyle = bGrad;
          ctx.beginPath();
          ctx.moveTo(0, -18);
          ctx.lineTo(width * 0.95, -75);
          ctx.lineTo(width * 0.95, 75);
          ctx.lineTo(0, 18);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();

        // 3. Fluffy Puffed White Cumulus Clouds
        clouds.forEach((c, idx) => {
          c.x += c.speed * 1.4;
          if (c.x > 1.18) c.x = -0.25;
          const cx = c.x * width;
          const cy = c.y * height;
          const cw = c.w * 0.95;
          const ch = c.h * 1.3;

          // Cloud soft blue-grey shadow base
          ctx.fillStyle = "rgba(186, 218, 242, 0.75)";
          ctx.beginPath();
          ctx.roundRect(cx - cw * 0.48, cy + ch * 0.1, cw * 0.96, ch * 0.65, 99);
          ctx.fill();

          // Fluffy white cloud domes
          ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
          const puffs = [
            { ox: -cw * 0.26, oy: ch * 0.05, r: ch * 0.62 },
            { ox: -cw * 0.05, oy: -ch * 0.18, r: ch * 0.85 },
            { ox: cw * 0.2, oy: -ch * 0.04, r: ch * 0.72 },
            { ox: cw * 0.36, oy: ch * 0.14, r: ch * 0.5 },
          ];
          puffs.forEach((pf) => {
            ctx.beginPath();
            ctx.arc(cx + pf.ox, cy + pf.oy, pf.r, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.beginPath();
          ctx.roundRect(cx - cw * 0.45, cy, cw * 0.9, ch * 0.62, 99);
          ctx.fill();
        });

        // 4. Distant Snow-Capped Alpine Mountains
        const mBaseY = height * 0.68;
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 10) {
          const h = ridgeHeight(x + 200, 1.4, 85, 36);
          ctx.lineTo(x, mBaseY - Math.abs(h));
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        const mGrad = ctx.createLinearGradient(0, mBaseY - 120, 0, mBaseY + 40);
        mGrad.addColorStop(0, "#E2F1F8");
        mGrad.addColorStop(0.35, "#8AB4D0");
        mGrad.addColorStop(1, "#5E8FB2");
        ctx.fillStyle = mGrad;
        ctx.fill();

        // 5. Soaring Flock of Birds in the Daytime Sky
        ctx.strokeStyle = "#2C5270";
        ctx.lineWidth = 1.8;
        birds.forEach((b) => {
          b.x += 0.00028;
          if (b.x > 1.1) b.x = -0.1;
          const bx = b.x * width;
          const by = (b.y + Math.sin(t * 0.8 + b.wingPhase) * 0.008) * height;
          const flap = Math.sin(t * 5.2 + b.wingPhase) * 5 * b.scale;
          const span = 8 * b.scale;

          ctx.beginPath();
          ctx.moveTo(bx - span, by - flap);
          ctx.quadraticCurveTo(bx - span * 0.4, by - Math.abs(flap) * 0.5, bx, by);
          ctx.quadraticCurveTo(bx + span * 0.4, by - Math.abs(flap) * 0.5, bx + span, by - flap);
          ctx.stroke();
        });

        // 6. Rolling Sunlit Green Hills (3 Layers)
        const hills = [
          { base: height * 0.72, amp: 38, freq: 0.0016, phase: 0.5, topColor: "#68B66B", botColor: "#3D8B4E" },
          { base: height * 0.79, amp: 32, freq: 0.0022, phase: 2.1, topColor: "#82C95E", botColor: "#4A9B4B" },
          { base: height * 0.86, amp: 24, freq: 0.0028, phase: 4.0, topColor: "#9ED95A", botColor: "#58A642" },
        ];

        hills.forEach((hl) => {
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let x = 0; x <= width; x += 12) {
            const hy =
              hl.base +
              Math.sin(x * hl.freq + hl.phase) * hl.amp +
              Math.cos(x * hl.freq * 1.9 - hl.phase) * (hl.amp * 0.4);
            ctx.lineTo(x, hy);
          }
          ctx.lineTo(width, height);
          ctx.closePath();
          const hGrad = ctx.createLinearGradient(0, hl.base - hl.amp, 0, height);
          hGrad.addColorStop(0, hl.topColor);
          hGrad.addColorStop(1, hl.botColor);
          ctx.fillStyle = hGrad;
          ctx.fill();
        });

        // 7. Charming Wooden Windmill on Mid Hill (Right Side)
        const wmX = width * 0.74;
        const wmHillY =
          hills[1].base +
          Math.sin(wmX * hills[1].freq + hills[1].phase) * hills[1].amp +
          Math.cos(wmX * hills[1].freq * 1.9 - hills[1].phase) * (hills[1].amp * 0.4);
        const wmH = Math.min(width, height) * 0.13;

        // Windmill tower body
        ctx.fillStyle = "#F4EFE6";
        ctx.beginPath();
        ctx.moveTo(wmX - wmH * 0.14, wmHillY - wmH * 0.82);
        ctx.lineTo(wmX + wmH * 0.14, wmHillY - wmH * 0.82);
        ctx.lineTo(wmX + wmH * 0.22, wmHillY + 6);
        ctx.lineTo(wmX - wmH * 0.22, wmHillY + 6);
        ctx.closePath();
        ctx.fill();

        // Terracotta roof cap
        ctx.fillStyle = "#C85A32";
        ctx.beginPath();
        ctx.arc(wmX, wmHillY - wmH * 0.82, wmH * 0.15, Math.PI, 0);
        ctx.fill();

        // Rotating 4-blade windmill sails
        const hubX = wmX;
        const hubY = wmHillY - wmH * 0.78;
        const bladeLen = wmH * 0.68;

        ctx.save();
        ctx.translate(hubX, hubY);
        ctx.rotate(t * 0.55);
        for (let b = 0; b < 4; b++) {
          ctx.rotate(Math.PI / 2);
          ctx.strokeStyle = "#6E473B";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -bladeLen);
          ctx.stroke();

          ctx.fillStyle = "rgba(255, 252, 242, 0.88)";
          ctx.fillRect(2, -bladeLen * 0.95, wmH * 0.11, bladeLen * 0.72);
        }
        ctx.restore();

        // 8. Foreground Swaying Grass & Wildflowers
        const grassCount = Math.floor(width / 14);
        for (let i = 0; i <= grassCount; i++) {
          const gx = i * 14;
          const gy = height;
          const gh = 26 + (i % 5) * 8;
          const breeze = Math.sin(t * 2.2 + gx * 0.015) * 9;

          ctx.strokeStyle = i % 2 === 0 ? "#3E8E3A" : "#62B846";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.quadraticCurveTo(gx + breeze * 0.4, gy - gh * 0.5, gx + breeze, gy - gh);
          ctx.stroke();

          // Wildflower blossoms on every 4th blade
          if (i % 4 === 0) {
            ctx.fillStyle = ["#FFD166", "#FF5964", "#FFFFFF"][i % 3];
            ctx.beginPath();
            ctx.arc(gx + breeze, gy - gh, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 9. Floating White Dandelion Seeds Drifting in the Summer Breeze
        petals.forEach((p) => {
          p.x -= p.vx * 0.85; // Drift left-to-right with summer breeze
          p.y -= p.vy * 0.35 + Math.sin(t * 1.4 + p.swayPhase) * 0.0004;
          if (p.x > 1.05) p.x = -0.05;
          if (p.y < -0.05) p.y = 0.95;
          if (p.y > 1.05) p.y = 0.1;

          const px = p.x * width;
          const py = p.y * height;
          ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
          ctx.beginPath();
          ctx.arc(px, py, p.size * 0.65, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      /* ════════════════════════════════════════════════════════════════
         SCENE 1: KYOTO CLIFFSIDE (Twilight Sky, Torii Shrine & Sakura)
         ════════════════════════════════════════════════════════════════ */
      if (activeScene === "sakura") {
        // 1. Rich Twilight-to-Warm-Horizon Sky
        const sky = ctx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, "#090A1A");
        sky.addColorStop(0.38, "#1B1938");
        sky.addColorStop(0.68, "#4A2545");
        sky.addColorStop(0.86, "#B84A39");
        sky.addColorStop(1, "#F28F3B");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        // 2. Twinkling Stars in upper sky
        stars.forEach((s) => {
          const alpha = 0.25 + 0.55 * Math.sin(t * s.speed + s.phase);
          ctx.fillStyle = `rgba(255, 250, 240, ${Math.max(0.05, alpha * (1 - s.y * 1.3))})`;
          ctx.beginPath();
          ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
          ctx.fill();
        });

        // 3. Crisp Crescent Moon
        const moonX = width * 0.76;
        const moonY = height * 0.24;
        const moonR = Math.min(width, height) * 0.048;

        const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 3.5);
        moonGlow.addColorStop(0, "rgba(255, 243, 214, 0.28)");
        moonGlow.addColorStop(1, "rgba(255, 243, 214, 0)");
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR * 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFDF5";
        ctx.fill();
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(moonX - moonR * 0.38, moonY - moonR * 0.18, moonR * 0.88, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = "#14142E";
        ctx.beginPath();
        ctx.arc(moonX - moonR * 0.38, moonY - moonR * 0.18, moonR * 0.88, 0, Math.PI * 2);
        ctx.fill();

        // 4. Slow Drifting Sunset Clouds
        clouds.forEach((c) => {
          c.x += c.speed;
          if (c.x > 1.15) c.x = -0.25;
          const cx = c.x * width;
          const cy = c.y * height;
          const cGrad = ctx.createLinearGradient(cx, cy - c.h, cx, cy + c.h);
          cGrad.addColorStop(0, "rgba(90, 45, 82, 0.32)");
          cGrad.addColorStop(1, "rgba(242, 143, 59, 0.18)");
          ctx.fillStyle = cGrad;
          ctx.beginPath();
          ctx.roundRect(cx - c.w / 2, cy - c.h / 2, c.w, c.h, 99);
          ctx.fill();
        });

        // 5. Distant Layered Mountain Valleys & Drifting Mist
        const mLayers = [
          { base: height * 0.72, seed: 1.1, a1: 68, a2: 28, color: "#2D1934", mist: "rgba(242, 143, 59, 0.12)" },
          { base: height * 0.79, seed: 2.7, a1: 52, a2: 22, color: "#1E1126", mist: "rgba(184, 74, 57, 0.1)" },
          { base: height * 0.86, seed: 4.4, a1: 34, a2: 16, color: "#110918", mist: null },
        ];

        mLayers.forEach((ml, idx) => {
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let x = 0; x <= width; x += 10) {
            const y = ml.base - ridgeHeight(x + t * (4 + idx * 3), ml.seed, ml.a1, ml.a2);
            ctx.lineTo(x, y);
          }
          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fillStyle = ml.color;
          ctx.fill();

          if (ml.mist) {
            const mistGrad = ctx.createLinearGradient(0, ml.base - 30, 0, ml.base + 50);
            mistGrad.addColorStop(0, "rgba(0,0,0,0)");
            mistGrad.addColorStop(0.5, ml.mist);
            mistGrad.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = mistGrad;
            ctx.fillRect(0, ml.base - 30, width, 80);
          }
        });

        // 6. Foreground Rocky Cliff Overlook + Torii Gate Silhouette
        ctx.fillStyle = "#08040D";
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, height * 0.76);
        ctx.quadraticCurveTo(width * 0.22, height * 0.77, width * 0.38, height * 0.85);
        ctx.quadraticCurveTo(width * 0.65, height * 0.88, width, height * 0.82);
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        const tx = width * 0.24;
        const ty = height * 0.79;
        const ts = Math.min(width, height) * 0.16;
        ctx.fillStyle = "#07030C";

        ctx.fillRect(tx - ts * 0.36, ty - ts * 0.85, ts * 0.09, ts * 0.9);
        ctx.fillRect(tx + ts * 0.27, ty - ts * 0.85, ts * 0.09, ts * 0.9);
        ctx.beginPath();
        ctx.moveTo(tx - ts * 0.62, ty - ts * 0.88);
        ctx.quadraticCurveTo(tx, ty - ts * 0.78, tx + ts * 0.62, ty - ts * 0.88);
        ctx.lineTo(tx + ts * 0.56, ty - ts * 0.78);
        ctx.quadraticCurveTo(tx, ty - ts * 0.7, tx - ts * 0.56, ty - ts * 0.78);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(tx - ts * 0.46, ty - ts * 0.62, ts * 0.92, ts * 0.07);
        ctx.fillRect(tx - ts * 0.04, ty - ts * 0.78, ts * 0.08, ts * 0.18);

        // Warm Swaying Hanging Lantern inside Torii Gate
        const sway = Math.sin(t * 1.6) * 4;
        const lx = tx + sway;
        const ly = ty - ts * 0.5;
        ctx.strokeStyle = "#07030C";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty - ts * 0.62);
        ctx.lineTo(lx, ly);
        ctx.stroke();

        const lanternGlow = ctx.createRadialGradient(lx, ly, 2, lx, ly, 28);
        lanternGlow.addColorStop(0, "rgba(255, 220, 140, 0.95)");
        lanternGlow.addColorStop(0.4, "rgba(255, 120, 30, 0.45)");
        lanternGlow.addColorStop(1, "rgba(255, 120, 30, 0)");
        ctx.fillStyle = lanternGlow;
        ctx.beginPath();
        ctx.arc(lx, ly, 28, 0, Math.PI * 2);
        ctx.fill();

        // 7. Gentle Wind-Blown Sakura Petals
        petals.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy + Math.sin(t * 1.5 + p.swayPhase) * 0.00025;
          p.angle += p.spin;
          if (p.x < -0.05) p.x = 1.05;
          if (p.y > 1.05) {
            p.y = -0.05;
            p.x = Math.random();
          }

          ctx.save();
          ctx.translate(p.x * width, p.y * height);
          ctx.rotate(p.angle);
          ctx.fillStyle = "rgba(255, 192, 209, 0.78)";
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      /* ════════════════════════════════════════════════════════════════
         SCENE 2: MIDNIGHT EXPRESS (Starry Night Viaduct & Glowing Train)
         ════════════════════════════════════════════════════════════════ */
      if (activeScene === "train") {
        // 1. Deep Starry Indigo Night Sky
        const sky = ctx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, "#030511");
        sky.addColorStop(0.5, "#0B1536");
        sky.addColorStop(0.85, "#192B59");
        sky.addColorStop(1, "#2A3F6E");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        // 2. Starfield + Occasional Calm Shooting Star
        stars.forEach((s) => {
          const alpha = 0.3 + 0.6 * Math.sin(t * s.speed + s.phase);
          ctx.fillStyle = `rgba(235, 245, 255, ${Math.max(0.1, alpha)})`;
          ctx.beginPath();
          ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
          ctx.fill();
        });

        if (!shootingStar && Math.random() < 0.006) {
          shootingStar = {
            x: width * (0.3 + Math.random() * 0.5),
            y: height * (0.1 + Math.random() * 0.2),
            vx: -8,
            vy: 3.2,
            life: 1,
          };
        }
        if (shootingStar) {
          shootingStar.x += shootingStar.vx;
          shootingStar.y += shootingStar.vy;
          shootingStar.life -= 0.025;
          const sg = ctx.createLinearGradient(
            shootingStar.x,
            shootingStar.y,
            shootingStar.x - shootingStar.vx * 8,
            shootingStar.y - shootingStar.vy * 8
          );
          sg.addColorStop(0, `rgba(255,255,255,${shootingStar.life})`);
          sg.addColorStop(1, "rgba(255,255,255,0)");
          ctx.strokeStyle = sg;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(shootingStar.x, shootingStar.y);
          ctx.lineTo(shootingStar.x - shootingStar.vx * 8, shootingStar.y - shootingStar.vy * 8);
          ctx.stroke();
          if (shootingStar.life <= 0) shootingStar = null;
        }

        // 3. Full Luminous Moon
        const mx = width * 0.22;
        const my = height * 0.26;
        const mr = Math.min(width, height) * 0.065;
        const mg = ctx.createRadialGradient(mx, my, mr * 0.2, mx, my, mr * 3.2);
        mg.addColorStop(0, "rgba(240, 248, 255, 0.95)");
        mg.addColorStop(0.3, "rgba(186, 230, 253, 0.32)");
        mg.addColorStop(1, "rgba(186, 230, 253, 0)");
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(mx, my, mr * 3.2, 0, Math.PI * 2);
        ctx.fill();

        // 4. Distant Mountain Silhouette
        const valleyY = height * 0.75;
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 12) {
          const y = valleyY - ridgeHeight(x + t * 18, 2.1, 55, 22);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = "#070D21";
        ctx.fill();

        // 5. Stone Viaduct Bridge Across Lower Third
        const bridgeY = height * 0.73;
        const bridgeH = height * 0.27;
        ctx.fillStyle = "#040711";
        ctx.fillRect(0, bridgeY, width, 16);

        const archSpan = 130;
        const archOffset = (t * 95) % archSpan;
        for (let x = -archSpan; x <= width + archSpan; x += archSpan) {
          const px = x - archOffset;
          ctx.fillRect(px, bridgeY, 26, bridgeH);
          ctx.beginPath();
          ctx.moveTo(px + 26, bridgeY + 14);
          ctx.arc(px + archSpan / 2 + 13, bridgeY + 48, (archSpan - 26) / 2, Math.PI, 0, false);
          ctx.lineTo(px + archSpan, bridgeY + 14);
          ctx.closePath();
          ctx.fill();
        }

        // 6. Glowing Night Train Gliding Across the Viaduct
        const carCount = 5;
        const carW = 148;
        const carH = 34;
        const gap = 8;
        const totalTrainW = carCount * (carW + gap);
        const trainX = width * 0.5 - totalTrainW / 2 + Math.sin(t * 0.7) * 18;
        const trainY = bridgeY - carH - 2;

        ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, trainY - 18);
        ctx.lineTo(width, trainY - 18);
        ctx.stroke();

        for (let c = 0; c < carCount; c++) {
          const cx = trainX + c * (carW + gap);
          ctx.fillStyle = "#0A0F1D";
          ctx.beginPath();
          ctx.roundRect(cx, trainY, carW, carH, [6, 6, 2, 2]);
          ctx.fill();

          const winCount = 6;
          const winW = 16;
          const winH = 13;
          for (let w = 0; w < winCount; w++) {
            const wx = cx + 14 + w * 21;
            const wy = trainY + 8;

            ctx.fillStyle = "#FFE082";
            ctx.shadowColor = "rgba(255, 193, 7, 0.75)";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.roundRect(wx, wy, winW, winH, 2.5);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        // Warm Headlight Beam
        const leadX = trainX + totalTrainW - gap;
        const beamGrad = ctx.createLinearGradient(leadX, trainY + 18, leadX + 240, trainY + 18);
        beamGrad.addColorStop(0, "rgba(255, 243, 176, 0.55)");
        beamGrad.addColorStop(1, "rgba(255, 243, 176, 0)");
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(leadX, trainY + 14);
        ctx.lineTo(leadX + 240, trainY - 16);
        ctx.lineTo(leadX + 240, trainY + 46);
        ctx.closePath();
        ctx.fill();
      }

      /* ════════════════════════════════════════════════════════════════
         SCENE 3: FIREWATCH CANYON (Forest Ridges, Tower & Campfire)
         ════════════════════════════════════════════════════════════════ */
      if (activeScene === "canyon") {
        // 1. Warm Amber & Deep Dusk Canyon Sky
        const sky = ctx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, "#12091C");
        sky.addColorStop(0.35, "#3B1836");
        sky.addColorStop(0.68, "#8F2D38");
        sky.addColorStop(0.9, "#E05A2B");
        sky.addColorStop(1, "#FF9E44");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        // 2. Layered Pine Forest Ridges
        const fLayers = [
          { y: height * 0.64, seed: 0.8, a1: 42, a2: 18, color: "#5C1E2E", trees: 14 },
          { y: height * 0.73, seed: 2.2, a1: 35, a2: 15, color: "#381120", trees: 18 },
          { y: height * 0.82, seed: 3.9, a1: 24, a2: 11, color: "#1C0812", trees: 22 },
        ];

        fLayers.forEach((fl, idx) => {
          const yFn = (x) => fl.y - ridgeHeight(x + t * (3 + idx * 2), fl.seed, fl.a1, fl.a2);
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let x = 0; x <= width; x += 10) {
            ctx.lineTo(x, yFn(x));
          }
          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fillStyle = fl.color;
          ctx.fill();

          drawPineForest(yFn, 14 + idx * 2, fl.trees, fl.color);
        });

        // 3. Distant Firewatch Lookout Tower Silhouette on Ridge 1
        const twX = width * 0.72;
        const twY = height * 0.64 - ridgeHeight(twX + t * 3, 0.8, 42, 18);
        ctx.fillStyle = "#381120";
        ctx.fillRect(twX - 10, twY - 38, 3, 40);
        ctx.fillRect(twX + 7, twY - 38, 3, 40);
        ctx.fillRect(twX - 16, twY - 50, 32, 14);
        ctx.beginPath();
        ctx.moveTo(twX - 22, twY - 50);
        ctx.lineTo(twX, twY - 62);
        ctx.lineTo(twX + 22, twY - 50);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#FFD166";
        ctx.fillRect(twX - 5, twY - 46, 10, 6);

        // 4. Foreground Campfire Overlook Cliff
        ctx.fillStyle = "#090307";
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, height * 0.84);
        ctx.quadraticCurveTo(width * 0.4, height * 0.81, width, height * 0.88);
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        // 5. Flickering Campfire & Rising Embers
        const fx = width * 0.34;
        const fy = height * 0.84;
        const flicker = Math.sin(t * 9) * 3 + Math.cos(t * 14) * 2;

        const fireGlow = ctx.createRadialGradient(fx, fy - 12, 4, fx, fy - 12, 95 + flicker * 3);
        fireGlow.addColorStop(0, "rgba(255, 210, 100, 0.65)");
        fireGlow.addColorStop(0.45, "rgba(255, 85, 0, 0.25)");
        fireGlow.addColorStop(1, "rgba(255, 85, 0, 0)");
        ctx.fillStyle = fireGlow;
        ctx.beginPath();
        ctx.arc(fx, fy - 12, 95 + flicker * 3, 0, Math.PI * 2);
        ctx.fill();

        for (let f = 0; f < 3; f++) {
          const fh = 22 - f * 5 + Math.sin(t * 11 + f * 2) * 5;
          const fw = 12 - f * 2.5;
          ctx.fillStyle = f === 0 ? "#FF5500" : f === 1 ? "#FF9E00" : "#FFF3B0";
          ctx.beginPath();
          ctx.ellipse(fx + (f - 1) * 4, fy - fh * 0.45, fw, fh, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        petals.slice(0, 32).forEach((p, idx) => {
          const sparkProgress = (t * 0.25 + idx * 0.13) % 1;
          const sx = fx + Math.sin(sparkProgress * 8 + idx) * (12 + sparkProgress * 45);
          const sy = fy - 10 - sparkProgress * (height * 0.38);
          ctx.fillStyle = `rgba(255, 180, 60, ${1 - sparkProgress})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.8 * (1 - sparkProgress * 0.5), 0, Math.PI * 2);
          ctx.fill();
        });
      }

      /* ════════════════════════════════════════════════════════════════
         GENTLE TRACK-SWITCH PARTICLE DRIFT (Only when changing songs)
         ════════════════════════════════════════════════════════════════ */
      const tr = transitionRef.current;
      if (tr.active) {
        const p = tr.progress;
        const alphaEnv = Math.sin(p * Math.PI);

        tr.particles.forEach((pt) => {
          const x = pt.startX + (pt.endX - pt.startX) * p;
          const y =
            pt.startY +
            (pt.endY - pt.startY) * p +
            Math.sin(p * Math.PI * pt.waveFreq) * pt.waveAmp;

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(pt.rot + p * 4);
          ctx.fillStyle = pt.color;
          ctx.globalAlpha = alphaEnv * 0.85;
          ctx.beginPath();
          ctx.ellipse(0, 0, pt.size * 1.4, pt.size * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        if (tr.title) {
          ctx.save();
          ctx.globalAlpha = alphaEnv * 0.82;
          ctx.textAlign = "center";
          ctx.fillStyle = activeScene === "meadow" ? "#0F2942" : "#FFFFFF";
          ctx.font = `700 ${Math.round(Math.min(width, height) * 0.034)}px 'Space Grotesk', sans-serif`;
          ctx.fillText(tr.title, width / 2, height * 0.42);
          if (tr.artist) {
            ctx.font = `500 ${Math.round(Math.min(width, height) * 0.016)}px 'Inter', sans-serif`;
            ctx.fillStyle = activeScene === "meadow" ? "rgba(15, 41, 66, 0.72)" : "rgba(255,255,255,0.72)";
            ctx.fillText(tr.artist.toUpperCase(), width / 2, height * 0.42 + 26);
          }
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

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

        {/* Scenery Switcher */}
        {SCENES.map((s, i) => {
          const active = sceneIdx === i;
          return (
            <button
              key={s.id}
              onClick={() => setSceneIdx(i)}
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
              {s.label}
            </button>
          );
        })}

        <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />

        <button
          onClick={nextSong}
          title="Next Track"
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
          Next →
        </button>

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
