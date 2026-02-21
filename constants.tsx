
import { RigPart, SceneConfig, Preset, RigTemplate, AnimationPreset, InterpolationMode } from './types';

export const DEFAULT_CONFIG: SceneConfig = {
  exposure: 1.2,
  bloom: 0.5,
  aoIntensity: 1.0,
  lightIntensity: 1.5,
  lightColor: '#ffffff',
  lightPosition: [20, 50, 20],
  backgroundColor: '#0a0a0a',
  backgroundType: 'color',
  environmentPreset: 'city',
  environmentIntensity: 1.0,
  environmentRotation: 0,
  shadowsEnabled: true,
  shadowSoftness: 5.0,
  shadowResolution: 1024,
  voxelsCastShadows: true,
  voxelsReceiveShadows: true,
  contactShadowOpacity: 0.6,
  saturation: 0,
  contrast: 0,
  hue: 0,
  brightness: 0,
};

export const HDRI_PRESETS = [
  'city', 'apartment', 'studio', 'forest', 'sunset', 'night', 'warehouse', 'lobby'
];

export const RIG_PARTS = Object.values(RigPart);

export const INITIAL_TRANSFORMS: Record<RigPart, { position: [number, number, number]; rotation: [number, number, number] }> = RIG_PARTS.reduce((acc, part) => {
  acc[part] = { position: [0, 0, 0], rotation: [0, 0, 0] };
  return acc;
}, {} as any);

export const INITIAL_REST_TRANSFORMS: Record<RigPart, { position: [number, number, number]; rotation: [number, number, number] }> = RIG_PARTS.reduce((acc, part) => {
  acc[part] = { position: [0, 0, 0], rotation: [0, 0, 0] };
  return acc;
}, {} as any);

export const TEMPLATE_PARTS: Record<RigTemplate, RigPart[]> = {
  [RigTemplate.HUMANOID]: [RigPart.ROOT, RigPart.HEAD, RigPart.BODY, RigPart.ARM_L, RigPart.ARM_R, RigPart.LEG_L, RigPart.LEG_R],
  [RigTemplate.QUADRUPED]: [RigPart.ROOT, RigPart.HEAD, RigPart.NECK, RigPart.BODY, RigPart.TAIL, RigPart.LEG_FL, RigPart.LEG_FR, RigPart.LEG_BL, RigPart.LEG_BR],
  [RigTemplate.SPIDER]: [RigPart.ROOT, RigPart.BODY, RigPart.HEAD, RigPart.LEG_1L, RigPart.LEG_1R, RigPart.LEG_2L, RigPart.LEG_2R, RigPart.LEG_3L, RigPart.LEG_3R, RigPart.LEG_4L, RigPart.LEG_4R],
  [RigTemplate.BIRD]: [RigPart.ROOT, RigPart.BODY, RigPart.HEAD, RigPart.NECK, RigPart.WING_L, RigPart.WING_R, RigPart.TAIL, RigPart.LEG_L, RigPart.LEG_R],
  [RigTemplate.VEHICLE]: [RigPart.ROOT, RigPart.BODY, RigPart.WHEEL_FL, RigPart.WHEEL_FR, RigPart.WHEEL_BL, RigPart.WHEEL_BR],
  [RigTemplate.GENERIC]: [RigPart.ROOT, RigPart.P1, RigPart.P2, RigPart.P3, RigPart.P4, RigPart.P5, RigPart.P6, RigPart.P7, RigPart.P8],
  [RigTemplate.CUSTOM]: [RigPart.ROOT],
};

