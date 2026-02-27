
import React, { useState, useRef, useEffect } from 'react';
import { AppState, RigPart, GizmoMode, InterpolationMode, Preset, RigTemplate, CameraConfig, AnimationPreset, LightType, LightConfig } from '../types';
import { TEMPLATE_PARTS, HDRI_PRESETS, RIG_PARTS, ANIMATION_PRESETS } from '../constants';

interface SidebarProps {
  state: AppState;
  activePanel: 'anim' | 'rig' | 'layers' | 'scene' | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onUpdateConfig: (updates: any) => void;
  onUpdateModelTransform: (updates: any) => void;
  onConfigInteractionStart: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileMerge: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectPart: (part: RigPart | null) => void;
  onUpdateTransform: (part: RigPart, type: 'position' | 'rotation', index: number, value: number) => void;
  onUpdateRestTransform: (part: RigPart, type: 'position' | 'rotation', index: number, value: number) => void;
  onTransformInteractionStart: () => void;
  onSetGizmoMode: (mode: GizmoMode) => void;
  onUpdateInterpolation: (mode: InterpolationMode) => void;
  onUpdateRigTemplate: (template: RigTemplate) => void;
  onUpdateAutoKeyframe: (auto: boolean) => void;
  onUpdatePartParent: (part: RigPart, parent: RigPart | null) => void;
  onSetCurrentAsRest: () => void;
  onResetRestPose: () => void;
  onAutoRig: () => void;
  onAddBone: (part: RigPart) => void;
  onRemoveBone: (part: RigPart) => void;
  onApplyAnimationPreset: (preset: AnimationPreset) => void;
  onApplyPreset: (preset: Preset) => void;
  onSavePreset: () => void;
  onSaveCamera: () => void;
  onUpdateCamera: (id: string) => void;
  onDeleteCamera: (id: string) => void;
  onSwitchCamera: (config: CameraConfig) => void;
  onSaveProject: () => void;
  onLoadProject: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTogglePartVisibility: (part: RigPart) => void;
  onTogglePartLock: (part: RigPart) => void;
  onOpenRigEditor: () => void;
  onSaveRigTemplate: (name: string) => void;
  onLoadRigTemplate: (id: string) => void;
  onDeleteRigTemplate: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  state, activePanel, canUndo, canRedo, onUndo, onRedo, onUpdateConfig, onUpdateModelTransform, onConfigInteractionStart,
  onFileUpload, onFileMerge, onSelectPart, onUpdateTransform, onUpdateRestTransform, onTransformInteractionStart,
  onSetGizmoMode, onUpdateInterpolation, onUpdateRigTemplate, onUpdateAutoKeyframe, onUpdatePartParent,
  onSetCurrentAsRest, onResetRestPose, onAutoRig,
  onAddBone, onRemoveBone, onApplyAnimationPreset, onApplyPreset, onSavePreset,
  onSaveCamera, onUpdateCamera, onDeleteCamera, onSwitchCamera, onSaveProject, onLoadProject,
  onTogglePartVisibility, onTogglePartLock, onOpenRigEditor,
  onSaveRigTemplate, onLoadRigTemplate, onDeleteRigTemplate
}) => {
  const [showAddBoneDropdown, setShowAddBoneDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAddBoneDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activePanel) return null;

  const currentKeyframe = state.keyframes.reduce((pk, ck) => (ck.time <= state.currentTime) ? ck : pk, state.keyframes[0]);
  const selectedTransform = state.selectedPart ? currentKeyframe?.transforms[state.selectedPart] : null;
  const selectedRest = state.selectedPart ? state.restTransforms[state.selectedPart] : null;

  const unusedParts = RIG_PARTS.filter(p => !state.activeParts.includes(p));

  return (
    <aside className="w-80 bg-neutral-900/80 backdrop-blur-3xl border-r border-white/10 flex flex-col z-40 shadow-[20px_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in slide-in-from-left duration-300">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
        <div>
          <h1 className="text-sm font-black tracking-[0.3em] uppercase bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            {activePanel} PANEL
          </h1>
        </div>
        <div className="flex gap-1">
          <button onClick={onUndo} disabled={!canUndo} className="p-2 text-white/20 hover:text-white disabled:opacity-0 transition-all"><i className="fas fa-undo-alt text-[10px]"></i></button>
          <button onClick={onRedo} disabled={!canRedo} className="p-2 text-white/20 hover:text-white disabled:opacity-0 transition-all"><i className="fas fa-redo-alt text-[10px]"></i></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {activePanel === 'rig' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
            {/* 1. Quick Rigging */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Quick Rigging</label>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <span className="text-[9px] text-white/20 uppercase tracking-widest block">1. Select Base Template</span>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(TEMPLATE_PARTS).map(t => (
                      <button
                        key={t}
                        onClick={() => onUpdateRigTemplate(t as RigTemplate)}
                        className={`px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${state.rigTemplate === t ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[9px] text-white/20 uppercase tracking-widest block">2. Process Voxels</span>
                  <button 
                    onClick={onAutoRig}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group"
                  >
                    <i className="fas fa-magic group-hover:rotate-12 transition-transform"></i>
                    Auto-Rig Model
                  </button>
                  <p className="text-[9px] text-white/30 text-center italic">Automatically assigns voxels to the nearest bone</p>
                </div>
              </div>
            </section>

            {/* 2. Bone Hierarchy Tree */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                  <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Bone Hierarchy</label>
                </div>
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setShowAddBoneDropdown(!showAddBoneDropdown)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-indigo-400 transition-all"
                    title="Add Bone"
                  >
                    <i className="fas fa-plus text-[10px]"></i>
                  </button>

                  {showAddBoneDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl z-[100] py-2 max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="px-3 py-1 border-b border-white/5 mb-1">
                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Available Bones</span>
                      </div>
                      {unusedParts.length === 0 ? (
                        <div className="px-4 py-2 text-[10px] text-white/40 italic">All bones active</div>
                      ) : (
                        unusedParts.map(p => (
                          <button
                            key={p}
                            onClick={() => {
                              onAddBone(p);
                              setShowAddBoneDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-[10px] hover:bg-indigo-600 hover:text-white transition-colors flex items-center gap-2"
                          >
                            <i className="fas fa-bone opacity-40"></i>
                            {p}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {(() => {
                  const rendered = new Set<RigPart>();
                  const renderTree = (part: RigPart, depth: number = 0): React.ReactNode => {
                    if (rendered.has(part)) return null;
                    rendered.add(part);
                    const children = state.activeParts.filter(p => state.partParents[p] === part);
                    return (
                      <React.Fragment key={part}>
                        <div 
                          className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${state.selectedPart === part ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                          style={{ marginLeft: `${depth * 12}px` }}
                          onClick={() => onSelectPart(part)}
                        >
                          <div className="flex-1 truncate text-[10px] font-bold tracking-wider flex items-center gap-2">
                             <i className={`fas ${children.length > 0 ? 'fa-chevron-down' : 'fa-minus'} text-[8px] opacity-30`}></i>
                             <i className="fas fa-bone text-[9px] opacity-50"></i>
                             {part}
                          </div>
                          {part !== RigPart.ROOT && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onRemoveBone(part); }}
                              className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors"
                            >
                              <i className="fas fa-times text-[10px]"></i>
                            </button>
                          )}
                        </div>
                        {children.map(child => renderTree(child, depth + 1))}
                      </React.Fragment>
                    );
                  };
                  const roots = state.activeParts.filter(p => !state.partParents[p] || !state.activeParts.includes(state.partParents[p]!));
                  return roots.map(root => renderTree(root));
                })()}
              </div>
            </section>

            {/* 3. Bone Configuration */}
            {state.selectedPart && selectedRest && (
              <section className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-5">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-cog text-indigo-400 text-[10px]"></i>
                    <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">{state.selectedPart}</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Parent Bone</label>
                    <select 
                      value={state.partParents[state.selectedPart] || ''}
                      onChange={(e) => onUpdatePartParent(state.selectedPart!, e.target.value ? e.target.value as RigPart : null)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white/80 outline-none focus:border-indigo-500/50 appearance-none"
                    >
                      <option value="">No Parent (Root Space)</option>
                      {state.activeParts.filter(p => p !== state.selectedPart).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Pivot Point</label>
                      <div className="flex gap-3">
                        <button onClick={onResetRestPose} className="text-[8px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors">Reset</button>
                        <button onClick={onSetCurrentAsRest} className="text-[8px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors">Capture</button>
                      </div>
                    </div>
                    {['position', 'rotation'].map((type) => (
                      <div key={type} className="space-y-2">
                        <span className="text-[8px] text-white/20 uppercase tracking-tighter block">{type}</span>
                        <div className="grid grid-cols-3 gap-2">
                          {['X', 'Y', 'Z'].map((axis, i) => (
                            <div key={axis} className="space-y-1">
                              <div className="flex justify-between text-[8px] font-mono text-white/30">
                                <span>{axis}</span>
                                <span>{selectedRest[type as 'position' | 'rotation'][i].toFixed(1)}</span>
                              </div>
                              <input 
                                type="range" 
                                min={type === 'position' ? -50 : -Math.PI} 
                                max={type === 'position' ? 50 : Math.PI} 
                                step={0.1}
                                value={selectedRest[type as 'position' | 'rotation'][i]} 
                                onChange={(e) => onUpdateRestTransform(state.selectedPart!, type as any, i, parseFloat(e.target.value))}
                                className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {activePanel === 'layers' && (
          <div className="space-y-6">
             <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-1">Bone Organization</label>
             <div className="space-y-1">
               {state.activeParts.map(part => (
                 <div key={part} className={`flex items-center gap-2 p-2 rounded-xl border border-white/5 transition-all ${state.selectedPart === part ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-white/5'}`}>
                   <div 
                    className="flex-1 text-[11px] font-medium tracking-wide cursor-pointer flex items-center gap-2"
                    onClick={() => onSelectPart(part)}
                   >
                     <i className={`fas fa-bone text-[10px] ${state.selectedPart === part ? 'text-indigo-400' : 'text-white/20'}`}></i>
                     {part}
                   </div>
                   <div className="flex gap-1">
                     <button 
                      onClick={() => onTogglePartVisibility(part)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${state.hiddenParts.includes(part) ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/40 hover:text-white/70'}`}
                      title="Toggle Visibility"
                     >
                       <i className={`fas ${state.hiddenParts.includes(part) ? 'fa-eye-slash' : 'fa-eye'} text-[10px]`}></i>
                     </button>
                     <button 
                      onClick={() => onTogglePartLock(part)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${state.lockedParts.includes(part) ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/40 hover:text-white/70'}`}
                      title="Toggle Lock"
                     >
                       <i className={`fas ${state.lockedParts.includes(part) ? 'fa-lock' : 'fa-lock-open'} text-[10px]`}></i>
                     </button>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {activePanel === 'anim' && (
          <div className="space-y-8">
            <section>
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-3">Motion Clips</label>
              <div className="grid grid-cols-2 gap-2">
                {ANIMATION_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => onApplyAnimationPreset(preset)}
                    className="group relative flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/30 rounded-xl transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <i className={`fas ${preset.icon} text-lg text-white/40 group-hover:text-indigo-400 transition-colors`}></i>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/60 group-hover:text-white">{preset.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex justify-between items-end mb-3">
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Animation Rig</label>
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

              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {state.activeParts.map(part => (
                  <button
                    key={part}
                    onClick={() => onSelectPart(part)}
                    className={`py-2 px-3 rounded-lg text-[10px] font-medium transition-all ${state.selectedPart === part ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/5'}`}
                  >
                    {part}
                  </button>
                ))}
              </div>

              {state.selectedPart && selectedTransform && (
                <div className="mt-6 space-y-4 p-4 bg-white/5 rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-2">
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Animated Delta: {state.selectedPart}</span>
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
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-3">Interpolation Mode</label>
              <div className="flex gap-2">
                {[InterpolationMode.LINEAR, InterpolationMode.STEP, InterpolationMode.BEZIER].map(mode => (
                  <button key={mode} onClick={() => onUpdateInterpolation(mode)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all border ${currentKeyframe?.interpolation === mode ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-transparent text-white/30 border-white/5 hover:border-white/10'}`}>{mode}</button>
                ))}
              </div>
            </section>
          </div>
        )}

        {activePanel === 'scene' && (
          <div className="space-y-8">
            <section>
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-4">Environment Aesthetic</label>
              <div className="space-y-5 p-4 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] text-white/40 uppercase tracking-tighter">Exposure</span>
                    <span className="text-[10px] font-mono text-indigo-400">{state.config.exposure.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" min="0" max="3" step="0.1"
                    value={state.config.exposure}
                    onChange={(e) => onUpdateConfig({ exposure: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none accent-indigo-500"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] text-white/40 uppercase tracking-tighter">Main Light Color</span>
                  </div>
                  <input 
                    type="color"
                    value={state.config.lightColor}
                    onMouseDown={onConfigInteractionStart}
                    onChange={(e) => onUpdateConfig({ lightColor: e.target.value })}
                    className="w-full h-8 bg-transparent cursor-pointer rounded overflow-hidden border border-white/10"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] text-white/40 uppercase tracking-tighter">Light Intensity</span>
                    <span className="text-[10px] font-mono text-indigo-400">{state.config.lightIntensity.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" min="0" max="10" step="0.1"
                    onMouseDown={onConfigInteractionStart}
                    value={state.config.lightIntensity}
                    onChange={(e) => onUpdateConfig({ lightIntensity: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none accent-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] text-white/20 uppercase tracking-widest block">Light Position</span>
                  {['X', 'Y', 'Z'].map((axis, i) => (
                    <div key={axis} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-white/20 w-3 font-mono">{axis}</span>
                      <input 
                        type="range" min="-100" max="100" step="1"
                        onMouseDown={onConfigInteractionStart}
                        value={state.config.lightPosition[i]}
                        onChange={(e) => {
                          const pos = [...state.config.lightPosition];
                          pos[i] = parseFloat(e.target.value);
                          onUpdateConfig({ lightPosition: pos });
                        }}
                        className="flex-1 accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-white/40 w-8 text-right">{state.config.lightPosition[i].toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] text-white/40 uppercase tracking-tighter">Ambient Occlusion</span>
                    <span className="text-[10px] font-mono text-indigo-400">{state.config.aoIntensity.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" min="0" max="3" step="0.1"
                    onMouseDown={onConfigInteractionStart}
                    value={state.config.aoIntensity}
                    onChange={(e) => onUpdateConfig({ aoIntensity: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none accent-indigo-500"
                  />
                </div>

                <div className="pt-4 border-t border-white/5 space-y-4">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em] block">Color Grading</span>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-[10px] text-white/40 uppercase tracking-tighter">Saturation</span>
                      <span className="text-[10px] font-mono text-indigo-400">{state.config.saturation.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" min="-1" max="1" step="0.01"
                      onMouseDown={onConfigInteractionStart}
                      value={state.config.saturation}
                      onChange={(e) => onUpdateConfig({ saturation: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-[10px] text-white/40 uppercase tracking-tighter">Contrast</span>
                      <span className="text-[10px] font-mono text-indigo-400">{state.config.contrast.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" min="-1" max="1" step="0.01"
                      onMouseDown={onConfigInteractionStart}
                      value={state.config.contrast}
                      onChange={(e) => onUpdateConfig({ contrast: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-[10px] text-white/40 uppercase tracking-tighter">Hue Shift</span>
                      <span className="text-[10px] font-mono text-indigo-400">{(state.config.hue * (180 / Math.PI)).toFixed(0)}°</span>
                    </div>
                    <input 
                      type="range" min={-Math.PI} max={Math.PI} step={0.01}
                      onMouseDown={onConfigInteractionStart}
                      value={state.config.hue}
                      onChange={(e) => onUpdateConfig({ hue: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-[10px] text-white/40 uppercase tracking-tighter">Brightness</span>
                      <span className="text-[10px] font-mono text-indigo-400">{state.config.brightness.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" min="-1" max="1" step="0.01"
                      onMouseDown={onConfigInteractionStart}
                      value={state.config.brightness}
                      onChange={(e) => onUpdateConfig({ brightness: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-[10px] text-white/40 uppercase tracking-tighter">Bloom Intensity</span>
                      <span className="text-[10px] font-mono text-indigo-400">{state.config.bloom.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" min="0" max="2" step="0.01"
                      onMouseDown={onConfigInteractionStart}
                      value={state.config.bloom}
                      onChange={(e) => onUpdateConfig({ bloom: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none accent-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mb-4">
                  <button onClick={() => onUpdateConfig({ backgroundType: 'color' })} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all ${state.config.backgroundType === 'color' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white/60'}`}>Color</button>
                  <button onClick={() => onUpdateConfig({ backgroundType: 'hdri' })} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all ${state.config.backgroundType === 'hdri' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white/60'}`}>HDRI</button>
                </div>

                {state.config.backgroundType === 'color' ? (
                  <div>
                    <input type="color" value={state.config.backgroundColor} onChange={(e) => onUpdateConfig({ backgroundColor: e.target.value })} className="w-full h-8 bg-transparent cursor-pointer rounded overflow-hidden border border-white/10" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-1">
                      {HDRI_PRESETS.map(preset => (
                        <button key={preset} onClick={() => onUpdateConfig({ environmentPreset: preset, environmentUrl: undefined })} className={`p-1 rounded text-[8px] font-bold uppercase transition-all ${state.config.environmentPreset === preset && !state.config.environmentUrl ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>{preset.slice(0, 3)}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section>
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-4">Shadow Controls</label>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">Main Shadows</span>
                  <button 
                    onClick={() => onUpdateConfig({ shadowsEnabled: !state.config.shadowsEnabled })}
                    className={`w-10 h-5 rounded-full relative transition-colors ${state.config.shadowsEnabled ? 'bg-indigo-600' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${state.config.shadowsEnabled ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-white/40 uppercase tracking-tighter">Shadow Softness</span>
                    <span className="text-[10px] font-mono text-indigo-400">{state.config.shadowSoftness.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" min="0" max="20" step="0.5"
                    value={state.config.shadowSoftness}
                    onChange={(e) => onUpdateConfig({ shadowSoftness: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none accent-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-white/40 uppercase tracking-tighter block mb-1">Resolution</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[512, 1024, 2048].map(res => (
                      <button 
                        key={res} 
                        onClick={() => onUpdateConfig({ shadowResolution: res })}
                        className={`py-1 rounded text-[9px] font-bold ${state.config.shadowResolution === res ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-white/20 uppercase tracking-widest">Cast</span>
                    <button 
                      onClick={() => onUpdateConfig({ voxelsCastShadows: !state.config.voxelsCastShadows })}
                      className={`py-2 rounded-lg text-[9px] font-bold border ${state.config.voxelsCastShadows ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-white/20'}`}
                    >
                      Voxels
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-white/20 uppercase tracking-widest">Receive</span>
                    <button 
                      onClick={() => onUpdateConfig({ voxelsReceiveShadows: !state.config.voxelsReceiveShadows })}
                      className={`py-2 rounded-lg text-[9px] font-bold border ${state.config.voxelsReceiveShadows ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-white/20'}`}
                    >
                      Voxels
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-white/40 uppercase tracking-tighter">Contact Shadows</span>
                    <span className="text-[10px] font-mono text-indigo-400">{(state.config.contactShadowOpacity * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.05"
                    value={state.config.contactShadowOpacity}
                    onChange={(e) => onUpdateConfig({ contactShadowOpacity: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none accent-indigo-500"
                  />
                </div>
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block">Dynamic Lights</label>
                <div className="flex gap-1">
                  {Object.values(LightType).map(type => (
                    <button 
                      key={type}
                      onClick={() => {
                        const newLight: LightConfig = {
                          id: Math.random().toString(36).substr(2, 9),
                          type: type as LightType,
                          position: [0, 10, 0],
                          rotation: [0, 0, 0],
                          color: '#ffffff',
                          intensity: 1,
                          castShadow: true,
                          ...(type === LightType.SPOT ? { angle: 0.3, penumbra: 0.5 } : {}),
                          ...(type === LightType.AREA ? { width: 10, height: 10 } : {}),
                        };
                        onUpdateConfig({ lights: [...state.config.lights, newLight] });
                      }}
                      className="px-1.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[8px] font-bold uppercase transition-all"
                      title={`Add ${type}`}
                    >
                      {type.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                {state.config.lights.map((light, index) => (
                  <div key={light.id} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{light.type} #{index + 1}</span>
                      <button 
                        onClick={() => {
                          const newLights = state.config.lights.filter(l => l.id !== light.id);
                          onUpdateConfig({ lights: newLights });
                        }}
                        className="text-white/20 hover:text-red-400 transition-colors"
                      >
                        <i className="fas fa-trash text-[10px]" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[9px] text-white/20 uppercase tracking-widest block mb-1">Color</span>
                        <input 
                          type="color"
                          value={light.color}
                          onChange={(e) => {
                            const newLights = [...state.config.lights];
                            newLights[index] = { ...light, color: e.target.value };
                            onUpdateConfig({ lights: newLights });
                          }}
                          className="w-full h-6 bg-transparent cursor-pointer rounded overflow-hidden border border-white/10"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-white/20 uppercase tracking-widest block mb-1">Intensity</span>
                        <input 
                          type="number"
                          step="0.1"
                          value={light.intensity}
                          onChange={(e) => {
                            const newLights = [...state.config.lights];
                            newLights[index] = { ...light, intensity: parseFloat(e.target.value) };
                            onUpdateConfig({ lights: newLights });
                          }}
                          className="w-full h-6 bg-white/5 border border-white/10 rounded px-1 text-[10px] text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] text-white/20 uppercase tracking-widest block">Position</span>
                      <div className="grid grid-cols-3 gap-1">
                        {['X', 'Y', 'Z'].map((axis, i) => (
                          <input 
                            key={axis}
                            type="number"
                            placeholder={axis}
                            value={light.position[i]}
                            onChange={(e) => {
                              const newPos = [...light.position] as [number, number, number];
                              newPos[i] = parseFloat(e.target.value);
                              const newLights = [...state.config.lights];
                              newLights[index] = { ...light, position: newPos };
                              onUpdateConfig({ lights: newLights });
                            }}
                            className="w-full h-6 bg-white/5 border border-white/10 rounded px-1 text-[10px] text-white"
                          />
                        ))}
                      </div>
                    </div>

                    {light.type !== LightType.POINT && (
                      <div className="space-y-2">
                        <span className="text-[9px] text-white/20 uppercase tracking-widest block">Rotation</span>
                        <div className="grid grid-cols-3 gap-1">
                          {['X', 'Y', 'Z'].map((axis, i) => (
                            <input 
                              key={axis}
                              type="number"
                              placeholder={axis}
                              step="0.1"
                              value={light.rotation[i]}
                              onChange={(e) => {
                                const newRot = [...light.rotation] as [number, number, number];
                                newRot[i] = parseFloat(e.target.value);
                                const newLights = [...state.config.lights];
                                newLights[index] = { ...light, rotation: newRot };
                                onUpdateConfig({ lights: newLights });
                              }}
                              className="w-full h-6 bg-white/5 border border-white/10 rounded px-1 text-[10px] text-white"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {light.type === LightType.SPOT && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] text-white/20 uppercase tracking-widest block mb-1">Angle</span>
                          <input 
                            type="number" step="0.01" value={light.angle}
                            onChange={(e) => {
                              const newLights = [...state.config.lights];
                              newLights[index] = { ...light, angle: parseFloat(e.target.value) };
                              onUpdateConfig({ lights: newLights });
                            }}
                            className="w-full h-6 bg-white/5 border border-white/10 rounded px-1 text-[10px] text-white"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-white/20 uppercase tracking-widest block mb-1">Penumbra</span>
                          <input 
                            type="number" step="0.01" value={light.penumbra}
                            onChange={(e) => {
                              const newLights = [...state.config.lights];
                              newLights[index] = { ...light, penumbra: parseFloat(e.target.value) };
                              onUpdateConfig({ lights: newLights });
                            }}
                            className="w-full h-6 bg-white/5 border border-white/10 rounded px-1 text-[10px] text-white"
                          />
                        </div>
                      </div>
                    )}

                    {light.type === LightType.AREA && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] text-white/20 uppercase tracking-widest block mb-1">Width</span>
                          <input 
                            type="number" value={light.width}
                            onChange={(e) => {
                              const newLights = [...state.config.lights];
                              newLights[index] = { ...light, width: parseFloat(e.target.value) };
                              onUpdateConfig({ lights: newLights });
                            }}
                            className="w-full h-6 bg-white/5 border border-white/10 rounded px-1 text-[10px] text-white"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-white/20 uppercase tracking-widest block mb-1">Height</span>
                          <input 
                            type="number" value={light.height}
                            onChange={(e) => {
                              const newLights = [...state.config.lights];
                              newLights[index] = { ...light, height: parseFloat(e.target.value) };
                              onUpdateConfig({ lights: newLights });
                            }}
                            className="w-full h-6 bg-white/5 border border-white/10 rounded px-1 text-[10px] text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block">Camera Views</label>
                <button onClick={onSaveCamera} className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/50 rounded text-[9px] font-bold uppercase tracking-widest transition-all">+ Add</button>
              </div>
              <div className="space-y-1">
                {state.savedCameras.map(cam => (
                  <div key={cam.id} className="group flex items-center gap-1.5 p-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-all">
                    <button onClick={() => onSwitchCamera(cam.config)} className="flex-1 py-1 px-2 text-[10px] font-medium text-white/60 group-hover:text-white text-left truncate">{cam.name}</button>
                    <button onClick={() => onDeleteCamera(cam.id)} className="p-1.5 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"><i className="fas fa-trash-alt text-[8px]"></i></button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
