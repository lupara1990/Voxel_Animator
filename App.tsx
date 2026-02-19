
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas, useThree, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Environment, TransformControls } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping, Vignette, N8AO } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AppState, RigPart, VoxelData, Keyframe, GizmoMode, InterpolationMode, Preset, CameraConfig, RigTemplate, SavedCamera, SceneConfig, AnimationPreset } from './types';
import { DEFAULT_CONFIG, INITIAL_TRANSFORMS, DEFAULT_PRESETS, DEFAULT_HIERARCHIES, RIG_PARTS, TEMPLATE_PARTS, INITIAL_REST_TRANSFORMS, ANIMATION_PRESETS } from './constants';
import { parseVoxFile, reprocessVoxels } from './services/voxParser';
import { generateVoxAnimationVideo } from './services/geminiService';
import VoxelModel from './components/VoxelModel';
import Sidebar from './components/Sidebar';
import Timeline from './components/Timeline';
import Toolbar from './components/Toolbar';
import ExportModal from './components/ExportModal';
import GuideModal from './components/GuideModal';

// Fix JSX intrinsic element errors by extending the global JSX and React.JSX namespaces with Three.js elements
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
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
  gridVisible: boolean
}> = ({ state, onGizmoChange, onGizmoStart, onGizmoEnd, cameraTrigger, pendingCamera, cameraStateRef, gridVisible }) => {
  const { scene, camera, gl } = useThree();
  const transformRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const selectedObject = useRef<THREE.Object3D | null>(null);

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
        // Added fix for intrinsic color element
        <color attach="background" args={[state.config.backgroundColor]} />
      )}
      {/* Added fix for intrinsic ambientLight element */}
      <ambientLight intensity={0.2} />
      {/* Added fix for intrinsic spotLight element */}
      <spotLight 
        position={[50, 100, 50]} 
        angle={0.15} 
        penumbra={1} 
        intensity={state.config.lightIntensity} 
        castShadow={state.config.shadowsEnabled}
        shadow-mapSize-width={state.config.shadowResolution}
        shadow-mapSize-height={state.config.shadowResolution}
        shadow-radius={state.config.shadowSoftness}
      />
      {/* Added fix for intrinsic directionalLight element */}
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
        modelTransform={state.modelTransform}
      />

      {/* Added fix for intrinsic gridHelper element */}
      {gridVisible && <gridHelper args={[100, 100, 0x444444, 0x222222]} position={[0, -0.01, 0]} />}
      
      <ContactShadows 
        position={[0, 0, 0]} 
        opacity={state.config.contactShadowOpacity} 
        scale={100} 
        blur={2} 
        far={10} 
      />

      <EffectComposer>
        <N8AO intensity={state.config.aoIntensity} aoRadius={5} distanceFalloff={1} />
        <Bloom luminanceThreshold={1} luminanceSmoothing={0.9} intensity={state.config.bloom} />
        <ToneMapping exposure={state.config.exposure} />
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
  const [cameraTrigger, setCameraTrigger] = useState(0);
  const [pendingCamera, setPendingCamera] = useState<CameraConfig | null>(null);
  const cameraStateRef = useRef<CameraConfig | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [exportConfig, setExportConfig] = useState<{ resolution: '720p' | '1080p'; aspectRatio: '16:9' | '9:16' }>({
    resolution: '1080p',
    aspectRatio: '16:9'
  });
  const [hasApiKey, setHasApiKey] = useState(false);

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

  useEffect(() => {
    const checkKey = async () => {
      if (typeof (window as any).aistudio !== 'undefined') {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleOpenSelectKey = async () => {
    if (typeof (window as any).aistudio !== 'undefined') {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    pushHistory();
    const buffer = await file.arrayBuffer();
    const voxels = await parseVoxFile(buffer, state.rigTemplate);
    setState(s => ({ ...s, voxels }));
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

  const handleConfirmExport = async (prompt: string) => {
    setShowExportModal(false);
    if (!hasApiKey) await handleOpenSelectKey();

    setIsRecording(true);
    const canvas = document.querySelector('canvas');
    const base64Image = canvas?.toDataURL('image/png') || '';

    try {
      const videoUrl = await generateVoxAnimationVideo(prompt, base64Image, exportConfig.resolution, exportConfig.aspectRatio);
      if (videoUrl) {
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = `voxaura_${Date.now()}.mp4`;
        link.click();
      }
    } catch (error: any) {
      if (error.message === 'RESELECT_KEY') await handleOpenSelectKey();
      else alert("Render failed. Please check your API key and connection.");
    } finally {
      setIsRecording(false);
    }
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
    <div className="fixed inset-0 bg-black text-white flex overflow-hidden font-sans">
      <Sidebar 
        state={state}
        activePanel={activePanel}
        canUndo={history.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onUpdateConfig={(u) => setState(s => ({ ...s, config: { ...s.config, ...u } }))}
        onUpdateModelTransform={(u) => setState(s => ({ ...s, modelTransform: { ...s.modelTransform, ...u } }))}
        onConfigInteractionStart={pushHistory}
        onFileUpload={handleFileUpload}
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
        onLocalRecord={() => setShowExportModal(true)}
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
        isRecording={isRecording}
        onTogglePartVisibility={togglePartVisibility}
        onTogglePartLock={togglePartLock}
      />

      <main className="flex-1 relative bg-[#050505]">
        <Canvas shadows className="w-full h-full">
          <SceneContent 
            state={state}
            gridVisible={gridVisible}
            onGizmoChange={handleGizmoChange}
            onGizmoStart={pushHistory}
            onGizmoEnd={() => {}}
            cameraTrigger={cameraTrigger}
            pendingCamera={pendingCamera}
            cameraStateRef={cameraStateRef}
          />
        </Canvas>

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
          onShowGuide={() => setShowGuide(true)}
          onLocalRecord={() => setShowExportModal(true)}
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

      {showExportModal && (
        <ExportModal 
          config={exportConfig}
          onUpdateConfig={setExportConfig}
          onClose={() => setShowExportModal(false)}
          onConfirm={handleConfirmExport}
          defaultPrompt={state.rigTemplate === RigTemplate.HUMANOID ? "a humanoid robot performing a graceful dance" : "a majestic voxel creature moving through a digital void"}
        />
      )}

      {showGuide && (
        <GuideModal onClose={() => setShowGuide(false)} />
      )}
    </div>
  );
};

export default App;
