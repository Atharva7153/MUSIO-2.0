"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SplashScreen({ children, minDuration = 1100 }) {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem("musio-splash-seen");
    if (alreadySeen) {
      setShowSplash(false);
      return;
    }
    setShowSplash(true);
    const timer = setTimeout(() => {
      sessionStorage.setItem("musio-splash-seen", "1");
      setShowSplash(false);
    }, minDuration);
    return () => clearTimeout(timer);
  }, [minDuration]);

  return (
    <>
      {children}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="musio-splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => {
              sessionStorage.setItem("musio-splash-seen", "1");
              setShowSplash(false);
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "var(--bg-base)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
              cursor: "pointer",
            }}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="rainbow-bar"
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                boxShadow: "var(--glow-accent)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </motion.div>

            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.35 }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "2.2rem",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "baseline",
                gap: 6,
              }}
            >
              MUSIO <span className="gradient-text" style={{ fontSize: "1.1rem" }}>2.0</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
