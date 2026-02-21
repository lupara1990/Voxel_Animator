import React from 'react';
import { CameraConfig } from '../types';

interface ViewSelectorProps {
  onSetView: (config: CameraConfig) => void;
}

const ViewSelector: React.FC<ViewSelectorProps> = ({ onSetView }) => {
  const views = [
    { name: 'Front', position: [0, 0, 80], target: [0, 0, 0] },
    { name: 'Back', position: [0, 0, -80], target: [0, 0, 0] },
    { name: 'Left', position: [-80, 0, 0], target: [0, 0, 0] },
    { name: 'Right', position: [80, 0, 0], target: [0, 0, 0] },
    { name: 'Top', position: [0, 80, 0], target: [0, 0, 0] },
    { name: 'Bottom', position: [0, -80, 0], target: [0, 0, 0] },
    { name: 'Iso', position: [50, 50, 50], target: [0, 0, 0] },
  ];

  return (
    <div className="absolute top-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
      <div className="bg-neutral-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-2 flex flex-col gap-1 shadow-2xl pointer-events-auto ring-1 ring-white/10">
        <div className="px-3 py-2 mb-1 border-b border-white/5 flex items-center justify-between gap-4">
          <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em]">Viewports</span>
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {views.map((view) => (
            <button
              key={view.name}
              onClick={() => onSetView({
                position: view.position as [number, number, number],
                target: view.target as [number, number, number],
                fov: 35
              })}
              className="group relative px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors"></div>
              <div className="absolute inset-0 border border-transparent group-hover:border-white/10 rounded-2xl transition-all"></div>
              <span className="relative z-10">{view.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ViewSelector;
