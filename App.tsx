
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Environment, TransformControls } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AppState, RigPart, VoxelData, Keyframe, GizmoMode, InterpolationMode, Preset, CameraConfig, RigTemplate, SavedCamera, SceneConfig } from './types';
import { DEFAULT_CONFIG, INITIAL_TRANSFORMS, DEFAULT_PRESETS, DEFAULT_HIERARCHIES, RIG_PARTS } from './constants';
import { parseVoxFile, reprocessVoxels } from './services/voxParser';
import { generateVoxAnimationVideo } from './services/geminiService';
import VoxelModel from './components/VoxelModel';
import Sidebar from './components/Sidebar';
import Timeline from './components/Timeline';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // Fix: Remove readonly to avoid "All declarations of 'aistudio' must have identical modifiers" error
    aistudio: AIStudio;
  }
}

const getHistorySnapshot = (state: AppState) => ({
  voxels: JSON.parse(JSON.stringify(state.voxels)),
  keyframes: JSON.parse(JSON.stringify(state.keyframes)),
  selectedPart: state.selectedPart,
  config: JSON.parse(JSON.stringify(state.config)),
  gizmoMode: state.gizmoMode,
  presets: JSON.parse(JSON.stringify(state.presets)),
  rigTemplate: state.rigTemplate,
  autoKeyframe: state.autoKeyframe,
  savedCameras: JSON.parse(JSON.stringify(state.savedCameras)),
  partParents: JSON.parse(JSON.stringify(state.partParents)),
});

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const SceneContent: React.FC<{ 
  state: AppState, 
  onGizmoChange: (part: RigPart, position: [number, number, number], rotation: [number, number, number]) => void,
  onGizmoStart: () => void,
  onGizmoEnd: () => void,
  cameraTrigger: number,
  pendingCamera: CameraConfig | null,
  cameraStateRef: React.MutableRefObject<CameraConfig | null>,
  onUpdateActiveConfig: (config: SceneConfig) => void
}> = ({ state, onGizmoChange, onGizmoStart, onGizmoEnd, cameraTrigger, pendingCamera, cameraStateRef, onUpdateActiveConfig }) => {
  const { scene, camera } = useThree();
  const transformRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const selectedObject = useRef<THREE.Object3D | null>(null);

  useFrame(() => {
    if (state.keyframes.length === 0) return;
    
    let prev = state.keyframes[0];
    let next = state.keyframes[0];
    for (let i = 0; i < state.keyframes.length; i++) {
      if (state.keyframes[i].time <= state.currentTime) prev = state.keyframes[i];
      if (state.keyframes[i].time >= state.currentTime) {
        next = state.keyframes[i];
        break;
      }
    }

    let t = next.time === prev.time ? 0 : (state.currentTime - prev.time) / (next.time - prev.time);
    if (prev.interpolation === InterpolationMode.STEP) t = 0;
    else if (prev.interpolation === InterpolationMode.BEZIER) t = easeInOutCubic(t);

    const lerpColor = (c1: string, c2: string, alpha: number) => {
      const col1 = new THREE.Color(c1);
      const col2 = new THREE.Color(c2);
      return `#${col1.lerp(col2, alpha).getHexString()}`;
    };

    const interpConfig: SceneConfig = {
      exposure: THREE.MathUtils.lerp(prev.environment.exposure, next.environment.exposure, t),
      bloom: THREE.MathUtils.lerp(prev.environment.bloom, next.environment.bloom, t),
      lightIntensity: THREE.MathUtils.lerp(prev.environment.lightIntensity, next.environment.lightIntensity, t),
      lightColor: lerpColor(prev.environment.lightColor, next.environment.lightColor, t),
      backgroundColor: lerpColor(prev.environment.backgroundColor, next.environment.backgroundColor, t),
      backgroundType: t < 0.5 ? prev.environment.backgroundType : next.environment.backgroundType,
      environmentPreset: t < 0.5 ? prev.environment.environmentPreset : next.environment.environmentPreset,
      environmentUrl: t < 0.5 ? prev.environment.environmentUrl : next.environment.environmentUrl,
      environmentIntensity: THREE.MathUtils.lerp(prev.environment.environmentIntensity, next.environment.environmentIntensity, t),
      environmentRotation: THREE.MathUtils.lerp(prev.environment.environmentRotation, next.environment.environmentRotation, t),
    };

    if (state.isPlaying || Math.abs(state.config.exposure - interpConfig.exposure) > 0.001 || Math.abs(state.config.environmentIntensity - interpConfig.environmentIntensity) > 0.001) {
      onUpdateActiveConfig(interpConfig);
    }
  });

  useEffect(() => {
    if (state.selectedPart) {
      const obj = scene.getObjectByName(`part-${state.selectedPart}`);
      if (obj) {
        selectedObject.current = obj;
        transformRef.current?.attach(obj);
      }
    } else {
      selectedObject.current = null;
      transformRef.current?.detach();
    }
  }, [state.selectedPart, scene, state.voxels]);

  useEffect(() => {
    if (pendingCamera && controlsRef.current) {
      camera.position.set(pendingCamera.position[0], pendingCamera.position[1], pendingCamera.position[2]);
      controlsRef.current.target.set(pendingCamera.target[0], pendingCamera.target[1], pendingCamera.target[2]);
      
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = pendingCamera.fov;
        camera.updateProjectionMatrix();
      }
      controlsRef.current.update();
      
      cameraStateRef.current = {
        position: [...pendingCamera.position],
        target: [...pendingCamera.target],
        fov: pendingCamera.fov
      };
    }
  }, [cameraTrigger, camera, pendingCamera, cameraStateRef]);

  const handleGizmoChange = () => {
    if (!selectedObject.current || !state.selectedPart) return;
    const pos = selectedObject.current.position;
    const rot = selectedObject.current.rotation;
    onGizmoChange(
      state.selectedPart,
      [pos.x, pos.y, pos.z],
      [rot.x, rot.y, rot.z]
    );
  };

  const handleControlsChange = useCallback(() => {
    if (controlsRef.current && camera) {
      const target = controlsRef.current.target;
      cameraStateRef.current = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [target.x, target.y, target.z],
        fov: (camera as THREE.PerspectiveCamera).fov || 35
      };
    }
  }, [camera, cameraStateRef]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[50, 50, 50]} fov={35} />
      {state.selectedPart && (
        <TransformControls 
          ref={transformRef}
          mode={state.gizmoMode}
          onObjectChange={handleGizmoChange}
          onMouseDown={onGizmoStart}
          onMouseUp={onGizmoEnd}
        />
      )}
      <OrbitControls 
        ref={controlsRef}
        makeDefault 
        enableDamping 
        dampingFactor={0.05} 
        screenSpacePanning={true}
        minDistance={5}
        maxDistance={250}
        enabled={!transformRef.current?.dragging}
        onChange={handleControlsChange}
      />
      {state.config.backgroundType === 'color' && (
        <color attach="background" args={[state.config.backgroundColor]} />
      )}
      <ambientLight intensity={0.2} />
      <spotLight 
        position={[50, 100, 50]} 
        angle={0.15} 
        penumbra={1} 
        intensity={state.config.lightIntensity} 
        castShadow 
      />
      <directionalLight 
        position={[-10, 20, 10]} 
        intensity={state.config.lightIntensity * 0.5} 
        color={state.config.lightColor} 
      />
      
      <Environment 
        preset={state.config.environmentUrl ? undefined : (state.config.environmentPreset as any)}
        files={state.config.environmentUrl}
        background={state.config.backgroundType === 'hdri'}
        intensity={state.config.environmentIntensity}
        rotation={[0, state.config.environmentRotation, 0]}
      />

      {state.voxels.length > 0 && (
        <VoxelModel 
          voxels={state.voxels} 
          keyframes={state.keyframes} 
          currentTime={state.currentTime} 
          partParents={state.partParents}
        />
      )}
      <ContactShadows position={[0, -5, 0]} opacity={0.6} scale={100} blur={2.5} far={10} />
      <gridHelper args={[100, 20, '#222', '#111']} position={[0, -4.9, 0]} />

      <EffectComposer disableNormalPass>
        <Bloom 
          intensity={state.config.bloom} 
          luminanceThreshold={0.8} 
          luminanceSmoothing={0.1} 
          mipmapBlur 
        />
        <ToneMapping 
          exposure={state.config.exposure} 
          mode={THREE.ACESFilmicToneMapping} 
        />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};

