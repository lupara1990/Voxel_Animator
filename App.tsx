
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Environment, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { AppState, RigPart, VoxelData, Keyframe, GizmoMode, InterpolationMode, Preset, CameraConfig, RigTemplate, SavedCamera } from './types';
import { DEFAULT_CONFIG, INITIAL_TRANSFORMS, DEFAULT_PRESETS } from './constants';
import { parseVoxFile, reprocessVoxels } from './services/voxParser';
import { generateVoxAnimationVideo } from './services/geminiService';
import VoxelModel from './components/VoxelModel';
import Sidebar from './components/Sidebar';
import Timeline from './components/Timeline';

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
});

const SceneContent: React.FC<{ 
  state: AppState, 
  onGizmoChange: (part: RigPart, position: [number, number, number], rotation: [number, number, number]) => void,
  onGizmoStart: () => void,
  onGizmoEnd: () => void,
  cameraTrigger: number,
  pendingCamera: CameraConfig | null,
  cameraStateRef: React.MutableRefObject<CameraConfig | null>
}> = ({ state, onGizmoChange, onGizmoStart, onGizmoEnd, cameraTrigger, pendingCamera, cameraStateRef }) => {
  const { scene, camera } = useThree();
  const transformRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const selectedObject = useRef<THREE.Object3D | null>(null);

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
      camera.position.set(...pendingCamera.position);
      controlsRef.current.target.set(...pendingCamera.target);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = pendingCamera.fov;
        camera.updateProjectionMatrix();
      }
      controlsRef.current.update();
    }
  }, [cameraTrigger, camera]);

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

  const handleControlsChange = (e: any) => {
    const cam = e.target.object;
    const target = e.target.target;
    cameraStateRef.current = {
      position: [cam.position.x, cam.position.y, cam.position.z],
      target: [target.x, target.y, target.z],
      fov: cam.fov
    };
  };

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
      <color attach="background" args={[state.config.backgroundColor]} />
      <ambientLight intensity={0.4} />
      <spotLight 
        position={[50, 100, 50]} 
        angle={0.15} 
        penumbra={1} 
        intensity={state.config.lightIntensity} 
        castShadow 
      />
      <directionalLight position={[-10, 20, 10]} intensity={state.config.lightIntensity * 0.5} color={state.config.lightColor} />
      <Environment preset="city" />
      {state.voxels.length > 0 && <VoxelModel voxels={state.voxels} keyframes={state.keyframes} currentTime={state.currentTime} />}
      <ContactShadows position={[0, -5, 0]} opacity={0.6} scale={100} blur={2.5} far={10} />
      <gridHelper args={[100, 20, '#222', '#111']} position={[0, -4.9, 0]} />
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
    keyframes: [{ time: 0, interpolation: InterpolationMode.LINEAR, transforms: INITIAL_TRANSFORMS }],
    currentTime: 0,
    isPlaying: false,
    selectedPart: null,
    config: DEFAULT_CONFIG,
    gizmoMode: 'translate',
    presets: DEFAULT_PRESETS,
    rigTemplate: RigTemplate.HUMANOID,
    autoKeyframe: false,
    savedCameras: [],
  });

  const [history, setHistory] = useState<{ past: any[], future: any[] }>({ past: [], future: [] });
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [cameraTrigger, setCameraTrigger] = useState(0);
  const [pendingCamera, setPendingCamera] = useState<CameraConfig | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) handleRedo(); else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, history]);

  const pushToHistory = useCallback((currentState: AppState) => {
    setHistory(prev => ({ past: [...prev.past, getHistorySnapshot(currentState)], future: [] }));
  }, []);

  const handleUndo = useCallback(() => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    setHistory(prev => ({ past: prev.past.slice(0, -1), future: [getHistorySnapshot(state), ...prev.future] }));
    setState(prev => ({ ...prev, ...previous }));
  }, [state, history]);

  const handleRedo = useCallback(() => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    setHistory(prev => ({ past: [...prev.past, getHistorySnapshot(state)], future: prev.future.slice(1) }));
    setState(prev => ({ ...prev, ...next }));
  }, [state, history]);

  useEffect(() => {
    // @ts-ignore
    window.aistudio.hasSelectedApiKey().then(setHasApiKey);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    try {
      const parsedVoxels = await parseVoxFile(buffer, state.rigTemplate);
      pushToHistory(state);
      setState(prev => ({ 
        ...prev, 
        voxels: parsedVoxels, 
        currentTime: 0, 
        selectedPart: null,
        keyframes: [{ time: 0, interpolation: InterpolationMode.LINEAR, transforms: INITIAL_TRANSFORMS }] 
      }));
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleUpdateRigTemplate = (template: RigTemplate) => {
    if (template === state.rigTemplate) return;
    pushToHistory(state);
    const updatedVoxels = reprocessVoxels(state.voxels, template);
    setState(prev => ({
      ...prev,
      rigTemplate: template,
      voxels: updatedVoxels,
      selectedPart: null
    }));
  };

  const handleUpdateConfig = (updates: Partial<typeof DEFAULT_CONFIG>) => setState(prev => ({ ...prev, config: { ...prev.config, ...updates } }));

  const handleAddKeyframe = () => {
    pushToHistory(state);
    setState(prev => {
      const existing = prev.keyframes.find(k => Math.abs(k.time - prev.currentTime) < 0.01);
      if (existing) return prev;
      const newKeyframe: Keyframe = {
        time: prev.currentTime,
        interpolation: prev.keyframes[prev.keyframes.length - 1].interpolation,
        transforms: JSON.parse(JSON.stringify(prev.keyframes[prev.keyframes.length-1].transforms))
      };
      return { ...prev, keyframes: [...prev.keyframes, newKeyframe].sort((a, b) => a.time - b.time) };
    });
  };

  const handleUpdateTransform = (part: RigPart, type: 'position' | 'rotation', index: number, value: number) => {
    setState(prev => {
      let newKeyframes = [...prev.keyframes];
      let currentKey: Keyframe;

      if (prev.autoKeyframe) {
        const existingIdx = newKeyframes.findIndex(k => Math.abs(k.time - prev.currentTime) < 0.001);
        if (existingIdx !== -1) {
          currentKey = { ...newKeyframes[existingIdx] };
          newKeyframes[existingIdx] = currentKey;
        } else {
          const prevKey = newKeyframes.reduce((pk, ck) => (ck.time <= prev.currentTime) ? ck : pk, newKeyframes[0]);
          currentKey = JSON.parse(JSON.stringify(prevKey));
          currentKey.time = prev.currentTime;
          newKeyframes.push(currentKey);
          newKeyframes.sort((a, b) => a.time - b.time);
        }
      } else {
        currentKey = prev.keyframes.reduce((pk, ck) => (ck.time <= prev.currentTime) ? ck : pk, prev.keyframes[0]);
      }

      const updatedTransforms = { ...currentKey.transforms };
      const newValues = [...updatedTransforms[part][type]] as [number, number, number];
      newValues[index] = value;
      updatedTransforms[part] = { ...updatedTransforms[part], [type]: newValues };
      currentKey.transforms = updatedTransforms;

      if (!prev.autoKeyframe) {
        newKeyframes = prev.keyframes.map(k => k.time === currentKey.time ? currentKey : k);
      }

      return { ...prev, keyframes: newKeyframes };
    });
  };

  const handleGizmoUpdate = (part: RigPart, position: [number, number, number], rotation: [number, number, number]) => {
    setState(prev => {
      let newKeyframes = [...prev.keyframes];
      let currentKey: Keyframe;

      if (prev.autoKeyframe) {
        const existingIdx = newKeyframes.findIndex(k => Math.abs(k.time - prev.currentTime) < 0.001);
        if (existingIdx !== -1) {
          currentKey = { ...newKeyframes[existingIdx] };
          newKeyframes[existingIdx] = currentKey;
        } else {
          const prevKey = newKeyframes.reduce((pk, ck) => (ck.time <= prev.currentTime) ? ck : pk, newKeyframes[0]);
          currentKey = JSON.parse(JSON.stringify(prevKey));
          currentKey.time = prev.currentTime;
          newKeyframes.push(currentKey);
          newKeyframes.sort((a, b) => a.time - b.time);
        }
      } else {
        currentKey = prev.keyframes.reduce((pk, ck) => (ck.time <= prev.currentTime) ? ck : pk, prev.keyframes[0]);
      }

      currentKey.transforms = { ...currentKey.transforms, [part]: { position, rotation } };

      if (!prev.autoKeyframe) {
        newKeyframes = prev.keyframes.map(k => k.time === currentKey.time ? currentKey : k);
      }

      return { ...prev, keyframes: newKeyframes };
    });
  };

  const handleUpdateInterpolation = (interpolation: InterpolationMode) => {
    pushToHistory(state);
    setState(prev => {
      const ck = prev.keyframes.reduce((pk, ck) => (ck.time <= prev.currentTime) ? ck : pk, prev.keyframes[0]);
      return { ...prev, keyframes: prev.keyframes.map(k => k === ck ? { ...k, interpolation } : k) };
    });
  };

  const handleApplyPreset = (p: Preset) => {
    pushToHistory(state);
    setState(prev => ({ ...prev, config: { ...p.config } }));
    setPendingCamera(p.camera);
    setCameraTrigger(prev => prev + 1);
  };

  const handleSavePreset = () => {
    const name = prompt("Enter a name for your preset:");
    if (!name || !cameraStateRef.current) return;
    pushToHistory(state);
    const newPreset: Preset = {
      id: `custom-${Date.now()}`,
      name,
      config: { ...state.config },
      camera: { ...cameraStateRef.current }
    };
    setState(prev => ({ ...prev, presets: [...prev.presets, newPreset] }));
  };

  const handleSaveCamera = () => {
    const name = prompt("Enter a name for this camera view:");
    if (!name || !cameraStateRef.current) return;
    pushToHistory(state);
    const newCam: SavedCamera = {
      id: `cam-${Date.now()}`,
      name,
      config: { ...cameraStateRef.current }
    };
    setState(prev => ({ ...prev, savedCameras: [...prev.savedCameras, newCam] }));
  };

  const handleDeleteCamera = (id: string) => {
    pushToHistory(state);
    setState(prev => ({ ...prev, savedCameras: prev.savedCameras.filter(c => c.id !== id) }));
  };

  const handleSwitchCamera = (config: CameraConfig) => {
    setPendingCamera(config);
    setCameraTrigger(prev => prev + 1);
  };

  const handleExport = async () => {
    if (!hasApiKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
      return;
    }
    setIsExporting(true);
    try {
      const videoUrl = await generateVoxAnimationVideo("character motion", document.querySelector('canvas')!.toDataURL('image/png'));
      if (videoUrl) setExportedVideoUrl(videoUrl);
    } catch (err) {
      alert("Export failed: " + err.message);
    } finally { setIsExporting(false); }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-white font-sans">
      <Sidebar 
        state={state}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onUpdateConfig={handleUpdateConfig}
        onConfigInteractionStart={() => pushToHistory(state)}
        onFileUpload={handleFileUpload}
        onSelectPart={(p) => setState(prev => ({ ...prev, selectedPart: p }))}
        onUpdateTransform={handleUpdateTransform}
        onTransformInteractionStart={() => pushToHistory(state)}
        onSetGizmoMode={(m) => setState(prev => ({ ...prev, gizmoMode: m }))}
        onUpdateInterpolation={handleUpdateInterpolation}
        onUpdateRigTemplate={handleUpdateRigTemplate}
        onUpdateAutoKeyframe={(auto) => setState(prev => ({ ...prev, autoKeyframe: auto }))}
        onApplyPreset={handleApplyPreset}
        onSavePreset={handleSavePreset} 
        onSaveCamera={handleSaveCamera}
        onDeleteCamera={handleDeleteCamera}
        onSwitchCamera={handleSwitchCamera}
        onExport={handleExport}
        isExporting={isExporting}
      />
      <main className="flex-1 relative">
        <Canvas shadows gl={{ preserveDrawingBuffer: true, antialias: true }}>
          <SceneContent 
            state={state} 
            onGizmoChange={handleGizmoUpdate} 
            onGizmoStart={() => pushToHistory(state)} 
            onGizmoEnd={() => {}} 
            cameraTrigger={cameraTrigger} 
            pendingCamera={pendingCamera}
            cameraStateRef={cameraStateRef}
          />
        </Canvas>
        {exportedVideoUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-12">
            <div className="relative max-w-5xl w-full bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl">
              <button onClick={() => setExportedVideoUrl(null)} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full z-10"><i className="fas fa-times"></i></button>
              <video src={exportedVideoUrl} controls autoPlay loop className="w-full aspect-video bg-black" />
            </div>
          </div>
        )}
      </main>
      <Timeline currentTime={state.currentTime} keyframes={state.keyframes} isPlaying={state.isPlaying} onTimeChange={(t) => setState(p => ({ ...p, currentTime: t }))} onTogglePlay={() => setState(p => ({ ...p, isPlaying: !p.isPlaying }))} onAddKeyframe={handleAddKeyframe} />
    </div>
  );
};

export default App;
