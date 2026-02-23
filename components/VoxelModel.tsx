
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { VoxelData, Keyframe, RigPart, InterpolationMode } from '../types';

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

interface VoxelModelProps {
  voxels: VoxelData[];
  keyframes: Keyframe[];
  currentTime: number;
  currentTimeRef?: React.MutableRefObject<number>;
  partParents: Record<RigPart, RigPart | null>;
  restTransforms: Record<RigPart, { position: [number, number, number]; rotation: [number, number, number] }>;
  castShadow?: boolean;
  receiveShadow?: boolean;
  hiddenParts?: RigPart[];
  activeParts: RigPart[];
  selectedPart?: RigPart | null;
  showSkeleton?: boolean;
  performanceMode?: boolean;
  modelTransform?: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
  };
}

const Bone: React.FC<{ from: THREE.Vector3; to: THREE.Vector3; isSelected?: boolean; performanceMode?: boolean }> = ({ from, to, isSelected, performanceMode }) => {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  
  if (length < 0.1) return null;

  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );

  return (
    <group position={from.toArray()} renderOrder={999}>
      <mesh quaternion={quaternion} position={[0, length / 2, 0]}>
        <coneGeometry args={[0.2, length, performanceMode ? 3 : 4]} />
        <meshStandardMaterial 
          color={isSelected ? "#6366f1" : "#ffffff"} 
          emissive={isSelected ? "#6366f1" : "#ffffff"}
          emissiveIntensity={isSelected ? 1 : 0.2}
          transparent 
          opacity={0.8} 
          depthTest={false}
        />
      </mesh>
      {!performanceMode && (
        <mesh>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshStandardMaterial 
            color={isSelected ? "#6366f1" : "#ffffff"} 
            emissive={isSelected ? "#6366f1" : "#ffffff"}
            emissiveIntensity={isSelected ? 1 : 0.2}
            depthTest={false} 
          />
        </mesh>
      )}
    </group>
  );
};

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const VoxelModel: React.FC<VoxelModelProps> = ({ 
  voxels, 
  keyframes, 
  currentTime: staticTime, 
  currentTimeRef,
  partParents, 
  restTransforms, 
  castShadow = true, 
  receiveShadow = true, 
  hiddenParts = [],
  activeParts = [],
  selectedPart = null,
  showSkeleton = true,
  performanceMode = false,
  modelTransform = { position: [0, 0, 0], rotation: [0, 0, 0], scale: 0.5 }
}) => {
  const groupRefs = useRef<Record<string, THREE.Group | null>>({});
  const instancedRefs = useRef<Record<string, THREE.InstancedMesh | null>>({});
  const modelRootRef = useRef<THREE.Group>(null);
  const bonesRootRef = useRef<THREE.Group>(null);
  const boneElementsRef = useRef<Record<string, { cone: THREE.Mesh, sphere?: THREE.Mesh, group: THREE.Group }>>({});

  const voxelGroups = useMemo(() => {
    const groups: Record<RigPart, VoxelData[]> = {} as any;
    voxels.forEach(v => {
      const part = v.part || RigPart.BODY;
      if (!groups[part]) groups[part] = [];
      groups[part].push(v);
    });
    return groups;
  }, [voxels]);

  const centerModel = useMemo(() => {
    if (voxels.length === 0) return { x: 0, y: 0, z: 0 };
    const avgX = voxels.reduce((sum, v) => sum + v.x, 0) / voxels.length;
    const avgY = voxels.reduce((sum, v) => sum + v.y, 0) / voxels.length;
    const minZ = Math.min(...voxels.map(v => v.z));
    return { x: -avgX, y: -avgY, z: -minZ };
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

    // Update instanced meshes
    const tempMatrix = new THREE.Matrix4();
    const tempColor = new THREE.Color();
    
    Object.entries(voxelGroups).forEach(([part, partVoxels]) => {
      const mesh = instancedRefs.current[part];
      if (mesh) {
        partVoxels.forEach((v, i) => {
          tempMatrix.setPosition(v.x + centerModel.x, v.z + centerModel.z, v.y + centerModel.y);
          mesh.setMatrixAt(i, tempMatrix);
          mesh.setColorAt(i, tempColor.set(v.color));
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    });
  }, [partParents, voxels, centerModel, voxelGroups]);

  useLayoutEffect(() => {
    if (!bonesRootRef.current) return;
    
    // Clear existing bones
    while(bonesRootRef.current.children.length > 0) {
      bonesRootRef.current.remove(bonesRootRef.current.children[0]);
    }
    boneElementsRef.current = {};

    if (!showSkeleton) return;

    activeParts.forEach((part) => {
      const children = activeParts.filter((p) => partParents[p] === part);
      
      const createBoneElement = (id: string) => {
        const group = new THREE.Group();
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.2, 1, performanceMode ? 3 : 4),
          new THREE.MeshStandardMaterial({ 
            transparent: true, 
            opacity: 0.8, 
            depthTest: false,
            emissiveIntensity: 0.2
          })
        );
        group.add(cone);
        
        let sphere;
        if (!performanceMode) {
          sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 8, 8),
            new THREE.MeshStandardMaterial({ depthTest: false, emissiveIntensity: 0.2 })
          );
          group.add(sphere);
        }
        
        bonesRootRef.current!.add(group);
        boneElementsRef.current[id] = { cone, sphere, group };
      };

      if (children.length > 0) {
        children.forEach(child => createBoneElement(`${part}-${child}`));
      } else {
        createBoneElement(`terminal-${part}`);
      }
    });
  }, [activeParts, partParents, showSkeleton, performanceMode]);

  useFrame(() => {
    if (keyframes.length === 0) return;

    const currentTime = currentTimeRef ? currentTimeRef.current : staticTime;

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

    const worldPositions: Record<string, THREE.Vector3> = {};

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

      if (showSkeleton) {
        const wp = new THREE.Vector3();
        group.getWorldPosition(wp);
        worldPositions[part] = wp;
      }
    });

    // Update bones imperatively
    if (showSkeleton && bonesRootRef.current) {
      activeParts.forEach((part) => {
        const children = activeParts.filter((p) => partParents[p] === part);
        const isSelected = selectedPart === part;
        
        const updateBone = (id: string, from: THREE.Vector3, to: THREE.Vector3, selected: boolean) => {
          const el = boneElementsRef.current[id];
          if (!el) return;
          
          const direction = new THREE.Vector3().subVectors(to, from);
          const length = direction.length();
          
          if (length < 0.1) {
            el.group.visible = false;
            return;
          }
          
          el.group.visible = true;
          el.group.position.copy(from);
          
          const quaternion = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.clone().normalize()
          );
          el.cone.quaternion.copy(quaternion);
          el.cone.position.copy(direction.clone().multiplyScalar(0.5));
          el.cone.scale.set(1, length, 1);
          
          const color = selected ? "#6366f1" : "#ffffff";
          (el.cone.material as THREE.MeshStandardMaterial).color.set(color);
          (el.cone.material as THREE.MeshStandardMaterial).emissive.set(color);
          (el.cone.material as THREE.MeshStandardMaterial).emissiveIntensity = selected ? 1 : 0.2;
          
          if (el.sphere) {
            (el.sphere.material as THREE.MeshStandardMaterial).color.set(color);
            (el.sphere.material as THREE.MeshStandardMaterial).emissive.set(color);
            (el.sphere.material as THREE.MeshStandardMaterial).emissiveIntensity = selected ? 1 : 0.2;
          }
        };

        if (children.length > 0) {
          children.forEach(child => {
            if (worldPositions[part] && worldPositions[child]) {
              updateBone(`${part}-${child}`, worldPositions[part], worldPositions[child], isSelected || selectedPart === child);
            }
          });
        } else {
          const partVoxels = voxelGroups[part];
          const group = groupRefs.current[part];
          if (partVoxels && partVoxels.length > 0 && group && worldPositions[part]) {
            const avgX = partVoxels.reduce((sum: number, v: VoxelData) => sum + v.x, 0) / partVoxels.length;
            const avgY = partVoxels.reduce((sum: number, v: VoxelData) => sum + v.y, 0) / partVoxels.length;
            const avgZ = partVoxels.reduce((sum: number, v: VoxelData) => sum + v.z, 0) / partVoxels.length;
            const tipLocal = new THREE.Vector3(avgX + centerModel.x, avgZ + centerModel.z, avgY + centerModel.y);
            const tipWorld = tipLocal.clone().applyMatrix4(group.matrixWorld);
            updateBone(`terminal-${part}`, worldPositions[part], tipWorld, isSelected);
          }
        }
      });
    }

    // Apply global model transform
    if (modelRootRef.current) {
      modelRootRef.current.position.set(modelTransform.position[0], modelTransform.position[1], modelTransform.position[2]);
      modelRootRef.current.rotation.set(modelTransform.rotation[0], modelTransform.rotation[1], modelTransform.rotation[2]);
      modelRootRef.current.scale.setScalar(modelTransform.scale);
    }
  });

  return (
    <group>
      <group ref={modelRootRef}>
        {(Object.entries(voxelGroups) as [string, VoxelData[]][]).map(([part, partVoxels]) => (
          <group 
            key={part} 
            name={`part-${part}`}
            ref={(el) => groupRefs.current[part] = el}
          >
            <instancedMesh
              ref={(el) => instancedRefs.current[part] = el}
              args={[null as any, null as any, partVoxels.length]}
              castShadow={castShadow && !performanceMode}
              receiveShadow={receiveShadow && !performanceMode}
            >
              <boxGeometry args={[1, 1, 1]} />
              {performanceMode ? (
                <meshLambertMaterial />
              ) : (
                <meshStandardMaterial roughness={0.1} metalness={0.2} />
              )}
            </instancedMesh>
          </group>
        ))}
      </group>

      <group ref={bonesRootRef} />
    </group>
  );
};

export default VoxelModel;