export const DEFAULT_HIERARCHIES: Record<RigTemplate, Record<RigPart, RigPart | null>> = {
  [RigTemplate.HUMANOID]: RIG_PARTS.reduce((acc, part) => {
    if (part === RigPart.BODY) acc[part] = RigPart.ROOT;
    else if ([RigPart.HEAD, RigPart.ARM_L, RigPart.ARM_R, RigPart.LEG_L, RigPart.LEG_R].includes(part)) acc[part] = RigPart.BODY;
    else acc[part] = null;
    return acc;
  }, {} as any),
  [RigTemplate.QUADRUPED]: RIG_PARTS.reduce((acc, part) => {
    if (part === RigPart.BODY) acc[part] = RigPart.ROOT;
    else if (part === RigPart.NECK) acc[part] = RigPart.BODY;
    else if (part === RigPart.HEAD) acc[part] = RigPart.NECK;
    else if ([RigPart.TAIL, RigPart.LEG_FL, RigPart.LEG_FR, RigPart.LEG_BL, RigPart.LEG_BR].includes(part)) acc[part] = RigPart.BODY;
    else acc[part] = null;
    return acc;
  }, {} as any),
  [RigTemplate.SPIDER]: RIG_PARTS.reduce((acc, part) => {
    if (part === RigPart.BODY) acc[part] = RigPart.ROOT;
    else if (part === RigPart.HEAD) acc[part] = RigPart.BODY;
    else if ([RigPart.LEG_1L, RigPart.LEG_1R, RigPart.LEG_2L, RigPart.LEG_2R, RigPart.LEG_3L, RigPart.LEG_3R, RigPart.LEG_4L, RigPart.LEG_4R].includes(part)) acc[part] = RigPart.BODY;
    else acc[part] = null;
    return acc;
  }, {} as any),
  [RigTemplate.BIRD]: RIG_PARTS.reduce((acc, part) => {
    if (part === RigPart.BODY) acc[part] = RigPart.ROOT;
    else if (part === RigPart.NECK) acc[part] = RigPart.BODY;
    else if (part === RigPart.HEAD) acc[part] = RigPart.NECK;
    else if ([RigPart.WING_L, RigPart.WING_R, RigPart.TAIL, RigPart.LEG_L, RigPart.LEG_R].includes(part)) acc[part] = RigPart.BODY;
    else acc[part] = null;
    return acc;
  }, {} as any),
  [RigTemplate.VEHICLE]: RIG_PARTS.reduce((acc, part) => {
    if (part === RigPart.BODY) acc[part] = RigPart.ROOT;
    else if ([RigPart.WHEEL_FL, RigPart.WHEEL_FR, RigPart.WHEEL_BL, RigPart.WHEEL_BR].includes(part)) acc[part] = RigPart.BODY;
    else acc[part] = null;
    return acc;
  }, {} as any),
  [RigTemplate.GENERIC]: RIG_PARTS.reduce((acc, part) => {
    if (part !== RigPart.ROOT) acc[part] = RigPart.ROOT;
    else acc[part] = null;
    return acc;
  }, {} as any),
  [RigTemplate.CUSTOM]: RIG_PARTS.reduce((acc, part) => {
    acc[part] = null;
    return acc;
  }, {} as any),
};

export const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'studio-clean',
    name: 'Studio Clean',
    config: { ...DEFAULT_CONFIG, aoIntensity: 1.5, backgroundColor: '#1a1a1a', lightColor: '#ffffff', lightIntensity: 1.8, backgroundType: 'hdri', environmentPreset: 'studio', shadowSoftness: 3.0, shadowResolution: 2048 },
    camera: { position: [50, 50, 50], target: [0, 0, 0], fov: 35 }
  },
  {
    id: 'cyber-night',
    name: 'Cyber Night',
    config: { ...DEFAULT_CONFIG, aoIntensity: 2.0, exposure: 1.5, bloom: 0.8, lightIntensity: 2.5, lightColor: '#ff00ff', backgroundColor: '#050005', backgroundType: 'hdri', environmentPreset: 'night', shadowSoftness: 8.0, shadowResolution: 512 },
    camera: { position: [40, 20, 40], target: [0, 5, 0], fov: 40 }
  },
  {
    id: 'desert-sun',
    name: 'Desert Sun',
    config: { ...DEFAULT_CONFIG, aoIntensity: 1.2, exposure: 1.1, bloom: 0.3, lightIntensity: 2.0, lightColor: '#ffcc99', backgroundColor: '#2a1a0a', backgroundType: 'hdri', environmentPreset: 'sunset', shadowSoftness: 4.0, shadowResolution: 1024 },
    camera: { position: [60, 30, 10], target: [0, 0, 0], fov: 30 }
  },
  {
    id: 'void-minimal',
    name: 'Void Minimal',
    config: { ...DEFAULT_CONFIG, aoIntensity: 0.5, exposure: 0.8, bloom: 0.2, lightIntensity: 1.0, lightColor: '#4444ff', backgroundColor: '#000000', backgroundType: 'color', shadowsEnabled: false, contactShadowOpacity: 0.2 },
    camera: { position: [0, 100, 0], target: [0, 0, 0], fov: 25 }
  }
];

