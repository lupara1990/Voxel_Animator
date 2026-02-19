
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
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-1.5 bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl pointer-events-auto">
      {/* Undo/Redo Group */}
      <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-1">
        <button 
          onClick={onUndo} 
          disabled={!canUndo}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${canUndo ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-white/10 cursor-not-allowed'}`}
          title="Undo (Ctrl+Z)"
        >
          <i className="fas fa-undo text-sm"></i>
        </button>
        <button 
          onClick={onRedo} 
          disabled={!canRedo}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${canRedo ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-white/10 cursor-not-allowed'}`}
          title="Redo (Ctrl+Shift+Z)"
        >
          <i className="fas fa-redo text-sm"></i>
        </button>
      </div>

      {/* Tools Group */}
      <div className="flex items-center gap-1">
        <button 
          onClick={onToggleGrid}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${gridVisible ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
          title="Toggle Grid"
        >
          <i className="fas fa-th text-sm"></i>
        </button>
        <button 
          onClick={onTakeSnapshot}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all"
          title="Take Snapshot"
        >
          <i className="fas fa-camera text-sm"></i>
        </button>
      </div>

      {/* UI Visibility Toggle (Maximize/Minimize) */}
      <div className="pl-2 ml-1 border-l border-white/10">
        <button 
          onClick={onToggleUI}
          className={`px-4 h-9 flex items-center gap-2 rounded-xl transition-all font-bold text-[10px] tracking-widest uppercase ${!uiVisible ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
          title={uiVisible ? "Maximize Viewport" : "Restore UI"}
        >
          <i className={`fas ${uiVisible ? 'fa-expand' : 'fa-compress'}`}></i>
          <span>{uiVisible ? 'Maximize' : 'Minimize'}</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
