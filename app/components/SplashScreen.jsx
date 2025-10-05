"use client";
import { useEffect, useState } from "react";
import "./SplashScreen.css";

export default function SplashScreen({ children, waitFor = false, minDuration = 3000 }) {
  const [visible, setVisible] = useState(true);
  const [canHide, setCanHide] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Control animation phases
  useEffect(() => {
    const phases = [
      setTimeout(() => setAnimationPhase(1), 300),  // Logo appears
      setTimeout(() => setAnimationPhase(2), 800),  // Particles appear
      setTimeout(() => setAnimationPhase(3), 1400), // Waves animate
      setTimeout(() => setAnimationPhase(4), 2000), // Full animation
      setTimeout(() => setCanHide(true), minDuration)
    ];
    
    return () => phases.forEach(t => clearTimeout(t));
  }, [minDuration]);

  // Handle exit animation
  useEffect(() => {
    if (canHide && !waitFor) {
      const out = setTimeout(() => setVisible(false), 700);
      return () => clearTimeout(out);
    }
  }, [canHide, waitFor]);

  if (!visible) return <div className="fade-in">{children}</div>;

  return (
    <div 
      className={`splash-root phase-${animationPhase} ${canHide && !waitFor ? "splash-exit" : ""}`} 
      role="img" 
      aria-label="Launching Musio 3.0"
    >
      {/* Background layers */}
      <div className="splash-bg-animation">
        <div className="splash-gradient-1"></div>
        <div className="splash-gradient-2"></div>
        <div className="splash-gradient-3"></div>
      </div>
      
      {/* Animated particles */}
      <div className="particles-container">
        {[...Array(20)].map((_, i) => (
          <div key={i} className={`particle p${i+1}`}></div>
        ))}
      </div>
      
      {/* Music note animations */}
      <div className="music-notes">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`note n${i+1}`}>
            {i % 2 === 0 ? '♪' : '♫'}
          </div>
        ))}
      </div>
      
      {/* Main content */}
      <div className="splash-inner">
        {/* Audio wave circles */}
        <div className="audio-rings" aria-hidden="true">
          <div className="ring r1"></div>
          <div className="ring r2"></div>
          <div className="ring r3"></div>
        </div>
        
        {/* Logo */}
        <div className="logo-wrap" aria-hidden="true">
          <div className="logo-burst"></div>
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <div className="logo-text">
            MUSIO <span className="version-number">2.0</span>
          </div>
        </div>
        
        {/* Equalizer */}
        <div className="eq" aria-hidden="true">
          {[...Array(16)].map((_, i) => (
            <span key={i} className={`bar b${i+1}`} />
          ))}
        </div>
        
        {/* Loading text */}
        <div className="loading-text">
          <span>L</span>
          <span>o</span>
          <span>a</span>
          <span>d</span>
          <span>i</span>
          <span>n</span>
          <span>g</span>
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </div>
      </div>
    </div>
  );
}
