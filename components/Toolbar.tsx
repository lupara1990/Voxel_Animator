
import React, { useRef } from 'react';

interface ToolbarProps {
  activePanel: 'anim' | 'rig' | 'layers' | 'scene' | null;
  onTogglePanel: (panel: 'anim' | 'rig' | 'layers' | 'scene') => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTakeSnapshot: () => void;
  gridVisible: boolean;
  onToggleGrid: () => void;
  skeletonVisible: boolean;
  onToggleSkeleton: () => void;
  onShowGuide: () => void;
  onOpenExport: () => void;
  onSaveProject: () => void;
  onLoadProject: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  activePanel,
  onTogglePanel,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onTakeSnapshot,
  gridVisible,
  onToggleGrid,
  skeletonVisible,
  onToggleSkeleton,
  onShowGuide,
  onOpenExport,
  onSaveProject,
  onLoadProject,
  onFileUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadInputRef = useRef<HTMLInputElement>(null);

  const ToolButton = ({ 
    icon, 
    label, 
    onClick, 
    active = false, 
    disabled = false, 
    danger = false 
  }: { 
    icon: string, 
    label: string, 
    onClick: () => void, 
    active?: boolean, 
    disabled?: boolean,
    danger?: boolean
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center gap-1.5 w-14 h-14 rounded-2xl transition-all duration-300 group relative
        ${active ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'text-white/40 hover:bg-white/10 hover:text-white'}
        ${disabled ? 'opacity-20 cursor-not-allowed' : 'active:scale-90'}
        ${danger ? 'hover:bg-red-500/20 hover:text-red-400' : ''}
      `}
    >
      <i className={`fas ${icon} text-lg transition-transform group-hover:scale-110`}></i>
      <span className="text-[8px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 absolute top-full mt-3 bg-neutral-900 px-2 py-1 rounded border border-white/10 pointer-events-none transition-opacity whitespace-nowrap">
        {label}
      </span>
    </button>
  );

  return (
    <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-16 bg-neutral-900/80 backdrop-blur-3xl border-b border-white/10 shadow-2xl pointer-events-auto">
      
      {/* Left: Brand & File */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <i className="fas fa-cube text-white text-sm"></i>
          </div>
          <span className="text-sm font-black tracking-tighter uppercase hidden sm:block">VoxAura</span>
        </div>

        <div className="h-6 w-px bg-white/10 mx-2"></div>

        <div className="flex items-center gap-1">
          <ToolButton 
            icon="fa-file-import" 
            label="Import .VOX" 
            onClick={() => fileInputRef.current?.click()} 
          />
          <input ref={fileInputRef} type="file" accept=".vox" onChange={onFileUpload} className="hidden" />
          
          <ToolButton 
            icon="fa-save" 
            label="Save Project" 
            onClick={onSaveProject} 
          />
          <ToolButton 
            icon="fa-folder-open" 
            label="Load Project" 
            onClick={() => loadInputRef.current?.click()} 
          />
          <input ref={loadInputRef} type="file" accept=".json" onChange={onLoadProject} className="hidden" />
        </div>
      </div>

      {/* Center: Panels */}
      <div className="flex items-center gap-1 bg-black/20 p-1 rounded-2xl border border-white/5">
        <button 
          onClick={() => onTogglePanel('rig')}
          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activePanel === 'rig' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          Rigging
        </button>
        <button 
          onClick={() => onTogglePanel('anim')}
          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activePanel === 'anim' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          Animation
        </button>
        <button 
          onClick={() => onTogglePanel('layers')}
          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activePanel === 'layers' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          Layers
        </button>
        <button 
          onClick={() => onTogglePanel('scene')}
          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activePanel === 'scene' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          Scene
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 pr-3 border-r border-white/10">
          <ToolButton 
            icon="fa-undo-alt" 
            label="Undo" 
            onClick={onUndo} 
            disabled={!canUndo} 
          />
          <ToolButton 
            icon="fa-redo-alt" 
            label="Redo" 
            onClick={onRedo} 
            disabled={!canRedo} 
          />
        </div>

        <div className="flex items-center gap-1">
          <ToolButton 
            icon="fa-border-all" 
            label="Grid" 
            onClick={onToggleGrid} 
            active={gridVisible}
          />
          <ToolButton 
            icon="fa-bone" 
            label="Skeleton" 
            onClick={onToggleSkeleton} 
            active={skeletonVisible}
          />
          <ToolButton 
            icon="fa-camera" 
            label="Snapshot" 
            onClick={onTakeSnapshot} 
          />
          <button 
            onClick={onOpenExport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 ml-2"
          >
            <i className="fas fa-video text-xs"></i>
            <span className="text-[10px] font-bold uppercase tracking-widest">Export Video</span>
          </button>
        </div>

        <div className="h-6 w-px bg-white/10 mx-2"></div>

        <ToolButton 
          icon="fa-question-circle" 
          label="Help" 
          onClick={onShowGuide} 
        />
      </div>
    </div>
  );
};

export default Toolbar;