export const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: 'reset',
    name: 'Rest Pose',
    icon: 'fa-sync-alt',
    keyframes: [
      { time: 0, interpolation: InterpolationMode.LINEAR, transforms: INITIAL_TRANSFORMS }
    ]
  },
  {
    id: 'idle-bouncy',
    name: 'Bouncy Idle',
    icon: 'fa-wind',
    keyframes: [
      { time: 0, interpolation: InterpolationMode.BEZIER, transforms: INITIAL_TRANSFORMS },
      { 
        time: 0.5, 
        interpolation: InterpolationMode.BEZIER, 
        transforms: { 
          ...INITIAL_TRANSFORMS, 
          [RigPart.ROOT]: { position: [0, 0, 1], rotation: [0.05, 0, 0] } 
        } 
      },
      { time: 1.0, interpolation: InterpolationMode.BEZIER, transforms: INITIAL_TRANSFORMS }
    ]
  },
  {
    id: 'spin-360',
    name: 'Full Spin',
    icon: 'fa-redo',
    keyframes: [
      { time: 0, interpolation: InterpolationMode.LINEAR, transforms: INITIAL_TRANSFORMS },
      { 
        time: 0.5, 
        interpolation: InterpolationMode.LINEAR, 
        transforms: { 
          ...INITIAL_TRANSFORMS, 
          [RigPart.ROOT]: { position: [0, 0, 0], rotation: [0, Math.PI, 0] } 
        } 
      },
      { 
        time: 1.0, 
        interpolation: InterpolationMode.LINEAR, 
        transforms: { 
          ...INITIAL_TRANSFORMS, 
          [RigPart.ROOT]: { position: [0, 0, 0], rotation: [0, Math.PI * 2, 0] } 
        } 
      }
    ]
  },
  {
    id: 'hero-jump',
    name: 'Hero Jump',
    icon: 'fa-bolt',
    keyframes: [
      { time: 0, interpolation: InterpolationMode.BEZIER, transforms: INITIAL_TRANSFORMS },
      { 
        time: 0.15, 
        interpolation: InterpolationMode.BEZIER, 
        transforms: { 
          ...INITIAL_TRANSFORMS, 
          [RigPart.ROOT]: { position: [0, 0, -1], rotation: [0.1, 0, 0] } 
        } 
      },
      { 
        time: 0.5, 
        interpolation: InterpolationMode.BEZIER, 
        transforms: { 
          ...INITIAL_TRANSFORMS, 
          [RigPart.ROOT]: { position: [0, 0, 10], rotation: [-0.2, 0, 0] } 
        } 
      },
      { 
        time: 0.85, 
        interpolation: InterpolationMode.BEZIER, 
        transforms: { 
          ...INITIAL_TRANSFORMS, 
          [RigPart.ROOT]: { position: [0, 0, -1], rotation: [0.2, 0, 0] } 
        } 
      },
      { time: 1.0, interpolation: InterpolationMode.BEZIER, transforms: INITIAL_TRANSFORMS }
    ]
  }
];
