
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Canvas, useThree, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Environment, TransformControls } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping, Vignette, N8AO, HueSaturation, BrightnessContrast } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AppState, RigPart, VoxelData, Keyframe, GizmoMode, InterpolationMode, Preset, CameraConfig, RigTemplate, SavedCamera, SceneConfig, AnimationPreset } from './types';
import { DEFAULT_CONFIG, INITIAL_TRANSFORMS, DEFAULT_PRESETS, DEFAULT_HIERARCHIES, RIG_PARTS, TEMPLATE_PARTS, INITIAL_REST_TRANSFORMS, ANIMATION_PRESETS } from './constants';
import { parseVoxFile, reprocessVoxels } from './services/voxParser';
import { exportCanvasToVideo } from './services/geminiService';
import VoxelModel from './components/VoxelModel';
import Sidebar from './components/Sidebar';
import Timeline from './components/Timeline';
import Toolbar from './components/Toolbar';
import GuideModal from './components/GuideModal';
import ExportModal from './components/ExportModal';
import RigNodeEditor from './components/RigNodeEditor';
import ViewSelector from './components/ViewSelector';

// Fix JSX intrinsic element errors by extending the global JSX namespace.
// This ensures that Three.js elements used in R3F (like <mesh />, <group />, etc.) 
// are recognized by the TypeScript compiler.
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      color: any;
    }
  }
}

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
  gridVisible: boolean,
  skeletonVisible: boolean
}> = ({ state, onGizmoChange, onGizmoStart, onGizmoEnd, cameraTrigger, pendingCamera, cameraStateRef, gridVisible, skeletonVisible }) => {
  const { scene, camera, gl } = useThree();
  const transformRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const selectedObject = useRef<THREE.Object3D | null>(null);

  const interpolatedConfig = useMemo(() => {
    if (state.keyframes.length === 0) return state.config;
    
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

    const pEnv = prev.environment;
    const nEnv = next.environment;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const lerpColor = (a: string, b: string, t: number) => {
      const c1 = new THREE.Color(a);
      const c2 = new THREE.Color(b);
      return `#${c1.lerp(c2, t).getHexString()}`;
    };

    return {
      ...state.config,
      exposure: lerp(pEnv.exposure, nEnv.exposure, t),
      bloom: lerp(pEnv.bloom, nEnv.bloom, t),
      aoIntensity: lerp(pEnv.aoIntensity, nEnv.aoIntensity, t),
      lightIntensity: lerp(pEnv.lightIntensity, nEnv.lightIntensity, t),
      lightColor: lerpColor(pEnv.lightColor, nEnv.lightColor, t),
      lightPosition: [
        lerp(pEnv.lightPosition[0], nEnv.lightPosition[0], t),
        lerp(pEnv.lightPosition[1], nEnv.lightPosition[1], t),
        lerp(pEnv.lightPosition[2], nEnv.lightPosition[2], t),
      ] as [number, number, number],
      saturation: lerp(pEnv.saturation, nEnv.saturation, t),
      contrast: lerp(pEnv.contrast, nEnv.contrast, t),
      hue: lerp(pEnv.hue, nEnv.hue, t),
      brightness: lerp(pEnv.brightness, nEnv.brightness, t),
      contactShadowOpacity: lerp(pEnv.contactShadowOpacity, nEnv.contactShadowOpacity, t),
      shadowSoftness: lerp(pEnv.shadowSoftness, nEnv.shadowSoftness, t),
    };
  }, [state.keyframes, state.currentTime, state.config]);

  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

  useEffect(() => {
    const isLocked = state.selectedPart ? state.lockedParts.includes(state.selectedPart) : false;
    const isHidden = state.selectedPart ? state.hiddenParts.includes(state.selectedPart) : false;

    if (state.selectedPart && !isLocked && !isHidden) {
      const obj = scene.getObjectByName(`part-${state.selectedPart}`);
      if (obj) {
        selectedObject.current = obj;
        transformRef.current?.attach(obj);
      }
    } else {
      selectedObject.current = null;
      transformRef.current?.detach();
    }
  }, [state.selectedPart, scene, state.voxels, state.activeParts, state.lockedParts, state.hiddenParts]);

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
    
    const rest = state.restTransforms[state.selectedPart];
    const deltaPos: [number, number, number] = [pos.x - rest.position[0], pos.y - rest.position[1], pos.z - rest.position[2]];
    const deltaRot: [number, number, number] = [rot.x - rest.rotation[0], rot.y - rest.rotation[1], rot.z - rest.rotation[2]];

    onGizmoChange(state.selectedPart, deltaPos, deltaRot);
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
      {state.selectedPart && !state.lockedParts.includes(state.selectedPart) && (
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
        <color attach="background" args={[interpolatedConfig.backgroundColor]} />
      )}
      <ambientLight intensity={0.2} />
      <spotLight 
        position={interpolatedConfig.lightPosition} 
        angle={0.15} 
        penumbra={1} 
        intensity={interpolatedConfig.lightIntensity} 
        color={interpolatedConfig.lightColor}
        castShadow={state.config.shadowsEnabled}
        shadow-mapSize-width={state.config.shadowResolution}
        shadow-mapSize-height={state.config.shadowResolution}
        shadow-radius={interpolatedConfig.shadowSoftness}
      />
      <directionalLight 
        position={[-10, 20, 10]} 
        intensity={0.5} 
      />
      
      {state.config.backgroundType === 'hdri' && (
        <Environment 
          preset={state.config.environmentPreset as any} 
          background={state.config.backgroundType === 'hdri'}
          blur={0}
        />
      )}

      <VoxelModel 
        voxels={state.voxels}
        keyframes={state.keyframes}
        currentTime={state.currentTime}
        partParents={state.partParents}
        restTransforms={state.restTransforms}
        castShadow={state.config.voxelsCastShadows}
        receiveShadow={state.config.voxelsReceiveShadows}
        hiddenParts={state.hiddenParts}
        activeParts={state.activeParts}
        selectedPart={state.selectedPart}
        showSkeleton={gridVisible && skeletonVisible}
        modelTransform={state.modelTransform}
      />

      {gridVisible && <gridHelper args={[100, 100, 0x444444, 0x222222]} position={[0, -0.01, 0]} />}
      
      <ContactShadows 
        position={[0, 0, 0]} 
        opacity={interpolatedConfig.contactShadowOpacity} 
        scale={100} 
        blur={2} 
        far={10} 
      />

      <EffectComposer>
        <N8AO intensity={interpolatedConfig.aoIntensity} aoRadius={5} distanceFalloff={1} />
        <Bloom luminanceThreshold={1} luminanceSmoothing={0.9} intensity={interpolatedConfig.bloom} />
        <HueSaturation hue={interpolatedConfig.hue} saturation={interpolatedConfig.saturation} />
        <BrightnessContrast brightness={interpolatedConfig.brightness} contrast={interpolatedConfig.contrast} />
        <ToneMapping exposure={interpolatedConfig.exposure} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    voxels: [],
    keyframes: [{
      time: 0,
      interpolation: InterpolationMode.LINEAR,
      transforms: { ...INITIAL_TRANSFORMS },
      environment: { ...DEFAULT_CONFIG }
    }],
    currentTime: 0,
    isPlaying: false,
    selectedPart: null,
    config: { ...DEFAULT_CONFIG },
    gizmoMode: 'translate',
    presets: DEFAULT_PRESETS,
    rigTemplate: RigTemplate.HUMANOID,
    autoKeyframe: true,
    savedCameras: [],
    partParents: { ...DEFAULT_HIERARCHIES[RigTemplate.HUMANOID] },
    activeParts: [...TEMPLATE_PARTS[RigTemplate.HUMANOID]],
    restTransforms: { ...INITIAL_REST_TRANSFORMS },
    hiddenParts: [],
    lockedParts: [],
    savedRigTemplates: [],
    modelTransform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 0.5
    }
  });

  const [history, setHistory] = useState<AppState[]>([]);
  const [redoStack, setRedoStack] = useState<AppState[]>([]);
  const [activePanel, setActivePanel] = useState<'anim' | 'rig' | 'layers' | 'scene' | null>('anim');
  const [gridVisible, setGridVisible] = useState(true);
  const [skeletonVisible, setSkeletonVisible] = useState(true);
  const [cameraTrigger, setCameraTrigger] = useState(0);
  const [pendingCamera, setPendingCamera] = useState<CameraConfig | null>(null);
  const cameraStateRef = useRef<CameraConfig | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showRigEditor, setShowRigEditor] = useState(false);
  const [exportConfig, setExportConfig] = useState<{ resolution: '720p' | '1080p'; aspectRatio: '16:9' | '9:16' }>({
    resolution: '720p',
    aspectRatio: '16:9'
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const pushHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-49), JSON.parse(JSON.stringify(state))]);
    setRedoStack([]);
  }, [state]);

  const handleUndo = useCallback(() => {
    setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      const last = prevHistory[prevHistory.length - 1];
      setRedoStack(rs => [...rs, JSON.parse(JSON.stringify(state))]);
      setState(last);
      return prevHistory.slice(0, -1);
    });
  }, [state]);

  const handleRedo = useCallback(() => {
    setRedoStack(prevRedo => {
      if (prevRedo.length === 0) return prevRedo;
      const next = prevRedo[prevRedo.length - 1];
      setHistory(h => [...h, JSON.parse(JSON.stringify(state))]);
      setState(next);
      return prevRedo.slice(0, -1);
    });
  }, [state]);

  const handleTakeSnapshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `voxaura_snapshot_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'g' || e.key === 'G') {
        setGridVisible(v => !v);
      } else if (e.key === 's' || e.key === 'S') {
        handleTakeSnapshot();
      } else if (e.key === '?') {
        setShowGuide(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleTakeSnapshot]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | File, merge: boolean = false) => {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (!file) return;
    pushHistory();
    const buffer = await file.arrayBuffer();
    const newVoxels = await parseVoxFile(buffer, state.rigTemplate);
    
    if (merge) {
      setState(s => ({ ...s, voxels: [...s.voxels, ...newVoxels] }));
    } else {
      setState(s => ({ ...s, voxels: newVoxels }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.vox')) {
      handleFileUpload(file);
    }
  };

  const handleGizmoChange = (part: RigPart, position: [number, number, number], rotation: [number, number, number]) => {
    if (state.autoKeyframe) {
      updateKeyframeAtCurrentTime(part, position, rotation);
    }
  };

  const updateKeyframeAtCurrentTime = (part: RigPart, position: [number, number, number], rotation: [number, number, number]) => {
    setState(s => {
      const keyframes = [...s.keyframes];
      let idx = keyframes.findIndex(k => Math.abs(k.time - s.currentTime) < 0.001);
      
      if (idx === -1) {
        const prevK = keyframes.reduce((pk, ck) => (ck.time <= s.currentTime) ? ck : pk, keyframes[0]);
        const newK: Keyframe = {
          time: s.currentTime,
          interpolation: prevK.interpolation,
          transforms: JSON.parse(JSON.stringify(prevK.transforms)),
          environment: JSON.parse(JSON.stringify(s.config))
        };
        newK.transforms[part] = { position, rotation };
        keyframes.push(newK);
        keyframes.sort((a, b) => a.time - b.time);
      } else {
        keyframes[idx].transforms[part] = { position, rotation };
        keyframes[idx].environment = JSON.parse(JSON.stringify(s.config));
      }
      return { ...s, keyframes };
    });
  };

  const handleAddKeyframe = () => {
    pushHistory();
    setState(s => {
      const keyframes = [...s.keyframes];
      const idx = keyframes.findIndex(k => Math.abs(k.time - s.currentTime) < 0.001);
      if (idx !== -1) return s;

      const prevK = keyframes.reduce((pk, ck) => (ck.time <= s.currentTime) ? ck : pk, keyframes[0]);
      keyframes.push({
        time: s.currentTime,
        interpolation: prevK.interpolation,
        transforms: JSON.parse(JSON.stringify(prevK.transforms)),
        environment: JSON.parse(JSON.stringify(s.config))
      });
      keyframes.sort((a, b) => a.time - b.time);
      return { ...s, keyframes };
    });
  };

  const handleMoveKeyframe = (index: number, newTime: number) => {
    setState(s => {
      const keyframes = [...s.keyframes];
      if (index === 0 && newTime !== 0) return s; // Keep first keyframe at 0
      
      keyframes[index].time = Math.max(0, Math.min(1, newTime));
      keyframes.sort((a, b) => a.time - b.time);
      return { ...s, keyframes };
    });
  };

  const handleSetCurrentAsRest = () => {
    if (!state.selectedPart) return;
    pushHistory();
    setState(s => {
      const part = s.selectedPart!;
      const currentK = s.keyframes.reduce((pk, ck) => (s.currentTime >= ck.time) ? ck : pk, s.keyframes[0]);
      const animatedTransform = currentK.transforms[part];
      
      const nextRest = JSON.parse(JSON.stringify(s.restTransforms));
      nextRest[part].position = [
        nextRest[part].position[0] + animatedTransform.position[0],
        nextRest[part].position[1] + animatedTransform.position[1],
        nextRest[part].position[2] + animatedTransform.position[2]
      ];
      nextRest[part].rotation = [
        nextRest[part].rotation[0] + animatedTransform.rotation[0],
        nextRest[part].rotation[1] + animatedTransform.rotation[1],
        nextRest[part].rotation[2] + animatedTransform.rotation[2]
      ];

      // Reset animated delta for this part in all keyframes to maintain visual pose
      const nextKeyframes = s.keyframes.map(k => ({
        ...k,
        transforms: {
          ...k.transforms,
          [part]: { position: [0, 0, 0], rotation: [0, 0, 0] }
        }
      }));

      return { ...s, restTransforms: nextRest, keyframes: nextKeyframes };
    });
  };

  const handleResetRestPose = () => {
    if (!state.selectedPart) return;
    pushHistory();
    setState(s => {
      const nextRest = JSON.parse(JSON.stringify(s.restTransforms));
      nextRest[s.selectedPart!] = { position: [0, 0, 0], rotation: [0, 0, 0] };
      return { ...s, restTransforms: nextRest };
    });
  };

  const handleSaveRigTemplate = (name: string) => {
    setState(s => ({
      ...s,
      savedRigTemplates: [
        ...s.savedRigTemplates,
        {
          id: Date.now().toString(),
          name,
          template: s.rigTemplate,
          partParents: JSON.parse(JSON.stringify(s.partParents)),
          activeParts: [...s.activeParts],
          restTransforms: JSON.parse(JSON.stringify(s.restTransforms)),
        }
      ]
    }));
  };

  const handleLoadRigTemplate = (id: string) => {
    const template = state.savedRigTemplates.find(t => t.id === id);
    if (template) {
      pushHistory();
      setState(s => ({
        ...s,
        rigTemplate: template.template,
        partParents: JSON.parse(JSON.stringify(template.partParents)),
        activeParts: [...template.activeParts],
        restTransforms: JSON.parse(JSON.stringify(template.restTransforms)),
        voxels: reprocessVoxels(s.voxels, template.template)
      }));
    }
  };

  const handleDeleteRigTemplate = (id: string) => {
    setState(s => ({
      ...s,
      savedRigTemplates: s.savedRigTemplates.filter(t => t.id !== id)
    }));
  };

  const togglePartVisibility = (part: RigPart) => {
    setState(s => ({
      ...s,
      hiddenParts: s.hiddenParts.includes(part) 
        ? s.hiddenParts.filter(p => p !== part) 
        : [...s.hiddenParts, part]
    }));
  };

  const togglePartLock = (part: RigPart) => {
    setState(s => ({
      ...s,
      lockedParts: s.lockedParts.includes(part) 
        ? s.lockedParts.filter(p => p !== part) 
        : [...s.lockedParts, part]
    }));
  };

  return (
    <div 
      className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden font-sans"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-[300] bg-indigo-600/20 backdrop-blur-sm border-4 border-dashed border-indigo-500 flex items-center justify-center pointer-events-none animate-in fade-in duration-200">
          <div className="bg-neutral-900 p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-500/40">
              <i className="fas fa-file-import"></i>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-black uppercase tracking-widest">Drop to Import</h2>
              <p className="text-sm text-white/40">MagicaVoxel .VOX file</p>
            </div>
          </div>
        </div>
      )}
      <Toolbar 
        activePanel={activePanel}
        onTogglePanel={(p) => setActivePanel(activePanel === p ? null : p)}
        canUndo={history.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onTakeSnapshot={handleTakeSnapshot}
        gridVisible={gridVisible}
        onToggleGrid={() => setGridVisible(!gridVisible)}
        skeletonVisible={skeletonVisible}
        onToggleSkeleton={() => setSkeletonVisible(!skeletonVisible)}
        onShowGuide={() => setShowGuide(true)}
        onOpenExport={() => setShowExportModal(true)}
        onSaveProject={() => {
          const data = JSON.stringify(state);
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `project_${Date.now()}.json`;
          a.click();
        }}
        onLoadProject={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          setState(JSON.parse(text));
        }}
        onFileUpload={handleFileUpload}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar 
          state={state}
          activePanel={activePanel}
          canUndo={history.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onUpdateConfig={(u) => {
            setState(s => {
              const nextConfig = { ...s.config, ...u };
              const keyframes = [...s.keyframes];
              if (s.autoKeyframe) {
                let idx = keyframes.findIndex(k => Math.abs(k.time - s.currentTime) < 0.001);
                if (idx === -1) {
                  const prevK = keyframes.reduce((pk, ck) => (ck.time <= s.currentTime) ? ck : pk, keyframes[0]);
                  const newK: Keyframe = {
                    time: s.currentTime,
                    interpolation: prevK.interpolation,
                    transforms: JSON.parse(JSON.stringify(prevK.transforms)),
                    environment: nextConfig
                  };
                  keyframes.push(newK);
                  keyframes.sort((a, b) => a.time - b.time);
                } else {
                  keyframes[idx].environment = nextConfig;
                }
              }
              return { ...s, config: nextConfig, keyframes };
            });
          }}
          onUpdateModelTransform={(u) => setState(s => ({ ...s, modelTransform: { ...s.modelTransform, ...u } }))}
          onConfigInteractionStart={pushHistory}
          onFileUpload={(e) => handleFileUpload(e, false)}
          onFileMerge={(e) => handleFileUpload(e, true)}
          onSelectPart={(p) => setState(s => ({ ...s, selectedPart: p }))}
          onUpdateTransform={(part, type, i, val) => {
            const currentK = state.keyframes.reduce((pk, ck) => (state.currentTime >= ck.time) ? ck : pk, state.keyframes[0]);
            const nextVal = [...currentK.transforms[part][type]] as [number, number, number];
            nextVal[i] = val;
            updateKeyframeAtCurrentTime(part, 
              type === 'position' ? nextVal : currentK.transforms[part].position,
              type === 'rotation' ? nextVal : currentK.transforms[part].rotation
            );
          }}
          onUpdateRestTransform={(part, type, i, val) => {
            setState(s => {
              const nextRest = JSON.parse(JSON.stringify(s.restTransforms));
              nextRest[part][type][i] = val;
              return { ...s, restTransforms: nextRest };
            });
          }}
          onTransformInteractionStart={pushHistory}
          onSetGizmoMode={(m) => setState(s => ({ ...s, gizmoMode: m }))}
          onUpdateInterpolation={(mode) => setState(s => {
            const kfs = [...s.keyframes];
            const idx = kfs.findIndex(k => Math.abs(k.time - s.currentTime) < 0.001);
            if (idx !== -1) kfs[idx].interpolation = mode;
            return { ...s, keyframes: kfs };
          })}
          onUpdateRigTemplate={(t) => {
            pushHistory();
            setState(s => ({
              ...s,
              rigTemplate: t,
              activeParts: [...TEMPLATE_PARTS[t]],
              partParents: { ...DEFAULT_HIERARCHIES[t] },
              voxels: reprocessVoxels(s.voxels, t)
            }));
          }}
          onUpdateAutoKeyframe={(a) => setState(s => ({ ...s, autoKeyframe: a }))}
          onUpdatePartParent={(part, parent) => setState(s => ({ ...s, partParents: { ...s.partParents, [part]: parent } }))}
          onSetCurrentAsRest={handleSetCurrentAsRest}
          onResetRestPose={handleResetRestPose}
          onAddBone={(p) => setState(s => ({ ...s, activeParts: [...s.activeParts, p] }))}
          onRemoveBone={(p) => setState(s => ({ ...s, activeParts: s.activeParts.filter(x => x !== p) }))}
          onApplyAnimationPreset={(p) => {
            pushHistory();
            setState(s => ({ ...s, keyframes: p.keyframes as any }));
          }}
          onApplyPreset={(p) => {
            pushHistory();
            setState(s => ({ ...s, config: p.config }));
            setPendingCamera(p.camera);
            setCameraTrigger(prev => prev + 1);
          }}
          onSavePreset={() => {}}
          onSaveCamera={() => {
            if (cameraStateRef.current) {
              const name = prompt("Camera Name:", `View ${state.savedCameras.length + 1}`);
              if (name) {
                setState(s => ({
                  ...s,
                  savedCameras: [...s.savedCameras, { id: Date.now().toString(), name, config: cameraStateRef.current! }]
                }));
              }
            }
          }}
          onUpdateCamera={() => {}}
          onDeleteCamera={(id) => setState(s => ({ ...s, savedCameras: s.savedCameras.filter(c => c.id !== id) }))}
          onSwitchCamera={(c) => {
            setPendingCamera(c);
            setCameraTrigger(prev => prev + 1);
          }}
          onSaveProject={() => {
            const data = JSON.stringify(state);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `project_${Date.now()}.json`;
            a.click();
          }}
          onLoadProject={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            setState(JSON.parse(text));
          }}
          onTogglePartVisibility={togglePartVisibility}
          onTogglePartLock={togglePartLock}
          onOpenRigEditor={() => setShowRigEditor(true)}
          onSaveRigTemplate={handleSaveRigTemplate}
          onLoadRigTemplate={handleLoadRigTemplate}
          onDeleteRigTemplate={handleDeleteRigTemplate}
        />

        <main className="flex-1 relative bg-[#050505]">
          <Canvas shadows className="w-full h-full">
            <SceneContent 
              state={state}
              gridVisible={gridVisible}
              skeletonVisible={skeletonVisible}
              onGizmoChange={handleGizmoChange}
              onGizmoStart={pushHistory}
              onGizmoEnd={() => {}}
              cameraTrigger={cameraTrigger}
              pendingCamera={pendingCamera}
              cameraStateRef={cameraStateRef}
            />
          </Canvas>

          <ViewSelector 
            onSetView={(c) => {
              setPendingCamera(c);
              setCameraTrigger(prev => prev + 1);
            }}
          />

          <Timeline 
            currentTime={state.currentTime}
            keyframes={state.keyframes}
            isPlaying={state.isPlaying}
            onTimeChange={(t) => setState(s => ({ ...s, currentTime: t }))}
            onTogglePlay={() => setState(s => ({ ...s, isPlaying: !s.isPlaying }))}
            onAddKeyframe={handleAddKeyframe}
            onMoveKeyframe={handleMoveKeyframe}
          />
        </main>
      </div>

      {showGuide && (
        <GuideModal onClose={() => setShowGuide(false)} />
      )}

      {isExporting && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold tracking-tighter uppercase">Recording Animation</h2>
            <p className="text-sm text-white/40 max-w-xs mx-auto">Capturing your viewport. Please do not move the camera or close the window.</p>
          </div>
        </div>
      )}

      {showExportModal && (
        <ExportModal 
          config={exportConfig}
          onUpdateConfig={setExportConfig}
          onClose={() => setShowExportModal(false)}
          onConfirm={async () => {
            setShowExportModal(false);
            setIsExporting(true);
            
            // Store current state to restore later
            const prevGrid = gridVisible;
            const prevSkeleton = skeletonVisible;
            const prevSelectedPart = state.selectedPart;
            const prevIsPlaying = state.isPlaying;
            const prevTime = state.currentTime;

            // Hide UI elements and prepare for recording
            setGridVisible(false);
            setSkeletonVisible(false);
            setState(s => ({ 
              ...s, 
              selectedPart: null,
              isPlaying: true,
              currentTime: 0
            }));

            // Wait for state changes to propagate to the canvas
            await new Promise(resolve => setTimeout(resolve, 200));

            try {
              const canvas = document.querySelector('canvas');
              if (!canvas) throw new Error("Canvas not found");
              
              // Record for 5 seconds
              const videoUrl = await exportCanvasToVideo(canvas, 5);
              if (videoUrl) {
                const link = document.createElement('a');
                link.href = videoUrl;
                link.download = `voxaura_export_${Date.now()}.webm`;
                link.click();
              }
            } catch (err) {
              console.error("Export error:", err);
              alert("Export failed. Please try again.");
            } finally {
              setIsExporting(false);
              // Restore previous state
              setGridVisible(prevGrid);
              setSkeletonVisible(prevSkeleton);
              setState(s => ({ 
                ...s, 
                selectedPart: prevSelectedPart,
                isPlaying: prevIsPlaying,
                currentTime: prevTime
              }));
            }
          }}
        />
      )}

      {showRigEditor && (
        <RigNodeEditor 
          state={state}
          onClose={() => setShowRigEditor(false)}
          onUpdatePartParent={(part, parent) => setState(s => ({ ...s, partParents: { ...s.partParents, [part]: parent } }))}
          onSelectPart={(p) => setState(s => ({ ...s, selectedPart: p }))}
          onAddBone={(p) => setState(s => ({ ...s, activeParts: [...s.activeParts, p] }))}
          onRemoveBone={(p) => setState(s => ({ ...s, activeParts: s.activeParts.filter(x => x !== p) }))}
        />
      )}
    </div>
  );
};

export default App;
