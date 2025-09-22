"use client";
import { useEffect, useState } from "react";
import "./SplashScreen.css";

export default function SplashScreen({ children, waitFor = false, minDuration = 2000 }) {
  const [visible, setVisible] = useState(true);
  const [canHide, setCanHide] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCanHide(true), minDuration);
    return () => clearTimeout(t);
  }, [minDuration]);

  useEffect(() => {
    if (canHide && !waitFor) {
      const out = setTimeout(() => setVisible(false), 420);
      return () => clearTimeout(out);
    }
  }, [canHide, waitFor]);

  if (!visible) return <div className="fade-in">{children}</div>;

  return (
    <div className={`splash-root ${canHide && !waitFor ? "splash-exit" : ""}`} role="img" aria-label="Launching Musio 2.0">
      <div className="splash-bg-animation" />
      <div className="splash-inner">
        <div className="logo-wrap" aria-hidden="true">
          <div className="logo-burst" />
          <div className="logo-text">
            MUSIO 2.0
          </div>
        </div>
        
        <div className="eq" aria-hidden="true">
          <span className="bar b1" />
          <span className="bar b2" />
          <span className="bar b3" />
          <span className="bar b4" />
          <span className="bar b5" />
        </div>
      </div>
    </div>
  );
}
