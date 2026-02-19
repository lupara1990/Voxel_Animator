
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
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
  onUpdateActiveConfig: (config: SceneConfig) => void,
  gridVisible: boolean
}> = ({ state, onGizmoChange, onGizmoStart, onGizmoEnd, cameraTrigger, pendingCamera, cameraStateRef, onUpdateActiveConfig, gridVisible }) => {
  const { scene, camera, gl } = useThree();
  const transformRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const selectedObject = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

  useFrame(() => {
    if (state.keyframes.length === 0 || !state.isPlaying) return;
    
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
      aoIntensity: THREE.MathUtils.lerp(prev.environment.aoIntensity, next.environment.aoIntensity, t),
      lightIntensity: THREE.MathUtils.lerp(prev.environment.lightIntensity, next.environment.lightIntensity, t),
      lightColor: lerpColor(prev.environment.lightColor, next.environment.lightColor, t),
      backgroundColor: lerpColor(prev.environment.backgroundColor, next.environment.backgroundColor, t),
      backgroundType: t < 0.5 ? prev.environment.backgroundType : next.environment.backgroundType,
      environmentPreset: t < 0.5 ? prev.environment.environmentPreset : next.environment.environmentPreset,
      environmentUrl: t < 0.5 ? prev.environment.environmentUrl : next.environment.environmentUrl,
      environmentIntensity: THREE.MathUtils.lerp(prev.environment.environmentIntensity, next.environment.environmentIntensity, t),
      environmentRotation: THREE.MathUtils.lerp(prev.environment.environmentRotation, next.environment.environmentRotation, t),
      shadowsEnabled: t < 0.5 ? prev.environment.shadowsEnabled : next.environment.shadowsEnabled,
      shadowSoftness: THREE.MathUtils.lerp(prev.environment.shadowSoftness, next.environment.shadowSoftness, t),
      shadowResolution: t < 0.5 ? prev.environment.shadowResolution : next.environment.shadowResolution,
      voxelsCastShadows: t < 0.5 ? prev.environment.voxelsCastShadows : next.environment.voxelsCastShadows,
      voxelsReceiveShadows: t < 0.5 ? prev.environment.voxelsReceiveShadows : next.environment.voxelsReceiveShadows,
      contactShadowOpacity: THREE.MathUtils.lerp(prev.environment.contactShadowOpacity, next.environment.contactShadowOpacity, t),
    };

    onUpdateActiveConfig(interpConfig);
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
  }, [state.selectedPart, scene, state.voxels, state.activeParts]);

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
        castShadow={state.config.shadowsEnabled}
        shadow-mapSize-width={state.config.shadowResolution}
        shadow-mapSize-height={state.config.shadowResolution}
        shadow-radius={state.config.shadowSoftness}
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
      />

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
    restTransforms: { ...INITIAL_REST_TRANSFORMS }
  });

  const [history, setHistory] = useState<AppState[]>([]);
  const [redoStack, setRedoStack] = useState<AppState[]>([]);
  const [uiVisible, setUiVisible] = useState(true);
  const [gridVisible, setGridVisible] = useState(true);
  const [cameraTrigger, setCameraTrigger] = useState(0);
  const [pendingCamera, setPendingCamera] = useState<CameraConfig | null>(null);
  const cameraStateRef = useRef<CameraConfig | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
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
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setUiVisible(v => !v);
      } else if (e.key === 's' || e.key === 'S') {
        handleTakeSnapshot();
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

  return (
    <div className="fixed inset-0 bg-black text-white flex overflow-hidden font-sans">
      {uiVisible && (
        <Sidebar 
          state={state}
          canUndo={history.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onUpdateConfig={(u) => setState(s => ({ ...s, config: { ...s.config, ...u } }))}
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
        />
      )}

      <main className="flex-1 relative bg-[#050505]">
        <Toolbar 
          uiVisible={uiVisible}
          onToggleUI={() => setUiVisible(!uiVisible)}
          canUndo={history.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onTakeSnapshot={handleTakeSnapshot}
          gridVisible={gridVisible}
          onToggleGrid={() => setGridVisible(!gridVisible)}
        />
        
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
            onUpdateActiveConfig={(c) => {
              if (state.isPlaying) {
                setState(s => ({ ...s, config: c }));
              }
            }}
          />
        </Canvas>

        {uiVisible && (
          <Timeline 
            currentTime={state.currentTime}
            keyframes={state.keyframes}
            isPlaying={state.isPlaying}
            onTimeChange={(t) => setState(s => ({ ...s, currentTime: t }))}
            onTogglePlay={() => setState(s => ({ ...s, isPlaying: !s.isPlaying }))}
            onAddKeyframe={handleAddKeyframe}
          />
        )}
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
    </div>
  );
};

export default App;
