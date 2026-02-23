
import React, { useEffect, useRef, useState } from 'react';
import { Keyframe, PlaybackMode } from '../types';

interface TimelineProps {
  currentTime: number;
  keyframes: Keyframe[];
  isPlaying: boolean;
  playbackMode: PlaybackMode;
  playbackDirection: 1 | -1;
  onTimeChange: (time: number) => void;
  onTogglePlay: () => void;
  onAddKeyframe: () => void;
  onMoveKeyframe: (index: number, newTime: number) => void;
  onUpdatePlaybackMode: (mode: PlaybackMode) => void;
  onUpdatePlaybackDirection: (dir: 1 | -1) => void;
}

const FRAME_STEP = 0.01;

const Timeline: React.FC<TimelineProps> = ({ 
  currentTime, keyframes, isPlaying, playbackMode, playbackDirection,
  onTimeChange, onTogglePlay, onAddKeyframe, onMoveKeyframe,
  onUpdatePlaybackMode, onUpdatePlaybackDirection
}) => {
  const lastTimeRef = useRef<number>(performance.now());
  const trackRef = useRef<HTMLDivElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  useEffect(() => {
    let frame: number;
    const animate = () => {
      if (isPlaying) {
        const now = performance.now();
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;
        
        let newTime = currentTime + (delta * 0.2 * playbackDirection);
        
        if (playbackMode === PlaybackMode.LOOP) {
          if (newTime > 1) newTime = 0;
          if (newTime < 0) newTime = 1;
        } else if (playbackMode === PlaybackMode.PING_PONG) {
          if (newTime > 1) {
            newTime = 1;
            onUpdatePlaybackDirection(-1);
          } else if (newTime < 0) {
            newTime = 0;
            onUpdatePlaybackDirection(1);
          }
        } else { // ONCE
          if (newTime > 1) {
            newTime = 1;
            onTogglePlay();
          } else if (newTime < 0) {
            newTime = 0;
            onTogglePlay();
          }
        }
        
        onTimeChange(newTime);
      } else {
        lastTimeRef.current = performance.now();
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, currentTime, playbackMode, playbackDirection, onTimeChange, onTogglePlay, onUpdatePlaybackDirection]);

  const handleMouseMove = (e: MouseEvent) => {
    if (draggingIdx === null || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = Math.max(0, Math.min(1, x / rect.width));
    onMoveKeyframe(draggingIdx, t);
  };

  const handleMouseUp = () => {
    setDraggingIdx(null);
  };

  useEffect(() => {
    if (draggingIdx !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingIdx]);

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

          <div className="h-8 w-px bg-white/10 mx-2"></div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            {[
              { mode: PlaybackMode.ONCE, icon: 'fa-arrow-right', label: 'Once' },
              { mode: PlaybackMode.LOOP, icon: 'fa-redo', label: 'Loop' },
              { mode: PlaybackMode.PING_PONG, icon: 'fa-exchange-alt', label: 'Ping Pong' },
            ].map((m) => (
              <button
                key={m.mode}
                onClick={() => onUpdatePlaybackMode(m.mode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${playbackMode === m.mode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white/60'}`}
                title={m.label}
              >
                <i className={`fas ${m.icon} text-[10px]`}></i>
                <span className="hidden xl:inline">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 relative h-6 group" ref={trackRef}>
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
                className={`absolute w-3 h-3 rotate-45 border border-white/40 -translate-x-1.5 cursor-grab pointer-events-auto active:cursor-grabbing transition-transform hover:scale-125 z-20 ${draggingIdx === i ? 'bg-indigo-300 scale-125' : 'bg-indigo-500'}`} 
                style={{ left: `${k.time * 100}%`, top: '-4px' }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggingIdx(i);
                  onTimeChange(k.time);
                }}
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
