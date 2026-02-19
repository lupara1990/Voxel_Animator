
import { VoxelData, RigPart, RigTemplate } from '../types';

export const reprocessVoxels = (voxels: VoxelData[], template: RigTemplate): VoxelData[] => {
  if (voxels.length === 0) return [];

  const minX = Math.min(...voxels.map(v => v.x));
  const maxX = Math.max(...voxels.map(v => v.x));
  const minY = Math.min(...voxels.map(v => v.y));
  const maxY = Math.max(...voxels.map(v => v.y));
  const minZ = Math.min(...voxels.map(v => v.z));
  const maxZ = Math.max(...voxels.map(v => v.z));

  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const midZ = (minZ + maxZ) / 2;

  return voxels.map(v => {
    let part = RigPart.BODY;

    if (template === RigTemplate.HUMANOID) {
      const zNorm = (v.z - minZ) / (maxZ - minZ || 1);
      if (zNorm > 0.8) part = RigPart.HEAD;
      else if (zNorm < 0.3) part = v.x < midX ? RigPart.LEG_L : RigPart.LEG_R;
      else if (zNorm > 0.4 && zNorm < 0.75) {
        if (Math.abs(v.x - midX) > (maxX - minX) * 0.3) {
          part = v.x < midX ? RigPart.ARM_L : RigPart.ARM_R;
        } else {
          part = RigPart.BODY;
        }
      }
    } 
    else if (template === RigTemplate.QUADRUPED) {
      const zNorm = (v.z - minZ) / (maxZ - minZ || 1);
      const yNorm = (v.y - minY) / (maxY - minY || 1);
      
      if (zNorm > 0.6 && yNorm > 0.7) part = RigPart.HEAD;
      else if (zNorm > 0.5 && yNorm > 0.5 && yNorm <= 0.7) part = RigPart.NECK;
      else if (yNorm < 0.2) part = RigPart.TAIL;
      else if (zNorm < 0.4) {
        if (yNorm > midY) {
          part = v.x < midX ? RigPart.LEG_FL : RigPart.LEG_FR;
        } else {
          part = v.x < midX ? RigPart.LEG_BL : RigPart.LEG_BR;
        }
      } else {
        part = RigPart.BODY;
      }
    } 
    else if (template === RigTemplate.GENERIC) {
      // Octant split
      const xBit = v.x < midX ? 0 : 1;
      const yBit = v.y < midY ? 0 : 2;
      const zBit = v.z < midZ ? 0 : 4;
      const index = xBit + yBit + zBit;
      const parts = [RigPart.P1, RigPart.P2, RigPart.P3, RigPart.P4, RigPart.P5, RigPart.P6, RigPart.P7, RigPart.P8];
      part = parts[index];
    }

    return { ...v, part };
  });
};

export const parseVoxFile = async (buffer: ArrayBuffer, template: RigTemplate = RigTemplate.HUMANOID): Promise<VoxelData[]> => {
  const view = new DataView(buffer);
  let offset = 0;

  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== 'VOX ') throw new Error('Not a valid .vox file');
  offset += 8; // skip magic and version

  let voxels: VoxelData[] = [];
  let palette: string[] = Array(256).fill('#ffffff');

  while (offset < buffer.byteLength) {
    const chunkId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
    offset += 4;
    const chunkSize = view.getUint32(offset, true);
    offset += 4;
    const childrenSize = view.getUint32(offset, true);
    offset += 4;

    if (chunkId === 'XYZI') {
      const numVoxels = view.getUint32(offset, true);
      let chunkOffset = offset + 4;
      for (let i = 0; i < numVoxels; i++) {
        const x = view.getUint8(chunkOffset++);
        const y = view.getUint8(chunkOffset++);
        const z = view.getUint8(chunkOffset++);
        const colorIdx = view.getUint8(chunkOffset++);
        voxels.push({ x, y, z, color: colorIdx.toString() });
      }
    } else if (chunkId === 'RGBA') {
      for (let i = 0; i < 256; i++) {
        const r = view.getUint8(offset + i * 4);
        const g = view.getUint8(offset + i * 4 + 1);
        const b = view.getUint8(offset + i * 4 + 2);
        palette[i + 1] = `rgb(${r},${g},${b})`;
      }
    }
    offset += chunkSize;
  }

  const coloredVoxels = voxels.map(v => ({
    ...v,
    color: palette[parseInt(v.color)] || '#ffffff'
  }));

  return reprocessVoxels(coloredVoxels, template);
};
