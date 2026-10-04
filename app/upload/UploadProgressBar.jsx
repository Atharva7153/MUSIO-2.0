"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function UploadProgressBar({
  progress = 0,
  fileName = "",
  status = "uploading",
}) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setDisplayProgress((prev) => {
        const diff = progress - prev;
        if (Math.abs(diff) < 0.5) return progress;
        return prev + diff * 0.25;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [progress]);

  const statusLabels = {
    uploading: "Uploading audio stream...",
    processing: "Processing & optimizing track...",
    complete: "Upload complete!",
    error: "Upload encountered an error",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card"
      style={{
        padding: 18,
        background: "var(--bg-subtle)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.86rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {fileName || "Uploading..."}
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.86rem",
            fontWeight: 700,
            color: status === "error" ? "#EF4444" : "var(--accent-primary)",
          }}
        >
          {Math.round(displayProgress)}%
        </span>
      </div>

      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: "var(--border-subtle)",
          overflow: "hidden",
        }}
      >
        <div
          className="rainbow-bar"
          style={{
            height: "100%",
            width: `${displayProgress}%`,
            borderRadius: 999,
            transition: "width 0.25s ease",
          }}
        />
      </div>

      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
        {statusLabels[status] || "Uploading..."}
      </div>
    </motion.div>
  );
}