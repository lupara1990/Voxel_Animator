
import React from 'react';

interface ToolbarProps {
  uiVisible: boolean;
  onToggleUI: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTakeSnapshot: () => void;
  gridVisible: boolean;
  onToggleGrid: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  uiVisible,
  onToggleUI,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onTakeSnapshot,
  gridVisible,
  onToggleGrid
}) => {
  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 bg-neutral-900/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl pointer-events-auto transition-all duration-500 hover:bg-neutral-900/60 hover:border-white/20">
      {/* Undo/Redo Group */}
      <div className="flex items-center gap-1 border-r border-white/5 pr-2 mr-1">
        <button 
          onClick={onUndo} 
          disabled={!canUndo}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${canUndo ? 'text-white/70 hover:bg-white/10 hover:text-white active:scale-90' : 'text-white/10 cursor-not-allowed'}`}
          title="Undo (Ctrl+Z)"
        >
          <i className="fas fa-undo-alt text-sm"></i>
        </button>
        <button 
          onClick={onRedo} 
          disabled={!canRedo}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${canRedo ? 'text-white/70 hover:bg-white/10 hover:text-white active:scale-90' : 'text-white/10 cursor-not-allowed'}`}
          title="Redo (Ctrl+Shift+Z)"
        >
          <i className="fas fa-redo-alt text-sm"></i>
        </button>
      </div>

      {/* Tools Group */}
      <div className="flex items-center gap-1 border-r border-white/5 pr-2 mr-1">
        <button 
          onClick={onToggleGrid}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${gridVisible ? 'text-indigo-400 bg-indigo-500/20 border border-indigo-500/30' : 'text-white/40 hover:bg-white/10 hover:text-white border border-transparent'}`}
          title="Toggle Grid (G)"
        >
          <i className="fas fa-border-all text-sm"></i>
        </button>
        <button 
          onClick={onTakeSnapshot}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-90"
          title="Take Cinematic Snapshot (S)"
        >
          <i className="fas fa-camera-retro text-sm"></i>
        </button>
      </div>

      {/* UI Visibility Toggle */}
      <div className="pl-1">
        <button 
          onClick={onToggleUI}
          className={`group flex items-center gap-2 px-4 h-10 rounded-xl transition-all font-bold text-[10px] tracking-[0.15em] uppercase ${!uiVisible ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 hover:bg-indigo-500' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}
          title={uiVisible ? "Focus Mode (Tab)" : "Show Interface (Tab)"}
        >
          <i className={`fas ${uiVisible ? 'fa-expand-alt' : 'fa-compress-alt'} transition-transform group-hover:scale-110`}></i>
          <span className="hidden sm:inline">{uiVisible ? 'Focus' : 'Interface'}</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
