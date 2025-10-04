"use client";
import { useState, useEffect } from 'react';
import './UploadProgressBar.css';

const UploadProgressBar = ({ progress = 0, fileName = '', status = 'uploading' }) => {
  // Status can be: 'uploading', 'processing', 'complete', 'error'
  const [displayProgress, setDisplayProgress] = useState(0);
  
  // Animate the progress bar for smoother visual
  useEffect(() => {
    // Use requestAnimationFrame for smoother animation
    const animateProgress = () => {
      setDisplayProgress(prev => {
        // Gradually approach target progress
        const diff = progress - prev;
        if (Math.abs(diff) < 0.5) return progress;
        return prev + diff * 0.2; // Smooth easing
      });
    };
    
    const frameId = requestAnimationFrame(animateProgress);
    return () => cancelAnimationFrame(frameId);
  }, [progress]);

  // Get status label text
  const getStatusLabel = () => {
    switch (status) {
      case 'uploading': return 'Uploading...';
      case 'processing': return 'Processing...';
      case 'complete': return 'Upload complete!';
      case 'error': return 'Upload failed';
      default: return 'Uploading...';
    }
  };

  // Get status class for styling
  const getStatusClass = () => {
    switch (status) {
      case 'complete': return 'progress-complete';
      case 'error': return 'progress-error';
      case 'processing': return 'progress-processing';
      default: return '';
    }
  };

  return (
    <div className={`upload-progress-container ${getStatusClass()}`}>
      <div className="upload-progress-info">
        <span className="upload-file-name">{fileName}</span>
        <span className="upload-progress-percentage">{Math.round(displayProgress)}%</span>
      </div>
      
      <div className="upload-progress-bar-container">
        <div 
          className="upload-progress-bar" 
          style={{ width: `${displayProgress}%` }}
        ></div>
      </div>
      
      <div className="upload-progress-status">
        {getStatusLabel()}
      </div>
      
      {/* Note about upload process */}
      <div className="upload-progress-note">
        Note: If progress seems stuck at any percentage, don't worry! The upload is still working.
        You can leave this page and your song will be uploaded within 1 minute automatically.
      </div>
    </div>
  );
};

export default UploadProgressBar;