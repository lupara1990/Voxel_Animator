
import { RigPart, SceneConfig, Preset, RigTemplate } from './types';

export const DEFAULT_CONFIG: SceneConfig = {
  exposure: 1.2,
  bloom: 0.5,
  lightIntensity: 1.5,
  lightColor: '#ffffff',
  backgroundColor: '#0a0a0a',
};

export const RIG_PARTS = Object.values(RigPart);

export const INITIAL_TRANSFORMS: Record<RigPart, { position: [number, number, number]; rotation: [number, number, number] }> = RIG_PARTS.reduce((acc, part) => {
  acc[part] = { position: [0, 0, 0], rotation: [0, 0, 0] };
  return acc;
}, {} as any);

export const TEMPLATE_PARTS: Record<RigTemplate, RigPart[]> = {
  [RigTemplate.HUMANOID]: [RigPart.ROOT, RigPart.HEAD, RigPart.BODY, RigPart.ARM_L, RigPart.ARM_R, RigPart.LEG_L, RigPart.LEG_R],
  [RigTemplate.QUADRUPED]: [RigPart.ROOT, RigPart.HEAD, RigPart.NECK, RigPart.BODY, RigPart.TAIL, RigPart.LEG_FL, RigPart.LEG_FR, RigPart.LEG_BL, RigPart.LEG_BR],
  [RigTemplate.GENERIC]: [RigPart.ROOT, RigPart.P1, RigPart.P2, RigPart.P3, RigPart.P4, RigPart.P5, RigPart.P6, RigPart.P7, RigPart.P8],
};

export const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'studio-clean',
    name: 'Studio Clean',
    config: { ...DEFAULT_CONFIG, backgroundColor: '#1a1a1a', lightColor: '#ffffff', lightIntensity: 1.8 },
    camera: { position: [50, 50, 50], target: [0, 0, 0], fov: 35 }
  },
  {
    id: 'cyber-night',
    name: 'Cyber Night',
    config: { exposure: 1.5, bloom: 0.8, lightIntensity: 2.5, lightColor: '#ff00ff', backgroundColor: '#050005' },
    camera: { position: [40, 20, 40], target: [0, 5, 0], fov: 40 }
  },
  {
    id: 'desert-sun',
    name: 'Desert Sun',
    config: { exposure: 1.1, bloom: 0.3, lightIntensity: 2.0, lightColor: '#ffcc99', backgroundColor: '#2a1a0a' },
    camera: { position: [60, 30, 10], target: [0, 0, 0], fov: 30 }
  },
  {
    id: 'void-minimal',
    name: 'Void Minimal',
    config: { exposure: 0.8, bloom: 0.2, lightIntensity: 1.0, lightColor: '#4444ff', backgroundColor: '#000000' },
    camera: { position: [0, 100, 0], target: [0, 0, 0], fov: 25 }
  }
];
