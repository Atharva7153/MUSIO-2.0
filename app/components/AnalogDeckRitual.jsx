"use client";
import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { motion, AnimatePresence } from "framer-motion";

// Synthesized Web Audio tactile sounds (needle drop thud & mechanical click)
function playDeckSound(type = "click") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window.__musioDeckAudioCtx) {
      window.__musioDeckAudioCtx = new AudioCtx();
    }
    const ctx = window.__musioDeckAudioCtx;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;

    if (type === "needle") {
      // Warm low-end thump + tiny stylus contact transient
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.09);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "click") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(820, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.028);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    }
  } catch {}
}

export default function AnalogDeckRitual() {
  const {
    playlist,
    currentIndex,
    playSong,
    nextSong,
    prevSong,
    isPlaying,
    setIsPlaying,
    subscribeAudio,
    audioElementRef,
  } = usePlayer();

  const canvasRef = useRef(null);
  const coverImgRef = useRef(null);
  const crackleNodeRef = useRef(null);

  const [deckMode, setDeckMode] = useState("vinyl"); // "vinyl" | "cassette"
  const [rpmPreset, setRpmPreset] = useState("33"); // "28" | "33" | "45"
  const [crackleOn, setCrackleOn] = useState(false);
  const [crateOpen, setCrateOpen] = useState(false);
  const [librarySongs, setLibrarySongs] = useState([]);
  const [timeUI, setTimeUI] = useState({ cur: 0, dur: 0 });

  const currentSong = currentIndex >= 0 ? playlist[currentIndex] : null;

  // Physics & interaction ref for 60fps loop
  const physRef = useRef({
    platterAngle: 0,
    angularVel: 0,
    targetRate: 1.0,
    currentRate: 1.0,
    tonearmAngle: 0.14, // radians (0.14 = resting on cradle, 0.38 = outer groove, 0.74 = inner groove)
    interaction: null, // "platter" | "tonearm" | "reel" | null
    lastPointerAngle: 0,
    lastPointerX: 0,
    vuLeft: 0,
    vuRight: 0,
    hoverZone: null, // "tonearm" | "platter" | null
  });

  // Load library songs if user opens /deck directly
  useEffect(() => {
    let active = true;
    fetch("/api/songs/all")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.songs) ? data.songs : Array.isArray(data) ? data : [];
        setLibrarySongs(list);
        if (playlist.length === 0 && list.length > 0) {
          playSong(list, 0);
          setIsPlaying(false);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Load current song cover image into an Image object for spinning vinyl label
  useEffect(() => {
    if (!currentSong) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentSong.coverImage || "/music-player.png";
    img.onload = () => {
      coverImgRef.current = img;
    };
    img.onerror = () => {
      const fallback = new Image();
      fallback.src = "/music-player.png";
      fallback.onload = () => {
        coverImgRef.current = fallback;
      };
    };
  }, [currentSong?.coverImage, currentSong?._id]);

  // Apply RPM speed preset to physics target rate
  useEffect(() => {
    const rateMap = { "28": 0.86, "33": 1.0, "45": 1.16 };
    physRef.current.targetRate = rateMap[rpmPreset] || 1.0;
  }, [rpmPreset]);

  // Reset playbackRate to 1.0 when leaving /deck
  useEffect(() => {
    return () => {
      if (audioElementRef?.current) {
        audioElementRef.current.playbackRate = 1.0;
      }
      if (crackleNodeRef.current) {
        try {
          crackleNodeRef.current.stop();
        } catch {}
        crackleNodeRef.current = null;
      }
    };
  }, [audioElementRef]);

  // Procedural Web Audio Vinyl Dust & Crackle Generator
  useEffect(() => {
    if (!crackleOn) {
      if (crackleNodeRef.current) {
        try {
          crackleNodeRef.current.stop();
        } catch {}
        crackleNodeRef.current = null;
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!window.__musioDeckAudioCtx) {
        window.__musioDeckAudioCtx = new AudioCtx();
      }
      const ctx = window.__musioDeckAudioCtx;
      if (ctx.state === "suspended") ctx.resume();

      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Generate warm analog surface hiss + microscopic vinyl dust pops
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.04 * white) / 1.04;
        let sample = lastOut * 0.16;
        // Occasional tiny vinyl crackle impulse
        if (Math.random() < 0.0014) {
          sample += (Math.random() * 2 - 1) * 0.65;
        }
        data[i] = sample;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1950;
      filter.Q.value = 0.85;

      const gain = ctx.createGain();
      gain.gain.value = 0.055;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      crackleNodeRef.current = source;
    } catch {}

    return () => {
      if (crackleNodeRef.current) {
        try {
          crackleNodeRef.current.stop();
        } catch {}
        crackleNodeRef.current = null;
      }
    };
  }, [crackleOn]);

  /* ── 60fps High-DPI Canvas Render Loop (Vinyl Turntable & Cassette Deck) ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let t = 0;
    let uiTick = 0;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const unsubscribe = subscribeAudio((audio) => {
      if (!width || !height) return;
      t += 0.016;
      uiTick++;

      const phys = physRef.current;
      const el = audioElementRef?.current;
      const cur = el?.currentTime || 0;
      const dur = el?.duration && isFinite(el.duration) ? el.duration : 0;
      const prog = dur > 0 ? Math.max(0, Math.min(1, cur / dur)) : 0;

      if (uiTick % 12 === 0) {
        setTimeUI({ cur, dur });
      }

      // Update rotational velocity & audioElement playbackRate smoothly
      const isBraking = phys.interaction === "platter";
      const desiredRate = !isPlaying
        ? 0
        : isBraking
        ? 0.15
        : phys.targetRate;

      phys.currentRate += (desiredRate - phys.currentRate) * 0.12;

      if (el && isPlaying) {
        const clampedRate = Math.max(0.15, Math.min(2.2, phys.currentRate));
        if (Math.abs(el.playbackRate - clampedRate) > 0.01) {
          try {
            el.playbackRate = clampedRate;
          } catch {}
        }
      }

      // Advance platter angle (33.3 RPM = ~0.035 rad/frame at 60fps)
      if (phys.interaction !== "platter") {
        phys.platterAngle += 0.034 * phys.currentRate;
      }

      // Smoothly move tonearm angle unless user is dragging the tonearm
      const OuterGrooveAngle = 0.37;
      const InnerGrooveAngle = 0.74;
      const CradleAngle = 0.11;

      if (phys.interaction !== "tonearm") {
        const targetArm = isPlaying
          ? OuterGrooveAngle + prog * (InnerGrooveAngle - OuterGrooveAngle)
          : CradleAngle;
        phys.tonearmAngle += (targetArm - phys.tonearmAngle) * 0.09;
      }

      // Smooth VU meter needles
      const targetVuL = isPlaying ? Math.min(1, audio.bass * 0.75 + audio.mid * 0.45) : 0.03;
      const targetVuR = isPlaying ? Math.min(1, audio.mid * 0.65 + audio.treble * 0.55 + audio.bass * 0.25) : 0.03;
      phys.vuLeft += (targetVuL - phys.vuLeft) * 0.22;
      phys.vuRight += (targetVuR - phys.vuRight) * 0.22;

      ctx.clearRect(0, 0, width, height);

      const isDark =
        typeof document !== "undefined" &&
        document.documentElement.getAttribute("data-theme") === "dark";

      if (deckMode === "vinyl") {
        /* ═══════════════════════════════════════════════════════════
           MODE A: PRECISION BRUSHED-METAL 12" VINYL TURNTABLE
        ═══════════════════════════════════════════════════════════ */
        const minDim = Math.min(width, height);
        const platterR = Math.min(minDim * 0.4, 215);
        const cx = width * 0.44;
        const cy = height * 0.5;

        // 1. Sub-Platter Soft Ambient Shadow & Bass Halo
        const bassGlow = isPlaying ? audio.bass * 24 : 0;
        const halo = ctx.createRadialGradient(
          cx,
          cy,
          platterR * 0.7,
          cx,
          cy,
          platterR + 36 + bassGlow
        );
        halo.addColorStop(0, "rgba(255, 95, 25, 0.18)");
        halo.addColorStop(0.6, "rgba(0, 0, 0, 0.35)");
        halo.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, platterR + 40 + bassGlow, 0, Math.PI * 2);
        ctx.fill();

        // 2. Machined Aluminum Outer Strobe Bezel
        const bezelGrad = ctx.createLinearGradient(
          cx - platterR,
          cy - platterR,
          cx + platterR,
          cy + platterR
        );
        bezelGrad.addColorStop(0, isDark ? "#3A3D4A" : "#E4E2DD");
        bezelGrad.addColorStop(0.5, isDark ? "#181A22" : "#C5C2BA");
        bezelGrad.addColorStop(1, isDark ? "#2C2F3A" : "#DCD9D0");
        ctx.fillStyle = bezelGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, platterR + 11, 0, Math.PI * 2);
        ctx.fill();

        // 72 Rotating Strobe Dots on Platter Rim
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(phys.platterAngle);
        const dotCount = 72;
        for (let i = 0; i < dotCount; i++) {
          const a = (i / dotCount) * Math.PI * 2;
          const dx = Math.cos(a) * (platterR + 5.5);
          const dy = Math.sin(a) * (platterR + 5.5);
          // Highlight dots near bottom-left strobe lamp
          const worldA = (a + phys.platterAngle) % (Math.PI * 2);
          const nearStrobe = Math.abs(Math.sin(worldA - 2.35)) < 0.25;
          ctx.fillStyle = nearStrobe
            ? "#FF6A00"
            : isDark
            ? "rgba(255,255,255,0.28)"
            : "rgba(30,30,35,0.45)";
          ctx.beginPath();
          ctx.arc(dx, dy, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Warm Orange Strobe Pilot Lamp (Bottom-Left of Platter)
        const lampX = cx - platterR * 0.78;
        const lampY = cy + platterR * 0.78;
        const lampGlow = ctx.createRadialGradient(lampX, lampY, 1, lampX, lampY, 26);
        lampGlow.addColorStop(0, "rgba(255, 95, 0, 0.95)");
        lampGlow.addColorStop(0.4, "rgba(255, 95, 0, 0.32)");
        lampGlow.addColorStop(1, "rgba(255, 95, 0, 0)");
        ctx.fillStyle = lampGlow;
        ctx.beginPath();
        ctx.arc(lampX, lampY, 26, 0, Math.PI * 2);
        ctx.fill();

        // 3. Obsidian 12" Vinyl Disc Body
        const discGrad = ctx.createRadialGradient(cx, cy, platterR * 0.15, cx, cy, platterR);
        discGrad.addColorStop(0, "#14151B");
        discGrad.addColorStop(0.75, "#0B0C10");
        discGrad.addColorStop(0.97, "#181A22");
        discGrad.addColorStop(1, "#050608");
        ctx.fillStyle = discGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, platterR, 0, Math.PI * 2);
        ctx.fill();

        // 4. Anisotropic Satin Light Sheen Across Vinyl Grooves
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(phys.platterAngle * 0.12);
        for (let cone = 0; cone < 2; cone++) {
          const baseA = cone * Math.PI + 0.65;
          const sheenGrad = ctx.createRadialGradient(0, 0, platterR * 0.34, 0, 0, platterR * 0.96);
          sheenGrad.addColorStop(0, "rgba(255,255,255,0.01)");
          sheenGrad.addColorStop(0.5, "rgba(255,255,255,0.09)");
          sheenGrad.addColorStop(1, "rgba(255,255,255,0.02)");
          ctx.fillStyle = sheenGrad;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, platterR * 0.98, baseA - 0.32, baseA + 0.32);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // 5. Concentric Micro-Groove Rings
        const labelR = platterR * 0.34;
        const outerGrooveR = platterR * 0.93;
        const innerGrooveR = labelR * 1.18;

        for (let r = innerGrooveR; r <= outerGrooveR; r += 3.6) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle =
            Math.floor(r) % 7 === 0
              ? "rgba(255, 255, 255, 0.065)"
              : "rgba(255, 255, 255, 0.026)";
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }

        // Active Playing Groove Highlight Ring (shows exact song progress on the vinyl!)
        const activeGrooveR =
          outerGrooveR - prog * (outerGrooveR - innerGrooveR);
        ctx.beginPath();
        ctx.arc(cx, cy, activeGrooveR, 0, Math.PI * 2);
        ctx.strokeStyle = isPlaying
          ? "rgba(255, 105, 30, 0.55)"
          : "rgba(255, 105, 30, 0.22)";
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // 6. Spinning Center Record Label with Cover Artwork
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(phys.platterAngle);

        ctx.beginPath();
        ctx.arc(0, 0, labelR, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        if (coverImgRef.current) {
          ctx.drawImage(
            coverImgRef.current,
            -labelR,
            -labelR,
            labelR * 2,
            labelR * 2
          );
          // Subtle warm vignette over label art
          const lblVig = ctx.createRadialGradient(0, 0, labelR * 0.2, 0, 0, labelR);
          lblVig.addColorStop(0, "rgba(0,0,0,0.08)");
          lblVig.addColorStop(1, "rgba(0,0,0,0.48)");
          ctx.fillStyle = lblVig;
          ctx.fillRect(-labelR, -labelR, labelR * 2, labelR * 2);
        } else {
          ctx.fillStyle = "#FF5500";
          ctx.fillRect(-labelR, -labelR, labelR * 2, labelR * 2);
        }

        // Gold/White Label Ring & Record Typography
        ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, labelR * 0.86, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();

        // Center Brass/Steel Spindle Pin
        ctx.beginPath();
        ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = "#E5E7EB";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = "#111827";
        ctx.fill();

        // 7. Counterweighted Gimbal Tonearm Assembly (Top-Right Pivot)
        const pivotX = cx + platterR + Math.min(58, width * 0.09);
        const pivotY = cy - platterR * 0.62;
        const armLen = platterR * 1.18;

        // Gimbal Base Rings
        ctx.save();
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 26, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? "#1E202B" : "#D6D3CB";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 15, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? "#2E3240" : "#B8B4AA";
        ctx.fill();
        ctx.restore();

        // Tonearm Cradle Rest Clip
        const restX = pivotX - Math.sin(CradleAngle) * (armLen * 0.68);
        const restY = pivotY + Math.cos(CradleAngle) * (armLen * 0.68);
        ctx.beginPath();
        ctx.arc(restX, restY, 6, 0, Math.PI * 2);
        ctx.strokeStyle = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Tonearm Rotation
        const armAngle = phys.tonearmAngle;
        const headX = pivotX - Math.sin(armAngle) * armLen;
        const headY = pivotY + Math.cos(armAngle) * armLen;

        // Counterweight behind pivot
        const cwX = pivotX + Math.sin(armAngle) * 28;
        const cwY = pivotY - Math.cos(armAngle) * 28;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(cwX, cwY);
        ctx.strokeStyle = isDark ? "#9CA3AF" : "#52525B";
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        ctx.stroke();

        // Main S-Shaped Brushed Aluminum Tonearm Tube
        const ctrlX = pivotX - Math.sin(armAngle - 0.08) * (armLen * 0.54);
        const ctrlY = pivotY + Math.cos(armAngle - 0.08) * (armLen * 0.54);

        // Tonearm shadow
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY + 6);
        ctx.quadraticCurveTo(ctrlX, ctrlY + 8, headX, headY + 8);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.38)";
        ctx.lineWidth = 6;
        ctx.stroke();

        // Tonearm metallic shaft
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, headX, headY);
        ctx.strokeStyle = isDark ? "#E5E7EB" : "#3F3F46";
        ctx.lineWidth = 4.5;
        ctx.stroke();

        // Cartridge Headshell + Glowing Stylus Tip
        ctx.save();
        ctx.translate(headX, headY);
        ctx.rotate(armAngle + 0.18);

        const isArmActive =
          phys.interaction === "tonearm" || phys.hoverZone === "tonearm";

        // Headshell body
        ctx.fillStyle = isArmActive ? "#FF5500" : isDark ? "#F3F4F6" : "#18181B";
        ctx.beginPath();
        ctx.roundRect(-6, -10, 12, 22, 3);
        ctx.fill();

        // Finger lift bar
        ctx.strokeStyle = isArmActive ? "#FF8800" : "#9CA3AF";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(6, -2);
        ctx.lineTo(14, -7);
        ctx.stroke();

        // Glowing needle contact point
        ctx.fillStyle = "#FF5500";
        ctx.beginPath();
        ctx.arc(0, 11, isArmActive ? 4.2 : 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        /* ═══════════════════════════════════════════════════════════
           MODE B: TRANSPARENT SMOKED-ACRYLIC C-90 CASSETTE DECK
        ═══════════════════════════════════════════════════════════ */
        const cx = width * 0.5;
        const cy = height * 0.53;
        const tapeW = Math.min(width * 0.84, 460);
        const tapeH = tapeW * 0.63;
        const x0 = cx - tapeW / 2;
        const y0 = cy - tapeH / 2;

        // 1. Dual Warm-Backlit Analog VU Meters Above Cassette
        const vuW = tapeW * 0.44;
        const vuH = 54;
        const vuY = Math.max(12, y0 - vuH - 18);

        [
          { label: "LEFT CH · dB", val: phys.vuLeft, vx: cx - vuW - 8 },
          { label: "RIGHT CH · dB", val: phys.vuRight, vx: cx + 8 },
        ].forEach((meter) => {
          // Warm amber backlit meter window
          const mGrad = ctx.createLinearGradient(meter.vx, vuY, meter.vx, vuY + vuH);
          mGrad.addColorStop(0, "#2A1B0E");
          mGrad.addColorStop(1, "#160F08");
          ctx.fillStyle = mGrad;
          ctx.beginPath();
          ctx.roundRect(meter.vx, vuY, vuW, vuH, 10);
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 165, 70, 0.32)";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Scale arc & red overload zone
          const mcx = meter.vx + vuW / 2;
          const mcy = vuY + vuH + 10;
          const arcR = vuH * 0.88;

          ctx.beginPath();
          ctx.arc(mcx, mcy, arcR, -Math.PI * 0.76, -Math.PI * 0.34);
          ctx.strokeStyle = "rgba(255, 215, 160, 0.45)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(mcx, mcy, arcR, -Math.PI * 0.34, -Math.PI * 0.22);
          ctx.strokeStyle = "rgba(255, 75, 55, 0.85)";
          ctx.lineWidth = 2.2;
          ctx.stroke();

          // Needle swing
          const needleAngle = -Math.PI * 0.75 + meter.val * (Math.PI * 0.5);
          const nx = mcx + Math.cos(needleAngle) * (arcR + 4);
          const ny = mcy + Math.sin(needleAngle) * (arcR + 4);

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(meter.vx, vuY, vuW, vuH, 10);
          ctx.clip();

          ctx.beginPath();
          ctx.moveTo(mcx, mcy);
          ctx.lineTo(nx, ny);
          ctx.strokeStyle = "#FF6B1A";
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = "rgba(255, 210, 150, 0.65)";
          ctx.font = "600 8.5px 'Space Grotesk', sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(meter.label, meter.vx + 10, vuY + 14);
        });

        // 2. Outer Smoked-Acrylic Cassette Shell
        const shellGrad = ctx.createLinearGradient(x0, y0, x0 + tapeW, y0 + tapeH);
        shellGrad.addColorStop(0, isDark ? "#1C1F2B" : "#282C3A");
        shellGrad.addColorStop(1, isDark ? "#0E1017" : "#181B24");
        ctx.fillStyle = shellGrad;
        ctx.beginPath();
        ctx.roundRect(x0, y0, tapeW, tapeH, 18);
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // 4 Corner Precision Machine Screws
        [
          [x0 + 16, y0 + 16],
          [x0 + tapeW - 16, y0 + 16],
          [x0 + 16, y0 + tapeH - 16],
          [x0 + tapeW - 16, y0 + tapeH - 16],
        ].forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = "#4B5563";
          ctx.fill();
        });

        // 3. Inner Printed Cassette Label
        const lblX = x0 + 26;
        const lblY = y0 + 22;
        const lblW = tapeW - 52;
        const lblH = tapeH * 0.66;

        ctx.fillStyle = isDark ? "#14161F" : "#FAF8F5";
        ctx.beginPath();
        ctx.roundRect(lblX, lblY, lblW, lblH, 12);
        ctx.fill();

        // Solar Orange Studio Accent Stripe across Cassette Label
        ctx.fillStyle = "#FF5500";
        ctx.fillRect(lblX, lblY + 34, lblW, 6);

        // Song Title & Artist Printed on Cassette Label
        ctx.fillStyle = isDark ? "#F9FAFB" : "#111827";
        ctx.font = "700 13px 'Space Grotesk', sans-serif";
        ctx.textAlign = "left";
        const cTitle = (currentSong?.title || "UNTITLED MASTER TAPE").slice(0, 32);
        ctx.fillText(cTitle, lblX + 16, lblY + 24);

        ctx.fillStyle = "#FF5500";
        ctx.font = "700 10px 'Space Grotesk', sans-serif";
        ctx.textAlign = "right";
        const counterStr = String(Math.floor(prog * 999)).padStart(3, "0");
        ctx.fillText(`A · [${counterStr}]`, lblX + lblW - 16, lblY + 24);

        // 4. Transparent Center Reel Window & Dynamic Tape Spools
        const winW = lblW * 0.78;
        const winH = lblH * 0.56;
        const winX = cx - winW / 2;
        const winY = lblY + 48;

        ctx.fillStyle = "#090A0F";
        ctx.beginPath();
        ctx.roundRect(winX, winY, winW, winH, winH / 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = 1;
        ctx.stroke();

        const leftReelX = cx - winW * 0.27;
        const rightReelX = cx + winW * 0.27;
        const reelY = winY + winH / 2;
        const hubR = Math.min(24, winH * 0.28);
        const maxTapeR = winH * 0.46;

        // Left supply pack shrinks as song progresses; right take-up pack grows!
        const leftPackR = hubR + (1 - prog) * (maxTapeR - hubR);
        const rightPackR = hubR + prog * (maxTapeR - hubR);

        // Draw magnetic tape packs inside window
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(winX, winY, winW, winH, winH / 2);
        ctx.clip();

        [
          { rx: leftReelX, packR: leftPackR, speedMult: 1.15 },
          { rx: rightReelX, packR: rightPackR, speedMult: 0.88 },
        ].forEach((spool) => {
          // Dark magnetic oxide tape pack
          ctx.beginPath();
          ctx.arc(spool.rx, reelY, spool.packR, 0, Math.PI * 2);
          ctx.fillStyle = "#1F1612";
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.08)";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Rotating 6-tooth white/metallic sprocket reel
          ctx.save();
          ctx.translate(spool.rx, reelY);
          ctx.rotate(-phys.platterAngle * spool.speedMult);

          ctx.beginPath();
          ctx.arc(0, 0, hubR, 0, Math.PI * 2);
          ctx.fillStyle = "#E5E7EB";
          ctx.fill();

          ctx.beginPath();
          ctx.arc(0, 0, hubR * 0.68, 0, Math.PI * 2);
          ctx.fillStyle = "#090A0F";
          ctx.fill();

          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            ctx.fillStyle = "#E5E7EB";
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * (hubR * 0.42), Math.sin(a) * (hubR * 0.42));
            ctx.lineTo(Math.cos(a) * (hubR * 0.72), Math.sin(a) * (hubR * 0.72));
            ctx.strokeStyle = "#E5E7EB";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          ctx.restore();
        });
        ctx.restore();

        // 5. Bottom Trapezoid Head Shield & Capstan Rollers
        const trapWTop = tapeW * 0.56;
        const trapWBot = tapeW * 0.64;
        const trapH = tapeH * 0.2;
        const trapY = y0 + tapeH - trapH;

        ctx.beginPath();
        ctx.moveTo(cx - trapWTop / 2, trapY);
        ctx.lineTo(cx + trapWTop / 2, trapY);
        ctx.lineTo(cx + trapWBot / 2, y0 + tapeH);
        ctx.lineTo(cx - trapWBot / 2, y0 + tapeH);
        ctx.closePath();
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.stroke();

        // Magnetic Tape Ribbon running across bottom rollers
        ctx.beginPath();
        ctx.moveTo(cx - trapWTop * 0.42, trapY + trapH * 0.55);
        ctx.lineTo(cx + trapWTop * 0.42, trapY + trapH * 0.55);
        ctx.strokeStyle = isPlaying ? "#FF6B1A" : "#524139";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener("resize", resize);
    };
  }, [deckMode, isPlaying, subscribeAudio, audioElementRef, currentSong?.title]);

  /* ── Interactive Pointer Physics: Needle Drop Scrubbing & Platter Scratching ── */
  const getPointerCoords = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, width: 1, height: 1 };
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  const handlePointerDown = (e) => {
    const { x, y, width, height } = getPointerCoords(e);
    const phys = physRef.current;

    if (deckMode === "cassette") {
      phys.interaction = "reel";
      phys.lastPointerX = x;
      playDeckSound("click");
      return;
    }

    const minDim = Math.min(width, height);
    const platterR = Math.min(minDim * 0.4, 215);
    const cx = width * 0.44;
    const cy = height * 0.5;

    const pivotX = cx + platterR + Math.min(58, width * 0.09);
    const pivotY = cy - platterR * 0.62;
    const armLen = platterR * 1.18;

    const headX = pivotX - Math.sin(phys.tonearmAngle) * armLen;
    const headY = pivotY + Math.cos(phys.tonearmAngle) * armLen;

    // 1. Check if grabbing the Tonearm Headshell / Shaft
    const distToHead = Math.hypot(x - headX, y - headY);
    if (distToHead < 44) {
      phys.interaction = "tonearm";
      playDeckSound("click");
      return;
    }

    // 2. Check if touching the Spinning Vinyl Platter
    const distToPlatter = Math.hypot(x - cx, y - cy);
    if (distToPlatter <= platterR + 10) {
      phys.interaction = "platter";
      phys.lastPointerAngle = Math.atan2(y - cy, x - cx);
    }
  };

  const handlePointerMove = (e) => {
    const { x, y, width, height } = getPointerCoords(e);
    const phys = physRef.current;
    const el = audioElementRef?.current;

    const minDim = Math.min(width, height);
    const platterR = Math.min(minDim * 0.4, 215);
    const cx = width * 0.44;
    const cy = height * 0.5;
    const pivotX = cx + platterR + Math.min(58, width * 0.09);
    const pivotY = cy - platterR * 0.62;
    const armLen = platterR * 1.18;

    if (!phys.interaction) {
      if (deckMode === "vinyl") {
        const headX = pivotX - Math.sin(phys.tonearmAngle) * armLen;
        const headY = pivotY + Math.cos(phys.tonearmAngle) * armLen;
        if (Math.hypot(x - headX, y - headY) < 42) {
          phys.hoverZone = "tonearm";
          if (canvasRef.current) canvasRef.current.style.cursor = "grab";
        } else if (Math.hypot(x - cx, y - cy) <= platterR) {
          phys.hoverZone = "platter";
          if (canvasRef.current) canvasRef.current.style.cursor = "grab";
        } else {
          phys.hoverZone = null;
          if (canvasRef.current) canvasRef.current.style.cursor = "default";
        }
      }
      return;
    }

    if (phys.interaction === "tonearm") {
      // Calculate angle from gimbal pivot to pointer
      const dx = pivotX - x;
      const dy = y - pivotY;
      const rawAngle = Math.atan2(dx, Math.max(20, dy));
      phys.tonearmAngle = Math.max(0.08, Math.min(0.78, rawAngle));
      return;
    }

    if (phys.interaction === "platter") {
      const curAngle = Math.atan2(y - cy, x - cx);
      let delta = curAngle - phys.lastPointerAngle;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;

      phys.platterAngle += delta;
      phys.lastPointerAngle = curAngle;

      // Scrub song time by spinning the record with your finger!
      if (el && el.duration && isFinite(el.duration)) {
        el.currentTime = Math.max(
          0,
          Math.min(el.duration, el.currentTime + delta * 2.8)
        );
      }
      return;
    }

    if (phys.interaction === "reel") {
      const dx = x - phys.lastPointerX;
      phys.lastPointerX = x;
      phys.platterAngle += dx * 0.025;
      if (el && el.duration && isFinite(el.duration)) {
        el.currentTime = Math.max(
          0,
          Math.min(el.duration, el.currentTime + dx * 0.18)
        );
      }
    }
  };

  const handlePointerUp = () => {
    const phys = physRef.current;
    const el = audioElementRef?.current;

    if (phys.interaction === "tonearm") {
      const OuterGrooveAngle = 0.37;
      const InnerGrooveAngle = 0.74;

      if (phys.tonearmAngle < 0.25) {
        // Dropped onto armrest -> pause playback
        setIsPlaying(false);
        playDeckSound("click");
      } else {
        // Dropped needle onto vinyl groove -> seek to exact groove radius & play!
        const ratio = Math.max(
          0,
          Math.min(
            1,
            (phys.tonearmAngle - OuterGrooveAngle) /
              (InnerGrooveAngle - OuterGrooveAngle)
          )
        );
        if (el && el.duration && isFinite(el.duration)) {
          el.currentTime = ratio * el.duration;
        }
        setIsPlaying(true);
        playDeckSound("needle");
      }
    }

    phys.interaction = null;
  };

  const formatTime = (s) => {
    if (!s || isNaN(s) || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = String(Math.floor(s % 60)).padStart(2, "0");
    return `${m}:${sec}`;
  };

  const crateList = librarySongs.length > 0 ? librarySongs : playlist;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 50,
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "76px 16px 20px",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* ── MAIN BRUSHED-METAL ANALOG CHASSIS ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="surface-card"
        style={{
          width: "100%",
          maxWidth: 960,
          height: "min(76vh, 620px)",
          borderRadius: 28,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-strong)",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "18px 22px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top Engraved Hardware Header Strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            zIndex: 5,
          }}
        >
          {/* Current Track Readout */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: isPlaying ? "#FF5500" : "var(--text-muted)",
                boxShadow: isPlaying ? "0 0 12px #FF5500" : "none",
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "min(46vw, 340px)",
                }}
              >
                {currentSong?.title || "Select a Record"}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "0.72rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                {currentSong?.artist || "MUSIO ANALOG DIRECT-DRIVE"} ·{" "}
                {formatTime(timeUI.cur)} / {formatTime(timeUI.dur)}
              </div>
            </div>
          </div>

          {/* Physical Mode Switcher: Vinyl LP vs C-90 Cassette */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "var(--bg-subtle)",
              padding: 4,
              borderRadius: 999,
              border: "1px solid var(--border-subtle)",
            }}
          >
            {[
              { id: "vinyl", label: "◉ 12″ VINYL LP" },
              { id: "cassette", label: "📼 C-90 TAPE" },
            ].map((m) => {
              const active = deckMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    playDeckSound("click");
                    setDeckMode(m.id);
                  }}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    padding: "6px 14px",
                    fontFamily: "var(--font-display)",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    cursor: "pointer",
                    background: active ? "var(--accent-primary)" : "transparent",
                    color: active ? "#FFFFFF" : "var(--text-secondary)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive 60fps Canvas Area */}
        <div
          style={{
            flex: 1,
            position: "relative",
            width: "100%",
            minHeight: 260,
            touchAction: "none",
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
            }}
          />

          {/* Subtle Engraved Instruction Whisper */}
          <div
            style={{
              position: "absolute",
              bottom: 4,
              left: 0,
              right: 0,
              textAlign: "center",
              pointerEvents: "none",
              fontFamily: "var(--font-display)",
              fontSize: "0.68rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              opacity: 0.72,
            }}
          >
            {deckMode === "vinyl"
              ? "DRAG TONEARM NEEDLE ACROSS GROOVES TO SCRUB  ·  HOLD OR SPIN PLATTER TO PITCH-BEND"
              : "DRAG ACROSS CASSETTE REELS TO WIND TAPE  ·  LIVE ANALOG VU METERS"}
          </div>
        </div>

        {/* Bottom Physical Hardware Control Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            paddingTop: 10,
            borderTop: "1px solid var(--border-subtle)",
            zIndex: 5,
          }}
        >
          {/* Left: Start/Stop + Prev/Next Transport */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => {
                playDeckSound("needle");
                setIsPlaying(!isPlaying);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 18px",
                borderRadius: 12,
                border: "1px solid var(--accent-primary)",
                background: isPlaying ? "var(--accent-primary)" : "var(--bg-subtle)",
                color: isPlaying ? "#FFFFFF" : "var(--text-primary)",
                fontFamily: "var(--font-display)",
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                cursor: "pointer",
                boxShadow: isPlaying ? "var(--glow-accent)" : "none",
              }}
            >
              <span>{isPlaying ? "■ STOP" : "▶ START"}</span>
            </button>

            <button
              onClick={() => {
                playDeckSound("click");
                prevSong();
              }}
              title="Previous Record"
              style={{
                padding: "9px 12px",
                borderRadius: 12,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-subtle)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ◀◀
            </button>

            <button
              onClick={() => {
                playDeckSound("click");
                nextSong();
              }}
              title="Next Record"
              style={{
                padding: "9px 12px",
                borderRadius: 12,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-subtle)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ▶▶
            </button>
          </div>

          {/* Center: RPM Pitch Selector (28 Slowed / 33 Normal / 45 Upbeat) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "var(--bg-subtle)",
              padding: 4,
              borderRadius: 12,
              border: "1px solid var(--border-subtle)",
            }}
          >
            {[
              { id: "28", label: "28 RPM (SLOW)" },
              { id: "33", label: "33⅓ RPM" },
              { id: "45", label: "45 RPM (FAST)" },
            ].map((r) => {
              const active = rpmPreset === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    playDeckSound("click");
                    setRpmPreset(r.id);
                  }}
                  style={{
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontFamily: "var(--font-display)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: active ? "var(--text-primary)" : "transparent",
                    color: active ? "var(--bg-primary)" : "var(--text-secondary)",
                    transition: "all 0.18s ease",
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* Right: Warm Vinyl Crackle Toggle + Record Crate Picker */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => {
                playDeckSound("click");
                setCrackleOn((v) => !v);
              }}
              style={{
                padding: "9px 13px",
                borderRadius: 12,
                border: `1px solid ${
                  crackleOn ? "var(--accent-primary)" : "var(--border-subtle)"
                }`,
                background: crackleOn ? "var(--accent-soft)" : "var(--bg-subtle)",
                color: crackleOn ? "var(--accent-primary)" : "var(--text-secondary)",
                fontFamily: "var(--font-display)",
                fontSize: "0.74rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✦ CRACKLE {crackleOn ? "ON" : "OFF"}
            </button>

            <button
              onClick={() => {
                playDeckSound("click");
                setCrateOpen((v) => !v);
              }}
              style={{
                padding: "9px 14px",
                borderRadius: 12,
                border: "1px solid var(--border-strong)",
                background: "var(--bg-subtle)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
                fontSize: "0.74rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ▤ CRATE ({crateList.length})
            </button>
          </div>
        </div>

        {/* Slide-Up Record Sleeve Crate Drawer */}
        <AnimatePresence>
          {crateOpen && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              style={{
                position: "absolute",
                inset: "auto 0 0 0",
                maxHeight: "68%",
                background: "var(--bg-glass-heavy)",
                backdropFilter: "blur(24px)",
                borderTop: "1px solid var(--border-strong)",
                padding: "16px 20px",
                zIndex: 30,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--text-primary)",
                  }}
                >
                  Select Vinyl / Cassette From Crate
                </span>
                <button
                  onClick={() => setCrateOpen(false)}
                  style={{
                    border: "none",
                    background: "var(--bg-subtle)",
                    color: "var(--text-primary)",
                    borderRadius: 999,
                    padding: "4px 12px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Close ✕
                </button>
              </div>

              <div
                style={{
                  overflowY: "auto",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                  gap: 10,
                  paddingBottom: 8,
                }}
              >
                {crateList.map((song, idx) => {
                  const isCurrent = currentSong?._id === song._id;
                  return (
                    <div
                      key={song._id || idx}
                      onClick={() => {
                        playDeckSound("needle");
                        playSong(crateList, idx);
                        setCrateOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: 8,
                        borderRadius: 12,
                        cursor: "pointer",
                        background: isCurrent
                          ? "var(--accent-soft)"
                          : "var(--bg-subtle)",
                        border: `1px solid ${
                          isCurrent ? "var(--accent-primary)" : "var(--border-subtle)"
                        }`,
                      }}
                    >
                      <img
                        src={song.coverImage || "/music-player.png"}
                        alt={song.title}
                        onError={(e) => {
                          e.target.src = "/music-player.png";
                        }}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 8,
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "0.82rem",
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
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {song.artist || "Unknown Artist"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
