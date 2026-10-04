"use client";
import { useEffect, useRef, useMemo, useState } from "react";
import { usePlayer } from "../context/PlayerContext";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const MYTHIC_NAMES = [
  "LYRA",
  "CYGNUS",
  "VELA",
  "ORION",
  "CASSIOPEIA",
  "ANDROMEDA",
  "CARINA",
  "ASTRALIS",
  "HYPERION",
  "SOLARIS",
];

// Subtle Web Audio harmonic chime when locking a star into a Voyager Flight Path
function playStarLockChime(stepIndex = 0) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window.__musioChimeCtx) {
      window.__musioChimeCtx = new AudioCtx();
    }
    const ctx = window.__musioChimeCtx;
    if (ctx.state === "suspended") ctx.resume();

    // Celestial pentatonic scale frequencies
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];
    const freq = scale[stepIndex % scale.length];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.065, ctx.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.58);
  } catch {
    // Ignore audio context restrictions
  }
}

export default function SonicConstellationMap({ songs: propSongs }) {
  const {
    playSong,
    playlist,
    currentIndex,
    isPlaying,
    setIsPlaying,
    subscribeAudio,
    audioElementRef,
  } = usePlayer();

  const canvasRef = useRef(null);
  const [catalogSongs, setCatalogSongs] = useState([]);
  const hoveredNodeIdRef = useRef(null);

  // Voyager Flight Path state (kept in ref for 60fps canvas loop)
  const voyagerRef = useRef({
    isDrawing: false,
    draftIds: [],
    activePathIds: [],
    constellationTitle: "",
    cursorWX: 0,
    cursorWY: 0,
    bursts: [],
    lastTapTime: 0,
  });

  // Smooth camera state with inertia + pinch/wheel zoom
  const camRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    zoom: 1,
    targetZoom: 1,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    camStartX: 0,
    camStartY: 0,
    movedDistance: 0,
    pinchDist: null,
    downNode: null,
  });

  // Always keep full library available so charting a 3-star path doesn't hide other stars
  useEffect(() => {
    if (propSongs && propSongs.length > 0) {
      setCatalogSongs(propSongs);
      return;
    }
    let mounted = true;
    fetch("/api/songs/all")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data?.songs) ? data.songs : Array.isArray(data) ? data : [];
        if (list.length > 0) setCatalogSongs(list);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [propSongs]);

  // Restore saved custom constellation path if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem("musio-voyager-path");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.ids) && parsed.ids.length >= 2) {
          voyagerRef.current.activePathIds = parsed.ids;
          voyagerRef.current.constellationTitle = parsed.title || "VOYAGER ARC";
        }
      }
    } catch {}
  }, []);

  const currentSong = currentIndex >= 0 ? playlist[currentIndex] : null;
  const activeSongs =
    propSongs && propSongs.length > 0
      ? propSongs
      : catalogSongs.length > 0
      ? catalogSongs
      : playlist;

  // Build organic constellation clusters
  const { nodes, edges } = useMemo(() => {
    const list = activeSongs || [];
    if (!list.length) return { nodes: [], edges: [] };

    const groups = {};
    list.forEach((song, idx) => {
      const key = (song.artist || song.genre || "Celestial").trim().toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push({ song, idx });
    });

    const palette = [
      { core: "#FFF7ED", glow: "#FF6B2B", rgb: "255, 107, 43" },
      { core: "#F5F3FF", glow: "#A78BFA", rgb: "167, 139, 250" },
      { core: "#ECFEFF", glow: "#38BDF8", rgb: "56, 189, 248" },
      { core: "#FDF2F8", glow: "#F472B6", rgb: "244, 114, 182" },
      { core: "#ECFDF5", glow: "#34D399", rgb: "52, 211, 153" },
      { core: "#FEFCE8", glow: "#FBBF24", rgb: "251, 191, 36" },
    ];

    const computedNodes = [];
    const computedEdges = [];
    const groupKeys = Object.keys(groups);

    groupKeys.forEach((gKey, gIdx) => {
      const items = groups[gKey];
      const theme = palette[gIdx % palette.length];

      // Golden angle spiral distribution across the sky
      const goldenAngle = gIdx * 2.39996;
      const clusterRadius = gIdx === 0 ? 0 : 145 + Math.sqrt(gIdx) * 145;
      const cx = Math.cos(goldenAngle) * clusterRadius * 1.25;
      const cy = Math.sin(goldenAngle) * clusterRadius * 0.82;

      let prevId = null;

      items.forEach((item, localIdx) => {
        const subAngle = (localIdx / Math.max(1, items.length)) * Math.PI * 2 + gIdx * 1.3;
        const subDist = items.length === 1 ? 0 : 54 + (localIdx % 3) * 32;
        const baseX = cx + Math.cos(subAngle) * subDist;
        const baseY = cy + Math.sin(subAngle) * subDist;

        const id = item.song._id || `star-${item.idx}`;
        computedNodes.push({
          id,
          song: item.song,
          songIndex: item.idx,
          baseX,
          baseY,
          x: baseX,
          y: baseY,
          theme,
          radius: 3.4 + (item.idx % 3) * 0.8,
          phase: item.idx * 1.37,
          floatSpeed: 0.45 + (item.idx % 5) * 0.1,
        });

        if (prevId) {
          computedEdges.push({
            from: prevId,
            to: id,
            rgb: theme.rgb,
            pulseOffset: (gIdx + localIdx) * 0.31,
            primary: true,
          });
        }
        prevId = id;
      });
    });

    // Subtle deep-sky bridges between constellations
    for (let i = 0; i < computedNodes.length - 2; i += 2) {
      computedEdges.push({
        from: computedNodes[i].id,
        to: computedNodes[(i + 2) % computedNodes.length].id,
        rgb: "180, 195, 220",
        pulseOffset: i * 0.19,
        primary: false,
      });
    }

    return { nodes: computedNodes, edges: computedEdges };
  }, [activeSongs]);

  // Smoothly glide camera when the active song changes along a Voyager Flight Path
  useEffect(() => {
    if (!currentSong?._id || !nodes.length) return;
    const vIds = voyagerRef.current.activePathIds;
    if (vIds.includes(currentSong._id)) {
      const targetNode = nodes.find((n) => n.id === currentSong._id);
      if (targetNode) {
        camRef.current.targetX = -targetNode.baseX * camRef.current.targetZoom;
        camRef.current.targetY = -targetNode.baseY * camRef.current.targetZoom;
      }
    }
  }, [currentSong?._id, nodes]);

  /* ── 60fps Celestial Planetarium Render Loop ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let t = 0;

    // 3 Parallax Depth Layers of Background Stars
    const bgStars = Array.from({ length: 240 }, (_, i) => ({
      x: (Math.random() - 0.5) * 2800,
      y: (Math.random() - 0.5) * 1800,
      r: 0.4 + (i % 3) * 0.45,
      depth: 0.15 + (i % 3) * 0.2,
      twinkleSpeed: 0.5 + Math.random() * 1.4,
      twinklePhase: Math.random() * Math.PI * 2,
    }));

    // Slow-drifting foreground cosmic dust motes
    const dustMotes = Array.from({ length: 48 }, () => ({
      x: (Math.random() - 0.5) * 1800,
      y: (Math.random() - 0.5) * 1200,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -0.08 - Math.random() * 0.14,
      r: 0.8 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
    }));

    // Ion trail particles emitted by the Voyager probe
    const probeTrail = [];

    // Occasional faint shooting star
    let meteor = null;

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

    const nodeMap = new Map();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    const unsubscribe = subscribeAudio((audio) => {
      if (!width || !height) return;
      t += 0.016;

      const cam = camRef.current;
      const voyager = voyagerRef.current;

      // Silky camera damping
      cam.x += (cam.targetX - cam.x) * 0.085;
      cam.y += (cam.targetY - cam.y) * 0.085;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.09;

      // 1. Deep Velvet Night-Sky Gradient
      const skyGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        20,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.85
      );
      skyGrad.addColorStop(0, "#090C18");
      skyGrad.addColorStop(0.55, "#05070F");
      skyGrad.addColorStop(1, "#020307");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Slowly Breathing Volumetric Nebula Clouds
      const nebulae = [
        { ox: -220, oy: -120, r: 460, color: "rgba(255, 95, 30, 0.055)", speed: 0.18 },
        { ox: 240, oy: 90, r: 520, color: "rgba(139, 92, 246, 0.055)", speed: -0.14 },
        { ox: -60, oy: 190, r: 420, color: "rgba(56, 189, 248, 0.04)", speed: 0.11 },
      ];
      nebulae.forEach((nb, idx) => {
        const nx =
          width / 2 +
          cam.x * 0.25 +
          nb.ox +
          Math.cos(t * nb.speed + idx) * 45;
        const ny =
          height / 2 +
          cam.y * 0.25 +
          nb.oy +
          Math.sin(t * nb.speed + idx) * 35;
        const g = ctx.createRadialGradient(nx, ny, 10, nx, ny, nb.r);
        g.addColorStop(0, nb.color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      });

      // 3. Multi-Depth Parallax Background Stars
      bgStars.forEach((st) => {
        const sx =
          ((st.x + cam.x * st.depth + width * 2) % (width * 1.8)) - width * 0.4;
        const sy =
          ((st.y + cam.y * st.depth + height * 2) % (height * 1.8)) - height * 0.4;
        const alpha = 0.18 + 0.45 * (0.5 + 0.5 * Math.sin(t * st.twinkleSpeed + st.twinklePhase));
        ctx.fillStyle = `rgba(235, 242, 255, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, st.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Occasional subtle shooting star in deep space
      if (!meteor && Math.random() < 0.004) {
        meteor = {
          x: width * (0.2 + Math.random() * 0.6),
          y: height * (0.12 + Math.random() * 0.35),
          vx: -6.5,
          vy: 2.8,
          life: 1,
        };
      }
      if (meteor) {
        meteor.x += meteor.vx;
        meteor.y += meteor.vy;
        meteor.life -= 0.022;
        const mg = ctx.createLinearGradient(
          meteor.x,
          meteor.y,
          meteor.x - meteor.vx * 9,
          meteor.y - meteor.vy * 9
        );
        mg.addColorStop(0, `rgba(255,255,255,${meteor.life * 0.7})`);
        mg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = mg;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(meteor.x, meteor.y);
        ctx.lineTo(meteor.x - meteor.vx * 9, meteor.y - meteor.vy * 9);
        ctx.stroke();
        if (meteor.life <= 0) meteor = null;
      }

      ctx.save();
      ctx.translate(width / 2 + cam.x, height / 2 + cam.y);
      ctx.scale(cam.zoom, cam.zoom);

      // 4. Subtle Planetarium Astrolabe / Orbital Coordinate Rings
      ctx.save();
      ctx.rotate(t * 0.015);
      [180, 340, 520, 720].forEach((ringR, idx) => {
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.028)";
        ctx.lineWidth = 1 / cam.zoom;
        if (idx % 2 === 1) ctx.setLineDash([4, 10]);
        else ctx.setLineDash([]);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();

      // 5. Update Organic Orbital Micro-Float for Each Song Star
      nodes.forEach((node) => {
        node.x =
          node.baseX +
          Math.cos(t * node.floatSpeed + node.phase) * 4.5;
        node.y =
          node.baseY +
          Math.sin(t * node.floatSpeed * 1.3 + node.phase) * 3.8;
      });

      // 6. Natural Constellation Filaments & Traveling Photon Pulses
      edges.forEach((edge) => {
        const n1 = nodeMap.get(edge.from);
        const n2 = nodeMap.get(edge.to);
        if (!n1 || !n2) return;

        const isEdgeActive =
          currentSong?._id === n1.id ||
          currentSong?._id === n2.id ||
          hoveredNodeIdRef.current === n1.id ||
          hoveredNodeIdRef.current === n2.id;

        const baseAlpha = edge.primary
          ? isEdgeActive
            ? 0.38
            : 0.14
          : 0.045;

        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.strokeStyle = `rgba(${edge.rgb}, ${baseAlpha})`;
        ctx.lineWidth = (edge.primary ? 1.1 : 0.7) / Math.sqrt(cam.zoom);
        ctx.stroke();

        if (edge.primary) {
          const prog = (t * 0.16 + edge.pulseOffset) % 1;
          const px = n1.x + (n2.x - n1.x) * prog;
          const py = n1.y + (n2.y - n1.y) * prog;
          const pAlpha = Math.sin(prog * Math.PI) * 0.52;

          ctx.fillStyle = `rgba(${edge.rgb}, ${pAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 7. VOYAGER FLIGHT PATH & CUSTOM CONSTELLATION RENDERING
      const displayPathIds =
        voyager.isDrawing && voyager.draftIds.length > 0
          ? voyager.draftIds
          : voyager.activePathIds;

      const pathNodes = displayPathIds.map((id) => nodeMap.get(id)).filter(Boolean);

      if (pathNodes.length >= 1) {
        // Draw connected trajectory segments
        if (pathNodes.length >= 2) {
          // Soft outer trajectory glow
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(pathNodes[0].x, pathNodes[0].y);
          for (let i = 1; i < pathNodes.length; i++) {
            ctx.lineTo(pathNodes[i].x, pathNodes[i].y);
          }
          ctx.strokeStyle = "rgba(255, 175, 75, 0.22)";
          ctx.lineWidth = 5 / Math.sqrt(cam.zoom);
          ctx.stroke();

          // Crisp animated trajectory beam
          ctx.beginPath();
          ctx.moveTo(pathNodes[0].x, pathNodes[0].y);
          for (let i = 1; i < pathNodes.length; i++) {
            ctx.lineTo(pathNodes[i].x, pathNodes[i].y);
          }
          ctx.setLineDash([7 / cam.zoom, 5 / cam.zoom]);
          ctx.lineDashOffset = -t * 18;
          ctx.strokeStyle = "rgba(255, 215, 130, 0.85)";
          ctx.lineWidth = 1.5 / Math.sqrt(cam.zoom);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Render Custom Constellation Mythic Inscription at centroid
          if (!voyager.isDrawing && voyager.constellationTitle) {
            let cx = 0,
              cy = 0;
            pathNodes.forEach((n) => {
              cx += n.x;
              cy += n.y;
            });
            cx /= pathNodes.length;
            cy /= pathNodes.length;

            ctx.save();
            ctx.textAlign = "center";
            ctx.fillStyle = "rgba(255, 215, 150, 0.42)";
            ctx.font = "500 9.5px 'Space Grotesk', sans-serif";
            ctx.fillText(`✦  ${voyager.constellationTitle}  ✦`, cx, cy - 22);
            ctx.restore();
          }
        }

        // Elastic live laser line while user is actively dragging from star to star
        if (voyager.isDrawing) {
          const lastNode = pathNodes[pathNodes.length - 1];
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(lastNode.x, lastNode.y);
          ctx.lineTo(voyager.cursorWX, voyager.cursorWY);
          ctx.setLineDash([4 / cam.zoom, 4 / cam.zoom]);
          ctx.strokeStyle = "rgba(56, 189, 248, 0.78)";
          ctx.lineWidth = 1.4 / Math.sqrt(cam.zoom);
          ctx.stroke();
          ctx.setLineDash([]);

          // Cursor reticle in world space
          ctx.beginPath();
          ctx.arc(voyager.cursorWX, voyager.cursorWY, 5 / cam.zoom, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
          ctx.lineWidth = 1 / cam.zoom;
          ctx.stroke();
          ctx.restore();
        }

        // LIVE VOYAGER SPACECRAFT PROBE traveling along active segment
        if (!voyager.isDrawing && pathNodes.length >= 2) {
          const activeHopIdx = pathNodes.findIndex((n) => n.id === currentSong?._id);
          const fromIdx = activeHopIdx >= 0 ? activeHopIdx : 0;
          const toIdx = (fromIdx + 1) % pathNodes.length;

          // Only travel if there is a next waypoint (or loop around)
          if (fromIdx < pathNodes.length - 1 || pathNodes.length >= 2) {
            const fromStar = pathNodes[fromIdx];
            const toStar = pathNodes[toIdx];

            const el = audioElementRef?.current;
            const dur = el?.duration || 0;
            const cur = el?.currentTime || 0;
            const songProg =
              dur > 0 && isFinite(dur)
                ? Math.max(0, Math.min(1, cur / dur))
                : (t * 0.08) % 1;

            const px = fromStar.x + (toStar.x - fromStar.x) * songProg;
            const py = fromStar.y + (toStar.y - fromStar.y) * songProg;
            const angle = Math.atan2(toStar.y - fromStar.y, toStar.x - fromStar.x);

            // Spawn subtle ion exhaust particles behind the probe
            if (isPlaying && Math.random() < 0.65) {
              probeTrail.push({
                x: px - Math.cos(angle) * 5 + (Math.random() - 0.5) * 2.5,
                y: py - Math.sin(angle) * 5 + (Math.random() - 0.5) * 2.5,
                vx: -Math.cos(angle) * 0.4 + (Math.random() - 0.5) * 0.2,
                vy: -Math.sin(angle) * 0.4 + (Math.random() - 0.5) * 0.2,
                life: 1,
              });
            }

            // Draw ion trail
            for (let i = probeTrail.length - 1; i >= 0; i--) {
              const pt = probeTrail[i];
              pt.x += pt.vx;
              pt.y += pt.vy;
              pt.life -= 0.032;
              if (pt.life <= 0) {
                probeTrail.splice(i, 1);
                continue;
              }
              ctx.fillStyle = `rgba(56, 189, 248, ${(pt.life * 0.65).toFixed(3)})`;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 1.4 * pt.life, 0, Math.PI * 2);
              ctx.fill();
            }

            // Draw Voyager Probe Halo & Geometric Diamond Craft
            const pHalo = ctx.createRadialGradient(px, py, 0.5, px, py, 16);
            pHalo.addColorStop(0, "rgba(56, 189, 248, 0.85)");
            pHalo.addColorStop(0.5, "rgba(255, 190, 90, 0.25)");
            pHalo.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = pHalo;
            ctx.beginPath();
            ctx.arc(px, py, 16, 0, Math.PI * 2);
            ctx.fill();

            // Expanding telemetry pulse ring around probe
            const pulseR = 5 + ((t * 12) % 14);
            const pulseA = Math.max(0, 1 - (pulseR - 5) / 14) * 0.45;
            ctx.beginPath();
            ctx.arc(px, py, pulseR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(56, 189, 248, ${pulseA.toFixed(3)})`;
            ctx.lineWidth = 1 / cam.zoom;
            ctx.stroke();

            // Geometric Spacecraft Silhouette
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            ctx.fillStyle = "#FFFFFF";
            ctx.beginPath();
            ctx.moveTo(6.5, 0);
            ctx.lineTo(-4.5, -3.6);
            ctx.lineTo(-2.2, 0);
            ctx.lineTo(-4.5, 3.6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Subtle Probe Telemetry Whisper
            ctx.save();
            ctx.fillStyle = "rgba(165, 230, 255, 0.72)";
            ctx.font = "500 8.5px 'Space Grotesk', sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(
              `VOYAGER · ${Math.round(songProg * 100)}%`,
              px + 10,
              py - 7
            );
            ctx.restore();
          }
        }
      }

      // Stardust lock-in burst particles when charting waypoints
      for (let i = voyager.bursts.length - 1; i >= 0; i--) {
        const b = voyager.bursts[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life -= 0.03;
        if (b.life <= 0) {
          voyager.bursts.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `rgba(255, 215, 120, ${b.life.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 1.8 * b.life, 0, Math.PI * 2);
        ctx.fill();
      }

      // 8. Drifting Foreground Cosmic Dust Motes
      dustMotes.forEach((dm) => {
        dm.x += dm.vx;
        dm.y += dm.vy;
        if (dm.y < -600) dm.y = 600;
        if (dm.x < -900) dm.x = 900;
        if (dm.x > 900) dm.x = -900;
        const da = 0.12 + 0.22 * Math.sin(t * 0.8 + dm.phase);
        ctx.fillStyle = `rgba(255, 235, 210, ${da.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(dm.x, dm.y, dm.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 9. Song Stars, 4-Point Celestial Flares, Waypoint Rings & Floating Labels
      let activeStarScreenPos = null;

      nodes.forEach((node) => {
        const isCurrent = currentSong?._id === node.id;
        const isHovered = hoveredNodeIdRef.current === node.id;
        const waypointIdx = displayPathIds.indexOf(node.id);
        const isWaypoint = waypointIdx !== -1;

        const breathe = 0.88 + 0.24 * Math.sin(t * 1.4 + node.phase);
        const musicLift = isCurrent && isPlaying ? audio.bass * 2.5 : 0;
        const r =
          node.radius * breathe +
          (isCurrent ? 1.6 + musicLift : isHovered || isWaypoint ? 1.1 : 0);

        if (isCurrent) {
          activeStarScreenPos = {
            sx: width / 2 + cam.x + node.x * cam.zoom,
            sy: height / 2 + cam.y + node.y * cam.zoom,
            rgb: node.theme.rgb,
          };
        }

        // Delicate expanding celestial ripple rings on active playing star
        if (isCurrent && isPlaying) {
          for (let k = 0; k < 2; k++) {
            const rp = (t * 0.38 + k * 0.5) % 1;
            const ringR = r + rp * 38;
            ctx.beginPath();
            ctx.arc(node.x, node.y, ringR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${node.theme.rgb}, ${((1 - rp) * 0.42).toFixed(3)})`;
            ctx.lineWidth = 1.2 / cam.zoom;
            ctx.stroke();
          }
        }

        // Golden Orbital Waypoint Ring if part of Voyager Flight Path
        if (isWaypoint) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 6.5, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 210, 115, 0.72)";
          ctx.lineWidth = 1.1 / cam.zoom;
          ctx.stroke();

          // Roman numeral waypoint marker
          ctx.fillStyle = "#FFD580";
          ctx.font = "600 9px 'Space Grotesk', sans-serif";
          ctx.textAlign = "right";
          ctx.fillText(
            ROMAN[waypointIdx] || `${waypointIdx + 1}`,
            node.x - r - 8,
            node.y + 3
          );
          ctx.restore();
        }

        // Soft Radial Star Halo
        const haloR = r * (isCurrent || isHovered ? 6.5 : isWaypoint ? 5.2 : 4.2);
        const halo = ctx.createRadialGradient(
          node.x,
          node.y,
          r * 0.2,
          node.x,
          node.y,
          haloR
        );
        halo.addColorStop(
          0,
          `rgba(${node.theme.rgb}, ${isCurrent || isHovered ? 0.75 : 0.42})`
        );
        halo.addColorStop(
          0.45,
          `rgba(${node.theme.rgb}, ${isCurrent || isHovered ? 0.22 : 0.1})`
        );
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(node.x, node.y, haloR, 0, Math.PI * 2);
        ctx.fill();

        // 4-Point Celestial Diffraction Starlight Spikes
        const spikeLen = r * (isCurrent || isHovered ? 5.2 : 3.1);
        ctx.strokeStyle = `rgba(255, 255, 255, ${isCurrent || isHovered ? 0.75 : 0.32})`;
        ctx.lineWidth = 1 / Math.sqrt(cam.zoom);
        ctx.beginPath();
        ctx.moveTo(node.x - spikeLen, node.y);
        ctx.lineTo(node.x + spikeLen, node.y);
        ctx.moveTo(node.x, node.y - spikeLen);
        ctx.lineTo(node.x, node.y + spikeLen);
        ctx.stroke();

        // Star Luminous Core
        ctx.fillStyle = node.theme.core;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 0.85, 0, Math.PI * 2);
        ctx.fill();

        // Minimal Astronomical Typography (No Boxes!)
        const labelAlpha = isCurrent || isHovered || isWaypoint ? 0.96 : 0.58;
        ctx.textAlign = "left";
        ctx.fillStyle = isCurrent
          ? "#FF7A33"
          : isWaypoint
          ? "#FFE4A3"
          : `rgba(245, 247, 255, ${labelAlpha})`;
        ctx.font = `${
          isCurrent || isHovered || isWaypoint ? "600" : "400"
        } 11.5px 'Space Grotesk', sans-serif`;

        const titleText =
          node.song.title.length > 22 && !isCurrent && !isHovered
            ? node.song.title.slice(0, 20) + "…"
            : node.song.title;
        ctx.fillText(titleText, node.x + r + 8, node.y + 3);

        if (isCurrent || isHovered || isWaypoint) {
          ctx.fillStyle = "rgba(180, 190, 215, 0.72)";
          ctx.font = "400 9.5px 'Inter', sans-serif";
          ctx.fillText(
            (node.song.artist || "Unknown Artist").toUpperCase(),
            node.x + r + 8,
            node.y + 16
          );
        }
      });

      ctx.restore();

      // 10. Off-Screen Singing Star Compass Beacon (if user pans away from playing star)
      if (activeStarScreenPos) {
        const { sx, sy, rgb } = activeStarScreenPos;
        const pad = 36;
        if (sx < pad || sx > width - pad || sy < 70 || sy > height - pad) {
          const angle = Math.atan2(sy - height / 2, sx - width / 2);
          const bx = Math.max(pad, Math.min(width - pad, width / 2 + Math.cos(angle) * (width * 0.44)));
          const by = Math.max(82, Math.min(height - pad, height / 2 + Math.sin(angle) * (height * 0.42)));

          const bg = ctx.createRadialGradient(bx, by, 1, bx, by, 22);
          bg.addColorStop(0, `rgba(${rgb}, 0.75)`);
          bg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.arc(bx, by, 22, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 11. Whisper-Faint Planetarium Sky Inscription at Bottom (Zero Boxy UI)
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "400 10.5px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "rgba(205, 218, 245, 0.34)";
      const bottomHint =
        voyager.activePathIds.length >= 2
          ? `✦  ${voyager.constellationTitle} (${voyager.activePathIds.length} STARS CHARTED)  ·  DRAG STAR-TO-STAR TO RECHART  ·  DOUBLE-TAP SKY TO CLEAR  ✦`
          : "DRAG SKY TO EXPLORE   ·   TAP STAR TO PLAY   ·   DRAG STAR-TO-STAR TO CHART VOYAGER FLIGHT PATH";
      ctx.fillText(bottomHint, width / 2, height - 22);
      ctx.restore();
    });

    return () => {
      unsubscribe();
      window.removeEventListener("resize", resize);
    };
  }, [nodes, edges, currentSong?._id, isPlaying, subscribeAudio, audioElementRef]);

  /* ── Smooth Pan, Pinch-to-Zoom, & Voyager Star-to-Star Trajectory Charting ── */
  const screenToWorld = (clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { wx: 0, wy: 0 };
    const cam = camRef.current;
    const wx = (clientX - rect.left - rect.width / 2 - cam.x) / cam.zoom;
    const wy = (clientY - rect.top - rect.height / 2 - cam.y) / cam.zoom;
    return { wx, wy };
  };

  const findHitNode = (clientX, clientY, radiusPx = 28) => {
    const { wx, wy } = screenToWorld(clientX, clientY);
    const cam = camRef.current;
    const maxDist = radiusPx / cam.zoom;
    let closest = null;
    let minD = maxDist;

    nodes.forEach((n) => {
      const d = Math.hypot(n.x - wx, n.y - wy);
      if (d < minD) {
        minD = d;
        closest = n;
      }
    });
    return closest;
  };

  const spawnStarBurst = (wx, wy) => {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const sp = 0.6 + Math.random() * 1.6;
      voyagerRef.current.bursts.push({
        x: wx,
        y: wy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
      });
    }
  };

  const finalizeInteraction = (clientX, clientY, tapRadius = 30) => {
    const cam = camRef.current;
    const voyager = voyagerRef.current;

    // If user traced a Voyager Flight Path across 2+ stars
    if (voyager.isDrawing && voyager.draftIds.length >= 2) {
      const lockedIds = [...voyager.draftIds];
      const queuedNodes = lockedIds
        .map((id) => nodes.find((n) => n.id === id))
        .filter(Boolean);

      const firstArtist = (queuedNodes[0]?.song?.artist || "").trim().split(" ")[0].toUpperCase();
      const mythic = MYTHIC_NAMES[lockedIds.length % MYTHIC_NAMES.length];
      const title =
        firstArtist && firstArtist !== "UNKNOWN"
          ? `${firstArtist} · ${mythic} ARC`
          : `CONSTELLATION ${mythic}-${ROMAN[lockedIds.length - 1] || lockedIds.length}`;

      voyager.activePathIds = lockedIds;
      voyager.constellationTitle = title;
      voyager.isDrawing = false;
      voyager.draftIds = [];

      try {
        localStorage.setItem(
          "musio-voyager-path",
          JSON.stringify({ ids: lockedIds, title })
        );
      } catch {}

      // Queue the exact traced sequence of songs and start from Star I
      const queuedSongs = queuedNodes.map((n) => n.song);
      if (queuedSongs.length > 0) {
        playSong(queuedSongs, 0);
        cam.targetX = -queuedNodes[0].baseX * cam.targetZoom;
        cam.targetY = -queuedNodes[0].baseY * cam.targetZoom;
      }
      cam.isDragging = false;
      cam.downNode = null;
      return;
    }

    voyager.isDrawing = false;
    voyager.draftIds = [];

    // Single tap/click
    if (cam.movedDistance < 12) {
      const hit = findHitNode(clientX, clientY, tapRadius);
      if (hit) {
        cam.targetX = -hit.baseX * cam.targetZoom;
        cam.targetY = -hit.baseY * cam.targetZoom;
        if (currentSong?._id === hit.id) {
          setIsPlaying(!isPlaying);
        } else {
          playSong(activeSongs, hit.songIndex);
        }
      } else {
        // Check for double-tap / double-click on empty sky to clear active Voyager Path
        const now = Date.now();
        if (now - voyager.lastTapTime < 340 && voyager.activePathIds.length > 0) {
          voyager.activePathIds = [];
          voyager.constellationTitle = "";
          try {
            localStorage.removeItem("musio-voyager-path");
          } catch {}
        }
        voyager.lastTapTime = now;
      }
    }

    cam.isDragging = false;
    cam.downNode = null;
  };

  const handleMouseDown = (e) => {
    const hit = findHitNode(e.clientX, e.clientY, 26);
    camRef.current.isDragging = true;
    camRef.current.dragStartX = e.clientX;
    camRef.current.dragStartY = e.clientY;
    camRef.current.camStartX = camRef.current.targetX;
    camRef.current.camStartY = camRef.current.targetY;
    camRef.current.movedDistance = 0;
    camRef.current.downNode = hit;

    if (hit) {
      const { wx, wy } = screenToWorld(e.clientX, e.clientY);
      voyagerRef.current.draftIds = [hit.id];
      voyagerRef.current.cursorWX = wx;
      voyagerRef.current.cursorWY = wy;
    }
  };

  const handleMouseMove = (e) => {
    const cam = camRef.current;
    const voyager = voyagerRef.current;

    if (cam.isDragging) {
      const dx = e.clientX - cam.dragStartX;
      const dy = e.clientY - cam.dragStartY;
      cam.movedDistance = Math.hypot(dx, dy);

      // If pointer started on a star, dragging charts a Voyager Flight Path!
      if (cam.downNode) {
        if (cam.movedDistance > 8 && !voyager.isDrawing) {
          voyager.isDrawing = true;
          playStarLockChime(0);
          spawnStarBurst(cam.downNode.x, cam.downNode.y);
        }
        const { wx, wy } = screenToWorld(e.clientX, e.clientY);
        voyager.cursorWX = wx;
        voyager.cursorWY = wy;

        const hoverStar = findHitNode(e.clientX, e.clientY, 32);
        if (hoverStar && !voyager.draftIds.includes(hoverStar.id)) {
          voyager.draftIds.push(hoverStar.id);
          playStarLockChime(voyager.draftIds.length - 1);
          spawnStarBurst(hoverStar.x, hoverStar.y);
        }
      } else {
        // Normal empty-sky pan
        cam.targetX = cam.camStartX + dx;
        cam.targetY = cam.camStartY + dy;
      }
    } else {
      const hit = findHitNode(e.clientX, e.clientY, 22);
      hoveredNodeIdRef.current = hit ? hit.id : null;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hit ? "crosshair" : "grab";
      }
    }
  };

  const handleMouseUp = (e) => {
    if (!camRef.current.isDragging) return;
    finalizeInteraction(e.clientX, e.clientY, 28);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      camRef.current.pinchDist = d;
      camRef.current.isDragging = false;
      voyagerRef.current.isDrawing = false;
      return;
    }
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const hit = findHitNode(touch.clientX, touch.clientY, 34);
      camRef.current.isDragging = true;
      camRef.current.dragStartX = touch.clientX;
      camRef.current.dragStartY = touch.clientY;
      camRef.current.camStartX = camRef.current.targetX;
      camRef.current.camStartY = camRef.current.targetY;
      camRef.current.movedDistance = 0;
      camRef.current.downNode = hit;

      if (hit) {
        const { wx, wy } = screenToWorld(touch.clientX, touch.clientY);
        voyagerRef.current.draftIds = [hit.id];
        voyagerRef.current.cursorWX = wx;
        voyagerRef.current.cursorWY = wy;
      }
    }
  };

  const handleTouchMove = (e) => {
    const cam = camRef.current;
    const voyager = voyagerRef.current;

    if (e.touches.length === 2 && cam.pinchDist) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleDelta = (d - cam.pinchDist) * 0.004;
      cam.targetZoom = Math.max(0.45, Math.min(2.6, cam.targetZoom + scaleDelta));
      cam.pinchDist = d;
      return;
    }
    if (e.touches.length === 1 && cam.isDragging) {
      const touch = e.touches[0];
      const dx = touch.clientX - cam.dragStartX;
      const dy = touch.clientY - cam.dragStartY;
      cam.movedDistance = Math.hypot(dx, dy);

      if (cam.downNode) {
        if (cam.movedDistance > 10 && !voyager.isDrawing) {
          voyager.isDrawing = true;
          playStarLockChime(0);
          spawnStarBurst(cam.downNode.x, cam.downNode.y);
        }
        const { wx, wy } = screenToWorld(touch.clientX, touch.clientY);
        voyager.cursorWX = wx;
        voyager.cursorWY = wy;

        const hoverStar = findHitNode(touch.clientX, touch.clientY, 36);
        if (hoverStar && !voyager.draftIds.includes(hoverStar.id)) {
          voyager.draftIds.push(hoverStar.id);
          playStarLockChime(voyager.draftIds.length - 1);
          spawnStarBurst(hoverStar.x, hoverStar.y);
        }
      } else {
        cam.targetX = cam.camStartX + dx;
        cam.targetY = cam.camStartY + dy;
      }
    }
  };

  const handleTouchEnd = (e) => {
    camRef.current.pinchDist = null;
    if (!camRef.current.isDragging) return;
    const t = e.changedTouches?.[0];
    finalizeInteraction(t ? t.clientX : 0, t ? t.clientY : 0, 36);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0012;
    camRef.current.targetZoom = Math.max(
      0.45,
      Math.min(2.6, camRef.current.targetZoom + delta)
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 50,
        background: "#020307",
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          camRef.current.isDragging = false;
          camRef.current.downNode = null;
          voyagerRef.current.isDrawing = false;
          voyagerRef.current.draftIds = [];
          hoveredNodeIdRef.current = null;
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          cursor: "grab",
        }}
      />
    </div>
  );
}
