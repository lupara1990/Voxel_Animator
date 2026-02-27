
import { VoxelData, RigPart, RigTemplate } from '../types';

export const ROBOT_MODEL: VoxelData[] = [
  // Body
  { x: 0, y: 5, z: 0, color: '#444444', part: RigPart.BODY },
  { x: 1, y: 5, z: 0, color: '#444444', part: RigPart.BODY },
  { x: -1, y: 5, z: 0, color: '#444444', part: RigPart.BODY },
  { x: 0, y: 6, z: 0, color: '#444444', part: RigPart.BODY },
  { x: 1, y: 6, z: 0, color: '#444444', part: RigPart.BODY },
  { x: -1, y: 6, z: 0, color: '#444444', part: RigPart.BODY },
  { x: 0, y: 7, z: 0, color: '#444444', part: RigPart.BODY },
  { x: 1, y: 7, z: 0, color: '#444444', part: RigPart.BODY },
  { x: -1, y: 7, z: 0, color: '#444444', part: RigPart.BODY },
  // Head
  { x: 0, y: 8, z: 0, color: '#666666', part: RigPart.HEAD },
  { x: 0, y: 9, z: 0, color: '#666666', part: RigPart.HEAD },
  { x: 1, y: 9, z: 0, color: '#666666', part: RigPart.HEAD },
  { x: -1, y: 9, z: 0, color: '#666666', part: RigPart.HEAD },
  { x: 0, y: 10, z: 0, color: '#666666', part: RigPart.HEAD },
  // Arms
  { x: 2, y: 7, z: 0, color: '#333333', part: RigPart.ARM_R },
  { x: 3, y: 7, z: 0, color: '#333333', part: RigPart.ARM_R },
  { x: 3, y: 6, z: 0, color: '#333333', part: RigPart.ARM_R },
  { x: -2, y: 7, z: 0, color: '#333333', part: RigPart.ARM_L },
  { x: -3, y: 7, z: 0, color: '#333333', part: RigPart.ARM_L },
  { x: -3, y: 6, z: 0, color: '#333333', part: RigPart.ARM_L },
  // Legs
  { x: 1, y: 4, z: 0, color: '#222222', part: RigPart.LEG_R },
  { x: 1, y: 3, z: 0, color: '#222222', part: RigPart.LEG_R },
  { x: 1, y: 2, z: 0, color: '#222222', part: RigPart.LEG_R },
  { x: -1, y: 4, z: 0, color: '#222222', part: RigPart.LEG_L },
  { x: -1, y: 3, z: 0, color: '#222222', part: RigPart.LEG_L },
  { x: -1, y: 2, z: 0, color: '#222222', part: RigPart.LEG_L },
];

export const DOG_MODEL: VoxelData[] = [
  // Body
  { x: 0, y: 3, z: 0, color: '#8b4513', part: RigPart.BODY },
  { x: 0, y: 3, z: 1, color: '#8b4513', part: RigPart.BODY },
  { x: 0, y: 3, z: 2, color: '#8b4513', part: RigPart.BODY },
  { x: 0, y: 3, z: -1, color: '#8b4513', part: RigPart.BODY },
  { x: 0, y: 3, z: -2, color: '#8b4513', part: RigPart.BODY },
  // Neck & Head
  { x: 0, y: 4, z: 2, color: '#a0522d', part: RigPart.NECK },
  { x: 0, y: 5, z: 2, color: '#a0522d', part: RigPart.HEAD },
  { x: 0, y: 5, z: 3, color: '#a0522d', part: RigPart.HEAD },
  // Tail
  { x: 0, y: 4, z: -2, color: '#8b4513', part: RigPart.TAIL },
  // Legs
  { x: 1, y: 2, z: 2, color: '#5d2e0c', part: RigPart.LEG_FR },
  { x: 1, y: 1, z: 2, color: '#5d2e0c', part: RigPart.LEG_FR },
  { x: -1, y: 2, z: 2, color: '#5d2e0c', part: RigPart.LEG_FL },
  { x: -1, y: 1, z: 2, color: '#5d2e0c', part: RigPart.LEG_FL },
  { x: 1, y: 2, z: -2, color: '#5d2e0c', part: RigPart.LEG_BR },
  { x: 1, y: 1, z: -2, color: '#5d2e0c', part: RigPart.LEG_BR },
  { x: -1, y: 2, z: -2, color: '#5d2e0c', part: RigPart.LEG_BL },
  { x: -1, y: 1, z: -2, color: '#5d2e0c', part: RigPart.LEG_BL },
];

export const CAR_MODEL: VoxelData[] = [
  // Body
  { x: 0, y: 2, z: 0, color: '#cc0000', part: RigPart.BODY },
  { x: 1, y: 2, z: 0, color: '#cc0000', part: RigPart.BODY },
  { x: -1, y: 2, z: 0, color: '#cc0000', part: RigPart.BODY },
  { x: 0, y: 2, z: 1, color: '#cc0000', part: RigPart.BODY },
  { x: 1, y: 2, z: 1, color: '#cc0000', part: RigPart.BODY },
  { x: -1, y: 2, z: 1, color: '#cc0000', part: RigPart.BODY },
  { x: 0, y: 2, z: -1, color: '#cc0000', part: RigPart.BODY },
  { x: 1, y: 2, z: -1, color: '#cc0000', part: RigPart.BODY },
  { x: -1, y: 2, z: -1, color: '#cc0000', part: RigPart.BODY },
  // Wheels
  { x: 1.5, y: 1, z: 1, color: '#111111', part: RigPart.WHEEL_FR },
  { x: -1.5, y: 1, z: 1, color: '#111111', part: RigPart.WHEEL_FL },
  { x: 1.5, y: 1, z: -1, color: '#111111', part: RigPart.WHEEL_BR },
  { x: -1.5, y: 1, z: -1, color: '#111111', part: RigPart.WHEEL_BL },
];

export interface SampleModel {
  id: string;
  name: string;
  data: VoxelData[];
  template: RigTemplate;
}

export const SAMPLE_MODELS: SampleModel[] = [
  { id: 'robot', name: 'Robot', data: ROBOT_MODEL, template: RigTemplate.HUMANOID },
  { id: 'dog', name: 'Dog', data: DOG_MODEL, template: RigTemplate.QUADRUPED },
  { id: 'car', name: 'Car', data: CAR_MODEL, template: RigTemplate.VEHICLE },
];