const App: React.FC = () => {
  const cameraStateRef = useRef<CameraConfig | null>({
    position: [50, 50, 50],
    target: [0, 0, 0],
    fov: 35
  });

  const [state, setState] = useState<AppState>({
    voxels: [],
    keyframes: [{ time: 0, interpolation: InterpolationMode.LINEAR, transforms: INITIAL_TRANSFORMS, environment: DEFAULT_CONFIG }],
    currentTime: 0,
    isPlaying: false,
    selectedPart: null,
    config: DEFAULT_CONFIG,
    gizmoMode: 'translate',
    presets: DEFAULT_PRESETS,
    rigTemplate: RigTemplate.HUMANOID,
    autoKeyframe: false,
    savedCameras: [],
    partParents: DEFAULT_HIERARCHIES[RigTemplate.HUMANOID],
  });

  const [history, setHistory] = useState<{ past: any[], future: any[] }>({ past: [], future: [] });
  const [isExporting, setIsExporting] = useState(false);
  const [exportConfig] = useState<{ resolution: '720p' | '1080p'; aspectRatio: '16:9' | '9:16' }>({
    resolution: '1080p',
    aspectRatio: '16:9'
  });
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [cameraTrigger, setCameraTrigger] = useState(0);
  const [pendingCamera, setPendingCamera] = useState<CameraConfig | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pushHistory = useCallback(() => {
    setHistory(h => ({
      past: [...h.past, getHistorySnapshot(state)],
      future: []
    }));
  }, [state]);

  const undo = () => {
    if (history.past.length === 0) return;
    const prev = history.past[history.past.length - 1];
    setHistory(h => ({
      past: h.past.slice(0, -1),
      future: [getHistorySnapshot(state), ...h.future]
    }));
    setState(s => ({ ...s, ...prev }));
  };

  const redo = () => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    setHistory(h => ({
      past: [...h.past, getHistorySnapshot(state)],
      future: h.future.slice(1)
    }));
    setState(s => ({ ...s, ...next }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const voxels = await parseVoxFile(buffer, state.rigTemplate);
    pushHistory();
    setState(s => ({ ...s, voxels, selectedPart: null }));
  };

  const updateActiveConfig = (config: SceneConfig) => {
    setState(s => ({ ...s, config }));
  };

  const updateTransform = (part: RigPart, type: 'position' | 'rotation', index: number, value: number) => {
    setState(s => {
      const newKeyframes = [...s.keyframes];
      const ki = newKeyframes.findIndex(k => Math.abs(k.time - s.currentTime) < 0.001);
      
      if (ki !== -1) {
        newKeyframes[ki].transforms[part][type][index] = value;
      } else if (s.autoKeyframe) {
        const closest = [...newKeyframes].sort((a, b) => Math.abs(a.time - s.currentTime) - Math.abs(b.time - s.currentTime))[0];
        const newKf = JSON.parse(JSON.stringify(closest));
        newKf.time = s.currentTime;
        newKf.transforms[part][type][index] = value;
        newKeyframes.push(newKf);
        newKeyframes.sort((a, b) => a.time - b.time);
      }
      return { ...s, keyframes: newKeyframes };
    });
  };

  const handleGizmoChange = (part: RigPart, position: [number, number, number], rotation: [number, number, number]) => {
    setState(s => {
      const newKeyframes = [...s.keyframes];
      const ki = newKeyframes.findIndex(k => Math.abs(k.time - s.currentTime) < 0.001);
      if (ki !== -1) {
        newKeyframes[ki].transforms[part] = { position, rotation };
      } else if (s.autoKeyframe) {
        const closest = [...newKeyframes].sort((a, b) => Math.abs(a.time - s.currentTime) - Math.abs(b.time - s.currentTime))[0];
        const newKf = JSON.parse(JSON.stringify(closest));
        newKf.time = s.currentTime;
        newKf.transforms[part] = { position, rotation };
        newKeyframes.push(newKf);
        newKeyframes.sort((a, b) => a.time - b.time);
      }
      return { ...s, keyframes: newKeyframes };
    });
  };

  const addKeyframe = () => {
    pushHistory();
    setState(s => {
      const existing = s.keyframes.find(k => Math.abs(k.time - s.currentTime) < 0.001);
      if (existing) return s;

      const closest = [...s.keyframes].sort((a, b) => Math.abs(a.time - s.currentTime) - Math.abs(b.time - s.currentTime))[0];
      const newKf: Keyframe = JSON.parse(JSON.stringify(closest));
      newKf.time = s.currentTime;
      newKf.environment = { ...s.config };

      const newKeyframes = [...s.keyframes, newKf].sort((a, b) => a.time - b.time);
      return { ...s, keyframes: newKeyframes };
    });
  };

  const handleUpdatePartParent = (part: RigPart, parent: RigPart | null) => {
    pushHistory();
    setState(s => ({
      ...s,
      partParents: { ...s.partParents, [part]: parent }
    }));
  };

  const handleExport = async () => {
    if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
        }
    }

    if (!canvasRef.current) return;
    setIsExporting(true);
    setExportedVideoUrl(null);

    try {
      const screenshot = canvasRef.current.toDataURL('image/png');
      const promptText = `a ${state.rigTemplate.toLowerCase()} voxel character in a cinematic ${state.config.lightColor} environment`;
      const videoUrl = await generateVoxAnimationVideo(promptText, screenshot, exportConfig.resolution, exportConfig.aspectRatio);
      setExportedVideoUrl(videoUrl);
    } catch (error: any) {
      if (error.message === "RESELECT_KEY" && window.aistudio) {
        await window.aistudio.openSelectKey();
      }
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const onSaveCamera = useCallback(() => {
    const inputName = prompt("Enter a name for this camera view:");
    if (inputName === null) return;
    const name = inputName.trim() || `View ${state.savedCameras.length + 1}`;
    
    if (cameraStateRef.current) {
      const config: CameraConfig = {
        position: [...cameraStateRef.current.position] as [number, number, number],
        target: [...cameraStateRef.current.target] as [number, number, number],
        fov: cameraStateRef.current.fov
      };
      setState(s => ({
        ...s,
        savedCameras: [...s.savedCameras, { id: Date.now().toString(), name, config }]
      }));
    }
  }, [state.savedCameras.length]);

  const onUpdateCamera = (id: string) => {
    if (cameraStateRef.current) {
      const config: CameraConfig = {
        position: [...cameraStateRef.current.position] as [number, number, number],
        target: [...cameraStateRef.current.target] as [number, number, number],
        fov: cameraStateRef.current.fov
      };
      setState(s => ({
        ...s,
        savedCameras: s.savedCameras.map(c => c.id === id ? { ...c, config } : c)
      }));
    }
  };

  return (
    <div className="flex h-screen w-screen bg-black text-white overflow-hidden font-sans selection:bg-indigo-500/30">
      <Sidebar 
        state={state}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={undo}
        onRedo={redo}
        onUpdateConfig={(updates) => setState(s => ({ ...s, config: { ...s.config, ...updates } }))}
        onConfigInteractionStart={pushHistory}
        onFileUpload={handleFileUpload}
        onSelectPart={(part) => setState(s => ({ ...s, selectedPart: part }))}
        onUpdateTransform={updateTransform}
        onTransformInteractionStart={pushHistory}
        onSetGizmoMode={(mode) => setState(s => ({ ...s, gizmoMode: mode }))}
        onUpdateInterpolation={(mode) => setState(s => {
          const newKfs = [...s.keyframes];
          const ki = newKfs.findIndex(k => Math.abs(k.time - s.currentTime) < 0.001);
          if (ki !== -1) newKfs[ki].interpolation = mode;
          return { ...s, keyframes: newKfs };
        })}
        onUpdateRigTemplate={(template) => {
          pushHistory();
          setState(s => ({ 
            ...s, 
            rigTemplate: template, 
            voxels: reprocessVoxels(s.voxels, template),
            selectedPart: null,
            partParents: DEFAULT_HIERARCHIES[template]
          }));
        }}
        onUpdateAutoKeyframe={(auto) => setState(s => ({ ...s, autoKeyframe: auto }))}
        onUpdatePartParent={handleUpdatePartParent}
        onApplyPreset={(p) => {
          pushHistory();
          setPendingCamera(p.camera);
          setCameraTrigger(prev => prev + 1);
          setState(s => ({ ...s, config: p.config }));
        }}
        onSavePreset={() => {
          const name = prompt("Preset Name:");
          if (name) {
            setState(s => ({
              ...s,
              presets: [...s.presets, { id: Date.now().toString(), name, config: s.config, camera: cameraStateRef.current! }]
            }));
          }
        }}
        onSaveCamera={onSaveCamera}
        onUpdateCamera={onUpdateCamera}
        onDeleteCamera={(id) => setState(s => ({ ...s, savedCameras: s.savedCameras.filter(c => c.id !== id) }))}
        onSwitchCamera={(config) => {
          setPendingCamera(config);
          setCameraTrigger(prev => prev + 1);
        }}
        onExport={handleExport}
        isExporting={isExporting}
      />

      <main className="flex-1 relative flex flex-col">
        <div className="flex-1 relative">
          <Canvas 
            shadows 
            gl={{ preserveDrawingBuffer: true, antialias: true }}
            ref={canvasRef}
          >
            <SceneContent 
              state={state} 
              onGizmoChange={handleGizmoChange}
              onGizmoStart={pushHistory}
              onGizmoEnd={() => {}} 
              cameraTrigger={cameraTrigger}
              pendingCamera={pendingCamera}
              cameraStateRef={cameraStateRef}
              onUpdateActiveConfig={updateActiveConfig}
            />
          </Canvas>

          {exportedVideoUrl && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-10">
              <div className="relative max-w-4xl w-full bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Cinematic Render Complete</h3>
                  <button onClick={() => setExportedVideoUrl(null)} className="text-white/40 hover:text-white transition-colors"><i className="fas fa-times"></i></button>
                </div>
                <video src={exportedVideoUrl} controls autoPlay loop className="w-full aspect-video bg-black" />
                <div className="p-6 flex justify-between items-center">
                  <p className="text-xs text-white/40 italic">Rendered with Gemini Veo 3.1 Fast</p>
                  <a href={exportedVideoUrl} download="voxaura-render.mp4" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold uppercase tracking-widest transition-all">Download MP4</a>
                </div>
              </div>
            </div>
          )}
        </div>

        <Timeline 
          currentTime={state.currentTime}
          keyframes={state.keyframes}
          isPlaying={state.isPlaying}
          onTimeChange={(t) => setState(s => ({ ...s, currentTime: t }))}
          onTogglePlay={() => setState(s => ({ ...s, isPlaying: !s.isPlaying }))}
          onAddKeyframe={addKeyframe}
        />
      </main>

      <div className="hidden">
        <ShortcutHandler undo={undo} redo={redo} />
      </div>
    </div>
  );
};

const ShortcutHandler: React.FC<{undo: () => void, redo: () => void}> = ({undo, redo}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
  return null;
};

export default App;
