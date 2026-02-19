
export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: string;
  part?: RigPart;
}

export enum RigPart {
  ROOT = 'ROOT',
  // Humanoid
  HEAD = 'HEAD',
  BODY = 'BODY',
  ARM_L = 'ARM_L',
  ARM_R = 'ARM_R',
  LEG_L = 'LEG_L',
  LEG_R = 'LEG_R',
  // Quadruped / Animal
  NECK = 'NECK',
  TAIL = 'TAIL',
  LEG_FL = 'LEG_FL',
  LEG_FR = 'LEG_FR',
  LEG_BL = 'LEG_BL',
  LEG_BR = 'LEG_BR',
  // Generic / Abstract
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
  P5 = 'P5',
  P6 = 'P6',
  P7 = 'P7',
  P8 = 'P8',
}

export enum RigTemplate {
  HUMANOID = 'HUMANOID',
  QUADRUPED = 'QUADRUPED',
  GENERIC = 'GENERIC',
  CUSTOM = 'CUSTOM',
}

export enum InterpolationMode {
  LINEAR = 'LINEAR',
  STEP = 'STEP',
  BEZIER = 'BEZIER',
}

export interface SceneConfig {
  exposure: number;
  bloom: number;
  aoIntensity: number;
  lightIntensity: number;
  lightColor: string;
  backgroundColor: string;
  // Environment Mapping
  backgroundType: 'color' | 'hdri';
  environmentPreset: string;
  environmentUrl?: string;
  environmentIntensity: number;
  environmentRotation: number;
  // Shadow Controls
  shadowsEnabled: boolean;
  shadowSoftness: number;
  shadowResolution: number;
  voxelsCastShadows: boolean;
  voxelsReceiveShadows: boolean;
  contactShadowOpacity: number;
}

export interface Keyframe {
  time: number;
  interpolation: InterpolationMode;
  transforms: Record<RigPart, {
    position: [number, number, number];
    rotation: [number, number, number];
  }>;
  environment: SceneConfig;
}

export interface CameraConfig {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface SavedCamera {
  id: string;
  name: string;
  config: CameraConfig;
}

export interface Preset {
  id: string;
  name: string;
  config: SceneConfig;
  camera: CameraConfig;
}

export interface AnimationPreset {
  id: string;
  name: string;
  icon: string;
  keyframes: Pick<Keyframe, 'time' | 'interpolation' | 'transforms'>[];
}

export type GizmoMode = 'translate' | 'rotate';

export interface AppState {
  voxels: VoxelData[];
  keyframes: Keyframe[];
  currentTime: number;
  isPlaying: boolean;
  selectedPart: RigPart | null;
  config: SceneConfig;
  gizmoMode: GizmoMode;
  presets: Preset[];
  rigTemplate: RigTemplate;
  autoKeyframe: boolean;
  savedCameras: SavedCamera[];
  partParents: Record<RigPart, RigPart | null>;
  // New Rigging Props
  activeParts: RigPart[];
  restTransforms: Record<RigPart, {
    position: [number, number, number];
    rotation: [number, number, number];
  }>;
}
