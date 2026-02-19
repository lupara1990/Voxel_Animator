
import React, { useEffect, useRef } from 'react';
import { Keyframe } from '../types';

interface TimelineProps {
  currentTime: number;
  keyframes: Keyframe[];
  isPlaying: boolean;
  onTimeChange: (time: number) => void;
  onTogglePlay: () => void;
  onAddKeyframe: () => void;
}

const FRAME_STEP = 0.01; // Equivalent to one "frame" in our 1-second normalized timeline

const Timeline: React.FC<TimelineProps> = ({ 
  currentTime, keyframes, isPlaying, onTimeChange, onTogglePlay, onAddKeyframe 
}) => {
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    let frame: number;
    const animate = () => {
      if (isPlaying) {
        const now = performance.now();
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;
        
        let newTime = currentTime + delta * 0.2; // Adjust playback speed
        if (newTime > 1) newTime = 0;
        onTimeChange(newTime);
      } else {
        lastTimeRef.current = performance.now();
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, currentTime, onTimeChange]);

  const handlePrevFrame = () => {
    onTimeChange(Math.max(0, currentTime - FRAME_STEP));
  };

  const handleNextFrame = () => {
    onTimeChange(Math.min(1, currentTime + FRAME_STEP));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-32 bg-neutral-900/90 backdrop-blur-xl border-t border-white/5 flex flex-col z-40">
      <div className="flex items-center px-8 h-12 border-b border-white/5 gap-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrevFrame}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors border border-white/5"
            title="Previous Frame"
          >
            <i className="fas fa-step-backward text-[10px]"></i>
          </button>
          
          <button 
            onClick={onTogglePlay}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
            title={isPlaying ? "Pause" : "Play"}
          >
            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-xs`}></i>
          </button>

          <button 
            onClick={handleNextFrame}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors border border-white/5"
            title="Next Frame"
          >
            <i className="fas fa-step-forward text-[10px]"></i>
          </button>
        </div>

        <div className="flex-1 relative h-6 group">
          <input 
            type="range" 
            min="0" max="1" step="0.001" 
            value={currentTime}
            onChange={(e) => onTimeChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer mt-2.5 z-10 accent-indigo-500"
          />
          {/* Keyframe Markers */}
          <div className="absolute inset-0 pointer-events-none mt-2.5">
            {keyframes.map((k, i) => (
              <div 
                key={i} 
                className="absolute w-2 h-2 bg-indigo-400 rotate-45 border border-white/20 -translate-x-1" 
                style={{ left: `${k.time * 100}%`, top: '-2px' }}
              />
            ))}
          </div>
        </div>

        <button 
          onClick={onAddKeyframe}
          className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/50 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
        >
          Add Keyframe
        </button>

        <div className="text-[10px] font-mono text-white/40 tracking-wider min-w-[100px] text-right">
          {currentTime.toFixed(3)}s / 1.000s
        </div>
      </div>

      <div className="flex-1 flex px-8 py-2 gap-px overflow-x-hidden opacity-50">
        {Array.from({ length: 100 }).map((_, i) => (
          <div 
            key={i} 
            className={`flex-1 ${i % 10 === 0 ? 'h-full bg-white/20' : i % 5 === 0 ? 'h-1/2 bg-white/10' : 'h-1/4 bg-white/5'}`} 
          />
        ))}
      </div>
    </div>
  );
};

export default Timeline;
