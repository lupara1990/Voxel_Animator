
import React from 'react';
import { AppState, RigPart, GizmoMode, InterpolationMode, Preset, RigTemplate, CameraConfig } from '../types';
import { TEMPLATE_PARTS, HDRI_PRESETS, RIG_PARTS } from '../constants';

interface SidebarProps {
  state: AppState;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onUpdateConfig: (updates: any) => void;
  onConfigInteractionStart: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectPart: (part: RigPart | null) => void;
  onUpdateTransform: (part: RigPart, type: 'position' | 'rotation', index: number, value: number) => void;
  onTransformInteractionStart: () => void;
  onSetGizmoMode: (mode: GizmoMode) => void;
  onUpdateInterpolation: (mode: InterpolationMode) => void;
  onUpdateRigTemplate: (template: RigTemplate) => void;
  onUpdateAutoKeyframe: (auto: boolean) => void;
  onUpdatePartParent: (part: RigPart, parent: RigPart | null) => void;
  onApplyPreset: (preset: Preset) => void;
  onSavePreset: () => void;
  onSaveCamera: () => void;
  onUpdateCamera: (id: string) => void;
  onDeleteCamera: (id: string) => void;
  onSwitchCamera: (config: CameraConfig) => void;
  onExport: () => void;
  isExporting: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  state, canUndo, canRedo, onUndo, onRedo, onUpdateConfig, onConfigInteractionStart,
  onFileUpload, onSelectPart, onUpdateTransform, onTransformInteractionStart,
  onSetGizmoMode, onUpdateInterpolation, onUpdateRigTemplate, onUpdateAutoKeyframe, onUpdatePartParent, onApplyPreset, onSavePreset,
  onSaveCamera, onUpdateCamera, onDeleteCamera, onSwitchCamera, onExport, isExporting 
}) => {
  const currentKeyframe = state.keyframes.reduce((pk, ck) => (ck.time <= state.currentTime) ? ck : pk, state.keyframes[0]);
  const selectedTransform = state.selectedPart ? currentKeyframe?.transforms[state.selectedPart] : null;
  const activeParts = TEMPLATE_PARTS[state.rigTemplate];

  const handleCustomHDRIUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onUpdateConfig({ environmentUrl: url, backgroundType: 'hdri' });
  };

  return (
    <aside className="w-80 bg-neutral-900/80 backdrop-blur-xl border-r border-white/5 flex flex-col z-30 shadow-2xl overflow-y-auto">
      <div className="p-6 border-b border-white/5 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">VOXAURA</h1>
          <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase mt-1 font-sans">Voxel Motion Studio</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onUndo} disabled={!canUndo} className={`p-2 rounded-lg transition-colors border border-white/5 ${canUndo ? 'bg-white/5 text-white/80 hover:bg-white/10' : 'text-white/10 cursor-not-allowed'}`} title="Undo (Ctrl+Z)"><i className="fas fa-undo text-xs"></i></button>
          <button onClick={onRedo} disabled={!canRedo} className={`p-2 rounded-lg transition-colors border border-white/5 ${canRedo ? 'bg-white/5 text-white/80 hover:bg-white/10' : 'text-white/10 cursor-not-allowed'}`} title="Redo (Ctrl+Shift+Z)"><i className="fas fa-redo text-xs"></i></button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        <section>
          <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-3">Model Import</label>
          <div className="relative group">
            <input type="file" accept=".vox" onChange={onFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl group-hover:bg-white/10 group-hover:border-indigo-500/50 transition-all duration-300">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400"><i className="fas fa-file-import"></i></div>
              <div><span className="block text-sm font-medium">Import .VOX</span><span className="block text-[10px] text-white/40">Automatic Rigging</span></div>
            </div>
          </div>
        </section>

        <section>
          <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-3">Rigging Template</label>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            {Object.values(RigTemplate).map(template => (
              <button
                key={template}
                onClick={() => onUpdateRigTemplate(template)}
                className={`flex-1 py-2 rounded-lg text-[9px] font-bold transition-all ${state.rigTemplate === template ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white/60'}`}
              >
                {template}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex justify-between items-end mb-3">
            <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Motion Rig</label>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => onUpdateAutoKeyframe(!state.autoKeyframe)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-all ${state.autoKeyframe ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'}`}
                title="Auto Keyframe"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${state.autoKeyframe ? 'bg-red-500 animate-pulse' : 'bg-current opacity-30'}`} />
                <span className="text-[9px] font-bold uppercase tracking-tighter">Auto</span>
              </button>
              <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
                <button onClick={() => onSetGizmoMode('translate')} className={`p-1.5 rounded-md transition-all ${state.gizmoMode === 'translate' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white/60'}`}><i className="fas fa-arrows-alt text-[10px]"></i></button>
                <button onClick={() => onSetGizmoMode('rotate')} className={`p-1.5 rounded-md transition-all ${state.gizmoMode === 'rotate' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white/60'}`}><i className="fas fa-sync text-[10px]"></i></button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {activeParts.map(part => (
              <button
                key={part}
                onClick={() => onSelectPart(part)}
                className={`py-2 px-3 rounded-lg text-[10px] font-medium transition-all ${state.selectedPart === part ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/5'}`}
              >
                {part.replace('_', ' ')}
              </button>
            ))}
          </div>

          {state.selectedPart && selectedTransform && (
            <div className="mt-6 space-y-4 p-4 bg-white/5 rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{state.selectedPart}</span>
                <button onClick={() => onSelectPart(null)} className="text-white/20 hover:text-white/50"><i className="fas fa-times"></i></button>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] text-white/40 uppercase block">Parent Part</label>
                <select 
                  value={state.partParents[state.selectedPart] || ''}
                  onChange={(e) => onUpdatePartParent(state.selectedPart!, e.target.value ? e.target.value as RigPart : null)}
                  className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white/60 outline-none focus:border-indigo-500/50"
                >
                  <option value="">No Parent (Root)</option>
                  {RIG_PARTS.filter(p => p !== state.selectedPart).map(p => (
                    <option key={p} value={p}>{p.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                {['position', 'rotation'].map((type) => (
                  <div key={type}>
                    <span className="text-[10px] text-white/40 uppercase block mb-2">{type}</span>
                    {['X', 'Y', 'Z'].map((axis, i) => (
                      <div key={axis} className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-bold text-white/30 w-4 font-mono">{axis}</span>
                        <input type="range" min={type === 'position' ? -20 : -Math.PI} max={type === 'position' ? 20 : Math.PI} step={0.01} onMouseDown={onTransformInteractionStart} value={selectedTransform[type as 'position' | 'rotation'][i]} onChange={(e) => onUpdateTransform(state.selectedPart!, type as any, i, parseFloat(e.target.value))} className="flex-1 accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer" />
                        <span className="text-[10px] font-mono text-white/50 w-8 text-right">{selectedTransform[type as 'position' | 'rotation'][i].toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-4">Environment Aesthetic</label>
          <div className="space-y-5 p-4 bg-white/5 rounded-xl border border-white/5">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-[10px] text-white/40 uppercase tracking-tighter">Light Intensity</span>
                <span className="text-[10px] font-mono text-indigo-400">{state.config.lightIntensity.toFixed(1)}</span>
              </div>
              <input 
                type="range" 
                min="0" max="5" step="0.1"
                onMouseDown={onConfigInteractionStart}
                value={state.config.lightIntensity}
                onChange={(e) => onUpdateConfig({ lightIntensity: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded-full appearance-none accent-indigo-500"
              />
            </div>
            
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mb-4">
              <button
                onClick={() => onUpdateConfig({ backgroundType: 'color' })}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all ${state.config.backgroundType === 'color' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                Solid Color
              </button>
              <button
                onClick={() => onUpdateConfig({ backgroundType: 'hdri' })}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all ${state.config.backgroundType === 'hdri' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                HDRI Map
              </button>
            </div>

            {state.config.backgroundType === 'color' ? (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] text-white/40 uppercase tracking-tighter">Atmosphere Color</span>
                  <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: state.config.backgroundColor }}></div>
                </div>
                <input 
                  type="color" 
                  value={state.config.backgroundColor}
                  onChange={(e) => onUpdateConfig({ backgroundColor: e.target.value })}
                  className="w-full h-8 bg-transparent cursor-pointer rounded overflow-hidden border border-white/10"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] text-white/40 uppercase block mb-2">Presets</label>
                  <div className="grid grid-cols-4 gap-1">
                    {HDRI_PRESETS.map(preset => (
                      <button
                        key={preset}
                        onClick={() => onUpdateConfig({ environmentPreset: preset, environmentUrl: undefined })}
                        className={`p-1 rounded text-[8px] font-bold uppercase transition-all ${state.config.environmentPreset === preset && !state.config.environmentUrl ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                      >
                        {preset.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-[9px] text-white/40 uppercase block mb-2">Custom Environment</label>
                  <div className="relative h-8 bg-white/5 rounded border border-white/10 flex items-center justify-center group overflow-hidden">
                    <input type="file" accept=".hdr,.exr,.jpg,.png" onChange={handleCustomHDRIUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <span className="text-[9px] text-white/40 group-hover:text-white/80 transition-colors uppercase font-bold tracking-widest"><i className="fas fa-upload mr-2"></i>Upload HDR/Image</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] text-white/40 uppercase tracking-tighter">HDRI Intensity</span>
                      <span className="text-[9px] font-mono text-indigo-400">{state.config.environmentIntensity.toFixed(1)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="3" step="0.1"
                      onMouseDown={onConfigInteractionStart}
                      value={state.config.environmentIntensity}
                      onChange={(e) => onUpdateConfig({ environmentIntensity: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none accent-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] text-white/40 uppercase tracking-tighter">HDRI Rotation</span>
                      <span className="text-[9px] font-mono text-indigo-400">{((state.config.environmentRotation * 180) / Math.PI).toFixed(0)}°</span>
                    </div>
                    <input 
                      type="range" 
                      min={0} max={Math.PI * 2} step={0.01}
                      onMouseDown={onConfigInteractionStart}
                      value={state.config.environmentRotation}
                      onChange={(e) => onUpdateConfig({ environmentRotation: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none accent-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-[10px] text-white/40 uppercase tracking-tighter">Light Color</span>
                <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: state.config.lightColor }}></div>
              </div>
              <input 
                type="color" 
                value={state.config.lightColor}
                onChange={(e) => onUpdateConfig({ lightColor: e.target.value })}
                className="w-full h-8 bg-transparent cursor-pointer rounded overflow-hidden border border-white/10"
              />
            </div>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-3">
            <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block">Camera Management</label>
            <button 
              onClick={onSaveCamera}
              className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/50 rounded text-[9px] font-bold uppercase tracking-widest transition-all"
            >
              + Capture View
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {state.savedCameras.length === 0 ? (
              <p className="text-[9px] text-white/20 italic p-4 text-center border border-dashed border-white/5 rounded-xl">No custom cameras saved.</p>
            ) : (
              state.savedCameras.map(cam => (
                <div key={cam.id} className="group flex items-center gap-1.5 p-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-all">
                  <button 
                    onClick={() => onSwitchCamera(cam.config)}
                    className="flex-1 py-1 px-2 text-[10px] font-medium text-white/60 group-hover:text-white transition-all text-left truncate flex items-center gap-2"
                  >
                    <i className="fas fa-camera text-[8px] opacity-40"></i>
                    {cam.name}
                  </button>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => onUpdateCamera(cam.id)}
                      className="p-1.5 text-white/20 hover:text-indigo-400 transition-colors"
                      title="Update to current view"
                    >
                      <i className="fas fa-sync-alt text-[8px]"></i>
                    </button>
                    <button 
                      onClick={() => onDeleteCamera(cam.id)}
                      className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
                      title="Delete view"
                    >
                      <i className="fas fa-trash-alt text-[8px]"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-3">Interpolation Mode</label>
          <div className="flex gap-2">
            {[InterpolationMode.LINEAR, InterpolationMode.STEP, InterpolationMode.BEZIER].map(mode => (
              <button key={mode} onClick={() => onUpdateInterpolation(mode)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all border ${currentKeyframe?.interpolation === mode ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-transparent text-white/30 border-white/5 hover:border-white/10'}`}>{mode}</button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-3">
            <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block">Scene Presets</label>
            <button onClick={onSavePreset} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider transition-colors">+ Save New</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {state.presets.map(preset => (
              <button key={preset.id} onClick={() => onApplyPreset(preset)} className="py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] font-medium text-white/60 hover:text-white transition-all text-left truncate">{preset.name}</button>
            ))}
          </div>
        </section>

        <button onClick={onExport} disabled={isExporting || state.voxels.length === 0} className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 ${isExporting ? 'bg-neutral-800 cursor-not-allowed text-white/40' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 font-bold tracking-widest uppercase text-xs active:scale-95'}`}>
          {isExporting ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /><span>Generating Veo...</span></> : <><i className="fas fa-video"></i><span>Render Cinematic Video</span></>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
