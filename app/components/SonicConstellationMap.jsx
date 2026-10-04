"use client";
import { useEffect, useRef, useMemo } from "react";
import { usePlayer } from "../context/PlayerContext";

export default function SonicConstellationMap({ songs: propSongs }) {
  const {
    playSong,
    playlist,
    currentIndex,
    isPlaying,
    setIsPlaying,
    subscribeAudio,
  } = usePlayer();

  const canvasRef = useRef(null);
  const fetchedSongsRef = useRef([]);
  const hoveredNodeIdRef = useRef(null);

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
    mouseX: 0,
    mouseY: 0,
  });

  const currentSong = currentIndex >= 0 ? playlist[currentIndex] : null;
  const activeSongs = propSongs && propSongs.length > 0 ? propSongs : playlist;

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

      // 6. Constellation Filaments & Traveling Photon Pulses
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
            ? 0.42
            : 0.16
          : 0.05;

        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.strokeStyle = `rgba(${edge.rgb}, ${baseAlpha})`;
        ctx.lineWidth = (edge.primary ? 1.15 : 0.75) / Math.sqrt(cam.zoom);
        ctx.stroke();

        // Subtle luminous photon traveling along primary constellation lines
        if (edge.primary) {
          const prog = (t * 0.16 + edge.pulseOffset) % 1;
          const px = n1.x + (n2.x - n1.x) * prog;
          const py = n1.y + (n2.y - n1.y) * prog;
          const pAlpha = Math.sin(prog * Math.PI) * 0.55;

          ctx.fillStyle = `rgba(${edge.rgb}, ${pAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 7. Drifting Foreground Cosmic Dust Motes
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

      // 8. Song Stars, 4-Point Celestial Flares & Floating Astronomical Labels
      nodes.forEach((node) => {
        const isCurrent = currentSong?._id === node.id;
        const isHovered = hoveredNodeIdRef.current === node.id;
        const breathe = 0.88 + 0.24 * Math.sin(t * 1.4 + node.phase);
        const musicLift = isCurrent && isPlaying ? audio.bass * 2.5 : 0;
        const r = node.radius * breathe + (isCurrent ? 1.6 + musicLift : isHovered ? 1.2 : 0);

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

        // Soft Radial Star Halo
        const haloR = r * (isCurrent || isHovered ? 6.5 : 4.2);
        const halo = ctx.createRadialGradient(
          node.x,
          node.y,
          r * 0.2,
          node.x,
          node.y,
          haloR
        );
        halo.addColorStop(0, `rgba(${node.theme.rgb}, ${isCurrent || isHovered ? 0.75 : 0.42})`);
        halo.addColorStop(0.45, `rgba(${node.theme.rgb}, ${isCurrent || isHovered ? 0.22 : 0.1})`);
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
        const labelAlpha = isCurrent || isHovered ? 0.96 : 0.58;
        ctx.textAlign = "left";
        ctx.fillStyle = isCurrent
          ? "#FF7A33"
          : `rgba(245, 247, 255, ${labelAlpha})`;
        ctx.font = `${isCurrent || isHovered ? "600" : "400"} 11.5px 'Space Grotesk', sans-serif`;

        const titleText =
          node.song.title.length > 22 && !isCurrent && !isHovered
            ? node.song.title.slice(0, 20) + "…"
            : node.song.title;
        ctx.fillText(titleText, node.x + r + 8, node.y + 3);

        if (isCurrent || isHovered) {
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
    });

    return () => {
      unsubscribe();
      window.removeEventListener("resize", resize);
    };
  }, [nodes, edges, currentSong?._id, isPlaying, subscribeAudio]);

  /* ── Smooth Pan, Pinch-to-Zoom, Wheel Zoom & Star Selection ── */
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

  const handleMouseDown = (e) => {
    camRef.current.isDragging = true;
    camRef.current.dragStartX = e.clientX;
    camRef.current.dragStartY = e.clientY;
    camRef.current.camStartX = camRef.current.targetX;
    camRef.current.camStartY = camRef.current.targetY;
    camRef.current.movedDistance = 0;
  };

  const handleMouseMove = (e) => {
    if (camRef.current.isDragging) {
      const dx = e.clientX - camRef.current.dragStartX;
      const dy = e.clientY - camRef.current.dragStartY;
      camRef.current.movedDistance = Math.hypot(dx, dy);
      camRef.current.targetX = camRef.current.camStartX + dx;
      camRef.current.targetY = camRef.current.camStartY + dy;
    } else {
      const hit = findHitNode(e.clientX, e.clientY, 22);
      hoveredNodeIdRef.current = hit ? hit.id : null;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hit ? "pointer" : "grab";
      }
    }
  };

  const handleMouseUp = (e) => {
    if (!camRef.current.isDragging) return;
    camRef.current.isDragging = false;

    if (camRef.current.movedDistance < 8) {
      const hit = findHitNode(e.clientX, e.clientY, 28);
      if (hit) {
        // Glide camera smoothly to center on the chosen star
        camRef.current.targetX = -hit.baseX * camRef.current.targetZoom;
        camRef.current.targetY = -hit.baseY * camRef.current.targetZoom;
        if (currentSong?._id === hit.id) {
          setIsPlaying(!isPlaying);
        } else {
          playSong(activeSongs, hit.songIndex);
        }
      }
    }
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      camRef.current.pinchDist = d;
      camRef.current.isDragging = false;
      return;
    }
    if (e.touches.length === 1) {
      camRef.current.isDragging = true;
      camRef.current.dragStartX = e.touches[0].clientX;
      camRef.current.dragStartY = e.touches[0].clientY;
      camRef.current.camStartX = camRef.current.targetX;
      camRef.current.camStartY = camRef.current.targetY;
      camRef.current.movedDistance = 0;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && camRef.current.pinchDist) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleDelta = (d - camRef.current.pinchDist) * 0.004;
      camRef.current.targetZoom = Math.max(
        0.45,
        Math.min(2.6, camRef.current.targetZoom + scaleDelta)
      );
      camRef.current.pinchDist = d;
      return;
    }
    if (e.touches.length === 1 && camRef.current.isDragging) {
      const dx = e.touches[0].clientX - camRef.current.dragStartX;
      const dy = e.touches[0].clientY - camRef.current.dragStartY;
      camRef.current.movedDistance = Math.hypot(dx, dy);
      camRef.current.targetX = camRef.current.camStartX + dx;
      camRef.current.targetY = camRef.current.camStartY + dy;
    }
  };

  const handleTouchEnd = (e) => {
    camRef.current.pinchDist = null;
    if (!camRef.current.isDragging) return;
    camRef.current.isDragging = false;

    if (camRef.current.movedDistance < 12 && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const hit = findHitNode(t.clientX, t.clientY, 34);
      if (hit) {
        camRef.current.targetX = -hit.baseX * camRef.current.targetZoom;
        camRef.current.targetY = -hit.baseY * camRef.current.targetZoom;
        if (currentSong?._id === hit.id) {
          setIsPlaying(!isPlaying);
        } else {
          playSong(activeSongs, hit.songIndex);
        }
      }
    }
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
