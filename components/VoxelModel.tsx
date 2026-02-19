
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { VoxelData, Keyframe, RigPart, InterpolationMode } from '../types';

interface VoxelModelProps {
  voxels: VoxelData[];
  keyframes: Keyframe[];
  currentTime: number;
  partParents: Record<RigPart, RigPart | null>;
}

// Ease In Out Cubic
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const VoxelModel: React.FC<VoxelModelProps> = ({ voxels, keyframes, currentTime, partParents }) => {
  const groupRefs = useRef<Record<string, THREE.Group | null>>({});
  const modelRootRef = useRef<THREE.Group>(null);

  // Group voxels by part
  const voxelGroups = useMemo(() => {
    const groups: Record<RigPart, VoxelData[]> = {} as any;
    voxels.forEach(v => {
      const part = v.part || RigPart.BODY;
      if (!groups[part]) groups[part] = [];
      groups[part].push(v);
    });
    return groups;
  }, [voxels]);

  // Handle Hierarchy Reconstruction
  useLayoutEffect(() => {
    if (!modelRootRef.current) return;

    // First detach everyone to reset
    // Fix: Add explicit type to avoid 'unknown' error when accessing 'parent'
    Object.values(groupRefs.current).forEach((group: THREE.Group | null) => {
      if (group && group.parent) group.parent.remove(group);
    });

    // Rebuild based on partParents
    Object.entries(groupRefs.current).forEach(([p, group]) => {
      if (!group) return;
      const part = p as RigPart;
      const parentPart = partParents[part];
      
      if (parentPart && groupRefs.current[parentPart]) {
        groupRefs.current[parentPart]!.add(group);
      } else {
        modelRootRef.current!.add(group);
      }
    });
  }, [partParents, voxels]);

  // Interpolate transforms
  useFrame(() => {
    if (keyframes.length === 0) return;

    // Find interpolation bounds
    let prev = keyframes[0];
    let next = keyframes[0];
    for (let i = 0; i < keyframes.length; i++) {
      if (keyframes[i].time <= currentTime) prev = keyframes[i];
      if (keyframes[i].time >= currentTime) {
        next = keyframes[i];
        break;
      }
    }

    let t = next.time === prev.time ? 0 : (currentTime - prev.time) / (next.time - prev.time);

    // Apply interpolation mode logic
    if (prev.interpolation === InterpolationMode.STEP) {
      t = 0; // Stick to prev until we hit next
    } else if (prev.interpolation === InterpolationMode.BEZIER) {
      t = easeInOutCubic(t);
    }

    Object.keys(prev.transforms).forEach((p) => {
      const part = p as RigPart;
      const group = groupRefs.current[part];
      if (!group) return;

      const pPos = prev.transforms[part].position;
      const nPos = next.transforms[part].position;
      const pRot = prev.transforms[part].rotation;
      const nRot = next.transforms[part].rotation;

      group.position.set(
        THREE.MathUtils.lerp(pPos[0], nPos[0], t),
        THREE.MathUtils.lerp(pPos[1], nPos[1], t),
        THREE.MathUtils.lerp(pPos[2], nPos[2], t)
      );

      group.rotation.set(
        THREE.MathUtils.lerp(pRot[0], nRot[0], t),
        THREE.MathUtils.lerp(pRot[1], nRot[1], t),
        THREE.MathUtils.lerp(pRot[2], nRot[2], t)
      );
    });
  });

  const centerModel = useMemo(() => {
    if (voxels.length === 0) return { x: 0, y: 0, z: 0 };
    const avgX = voxels.reduce((sum, v) => sum + v.x, 0) / voxels.length;
    const avgY = voxels.reduce((sum, v) => sum + v.y, 0) / voxels.length;
    const minZ = Math.min(...voxels.map(v => v.z));
    return { x: -avgX, y: -avgY, z: -minZ };
  }, [voxels]);

  return (
    <group ref={modelRootRef} position={[0, 0, 0]} scale={[0.5, 0.5, 0.5]}>
      {(Object.entries(voxelGroups) as [string, VoxelData[]][]).map(([part, partVoxels]) => (
        <group 
          key={part} 
          name={`part-${part}`}
          ref={(el) => groupRefs.current[part] = el}
        >
          {partVoxels.map((v, i) => (
            <mesh 
              key={i} 
              position={[v.x + centerModel.x, v.z + centerModel.z, v.y + centerModel.y]} 
              castShadow 
              receiveShadow
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={v.color} roughness={0.1} metalness={0.2} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

export default VoxelModel;
