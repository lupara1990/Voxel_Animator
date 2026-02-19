
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
  onShowGuide: () => void;
  onLocalRecord: () => void;
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
  onShowGuide,
  onLocalRecord,
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
      <span className="text-[8px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 absolute -top-8 bg-neutral-900 px-2 py-1 rounded border border-white/10 pointer-events-none transition-opacity whitespace-nowrap">
        {label}
      </span>
    </button>
  );

  return (
    <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 bg-neutral-900/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl pointer-events-auto transition-all duration-500 hover:bg-neutral-900/80 hover:border-white/20">
      
      {/* File Group */}
      <div className="flex items-center gap-1 pr-2 mr-1 border-r border-white/10">
        <ToolButton 
          icon="fa-file-import" 
          label="Import .VOX" 
          onClick={() => fileInputRef.current?.click()} 
        />
        <input ref={fileInputRef} type="file" accept=".vox" onChange={onFileUpload} className="hidden" />
        
        <div className="flex flex-col gap-1">
          <button onClick={onSaveProject} className="w-8 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"><i className="fas fa-save text-[10px]"></i></button>
          <button onClick={() => loadInputRef.current?.click()} className="w-8 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"><i className="fas fa-folder-open text-[10px]"></i></button>
          <input ref={loadInputRef} type="file" accept=".json" onChange={onLoadProject} className="hidden" />
        </div>
      </div>

      {/* Edit Group */}
      <div className="flex items-center gap-1 pr-2 mr-1 border-r border-white/10">
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

      {/* Panels Group */}
      <div className="flex items-center gap-1 pr-2 mr-1 border-r border-white/10">
        <ToolButton 
          icon="fa-cubes" 
          label="Rigging" 
          onClick={() => onTogglePanel('rig')} 
          active={activePanel === 'rig'}
        />
        <ToolButton 
          icon="fa-running" 
          label="Animation" 
          onClick={() => onTogglePanel('anim')} 
          active={activePanel === 'anim'}
        />
        <ToolButton 
          icon="fa-layer-group" 
          label="Layers" 
          onClick={() => onTogglePanel('layers')} 
          active={activePanel === 'layers'}
        />
        <ToolButton 
          icon="fa-palette" 
          label="Scene" 
          onClick={() => onTogglePanel('scene')} 
          active={activePanel === 'scene'}
        />
      </div>

      {/* View/Render Group */}
      <div className="flex items-center gap-1 pr-2 mr-1 border-r border-white/10">
        <ToolButton 
          icon="fa-border-all" 
          label="Grid" 
          onClick={onToggleGrid} 
          active={gridVisible}
        />
        <ToolButton 
          icon="fa-camera" 
          label="Snapshot" 
          onClick={onTakeSnapshot} 
        />
        <ToolButton 
          icon="fa-film" 
          label="Render" 
          onClick={onLocalRecord} 
          active={false}
          danger={false}
        />
      </div>

      {/* Help Group */}
      <div className="pl-1">
        <ToolButton 
          icon="fa-question-circle" 
          label="Help Guide" 
          onClick={onShowGuide} 
        />
      </div>
    </div>
  );
};

export default Toolbar;
