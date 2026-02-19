
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { VoxelData, Keyframe, RigPart, InterpolationMode } from '../types';

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

interface VoxelModelProps {
  voxels: VoxelData[];
  keyframes: Keyframe[];
  currentTime: number;
  partParents: Record<RigPart, RigPart | null>;
  restTransforms: Record<RigPart, { position: [number, number, number]; rotation: [number, number, number] }>;
  castShadow?: boolean;
  receiveShadow?: boolean;
  hiddenParts?: RigPart[];
  modelTransform?: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
  };
}

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const VoxelModel: React.FC<VoxelModelProps> = ({ 
  voxels, 
  keyframes, 
  currentTime, 
  partParents, 
  restTransforms, 
  castShadow = true, 
  receiveShadow = true, 
  hiddenParts = [],
  modelTransform = { position: [0, 0, 0], rotation: [0, 0, 0], scale: 0.5 }
}) => {
  const groupRefs = useRef<Record<string, THREE.Group | null>>({});
  const modelRootRef = useRef<THREE.Group>(null);

  const voxelGroups = useMemo(() => {
    const groups: Record<RigPart, VoxelData[]> = {} as any;
    voxels.forEach(v => {
      const part = v.part || RigPart.BODY;
      if (!groups[part]) groups[part] = [];
      groups[part].push(v);
    });
    return groups;
  }, [voxels]);

  useLayoutEffect(() => {
    if (!modelRootRef.current) return;

    Object.values(groupRefs.current).forEach((group: THREE.Group | null) => {
      if (group && group.parent) group.parent.remove(group);
    });

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

  useFrame(() => {
    if (keyframes.length === 0) return;

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

    if (prev.interpolation === InterpolationMode.STEP) {
      t = 0;
    } else if (prev.interpolation === InterpolationMode.BEZIER) {
      t = easeInOutCubic(t);
    }

    Object.keys(prev.transforms).forEach((p) => {
      const part = p as RigPart;
      const group = groupRefs.current[part];
      if (!group) return;

      // Handle visibility
      group.visible = !hiddenParts.includes(part);

      const rest = restTransforms[part];
      const pPos = prev.transforms[part].position;
      const nPos = next.transforms[part].position;
      const pRot = prev.transforms[part].rotation;
      const nRot = next.transforms[part].rotation;

      // Final transform = Rest Pose + Animated Delta
      group.position.set(
        rest.position[0] + THREE.MathUtils.lerp(pPos[0], nPos[0], t),
        rest.position[1] + THREE.MathUtils.lerp(pPos[1], nPos[1], t),
        rest.position[2] + THREE.MathUtils.lerp(pPos[2], nPos[2], t)
      );

      group.rotation.set(
        rest.rotation[0] + THREE.MathUtils.lerp(pRot[0], nRot[0], t),
        rest.rotation[1] + THREE.MathUtils.lerp(pRot[1], nRot[1], t),
        rest.rotation[2] + THREE.MathUtils.lerp(pRot[2], nRot[2], t)
      );
    });

    // Apply global model transform
    if (modelRootRef.current) {
      modelRootRef.current.position.set(modelTransform.position[0], modelTransform.position[1], modelTransform.position[2]);
      modelRootRef.current.rotation.set(modelTransform.rotation[0], modelTransform.rotation[1], modelTransform.rotation[2]);
      modelRootRef.current.scale.setScalar(modelTransform.scale);
    }
  });

  const centerModel = useMemo(() => {
    if (voxels.length === 0) return { x: 0, y: 0, z: 0 };
    const avgX = voxels.reduce((sum, v) => sum + v.x, 0) / voxels.length;
    const avgY = voxels.reduce((sum, v) => sum + v.y, 0) / voxels.length;
    const minZ = Math.min(...voxels.map(v => v.z));
    return { x: -avgX, y: -avgY, z: -minZ };
  }, [voxels]);

  return (
    // Added fix for intrinsic group element
    <group ref={modelRootRef}>
      {(Object.entries(voxelGroups) as [string, VoxelData[]][]).map(([part, partVoxels]) => (
        // Added fix for intrinsic group element
        <group 
          key={part} 
          name={`part-${part}`}
          ref={(el) => groupRefs.current[part] = el}
        >
          {partVoxels.map((v, i) => (
            // Added fix for intrinsic mesh element
            <mesh 
              key={i} 
              position={[v.x + centerModel.x, v.z + centerModel.z, v.y + centerModel.y]} 
              castShadow={castShadow}
              receiveShadow={receiveShadow}
            >
              {/* Added fix for intrinsic boxGeometry element */}
              <boxGeometry args={[1, 1, 1]} />
              {/* Added fix for intrinsic meshStandardMaterial element */}
              <meshStandardMaterial color={v.color} roughness={0.1} metalness={0.2} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

export default VoxelModel;
