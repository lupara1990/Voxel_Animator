
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
  
  // Default MagicaVoxel palette (fallback)
  const defaultPalette = [
    0x00000000, 0xffffffff, 0xffccffff, 0xff99ffff, 0xff66ffff, 0xff33ffff, 0xff00ffff, 0xffffccff, 0xffccccff, 0xff99ccff, 0xff66ccff, 0xff33ccff, 0xff00ccff, 0xffff99ff, 0xffcc99ff, 0xff9999ff,
    0xff6699ff, 0xff3399ff, 0xff0099ff, 0xffff66ff, 0xffcc66ff, 0xff9966ff, 0xff6666ff, 0xff3366ff, 0xff0066ff, 0xffff33ff, 0xffcc33ff, 0xff9933ff, 0xff6633ff, 0xff3333ff, 0xff0033ff, 0xffff00ff,
    0xffcc00ff, 0xff9900ff, 0xff6600ff, 0xff3300ff, 0xff0000ff, 0xffffffcc, 0xffccffcc, 0xff99ffcc, 0xff66ffcc, 0xff33ffcc, 0xff00ffcc, 0xffffff99, 0xffccff99, 0xff99ff99, 0xff66ff99, 0xff33ff99,
    0xff00ff99, 0xffffff66, 0xffccff66, 0xff99ff66, 0xff66ff66, 0xff33ff66, 0xff00ff66, 0xffffff33, 0xffccff33, 0xff99ff33, 0xff66ff33, 0xff33ff33, 0xff00ff33, 0xffffff00, 0xffccff00, 0xff99ff00,
    0xff66ff00, 0xff33ff00, 0xff00ff00, 0xccffffff, 0xccccffff, 0xcc99ffff, 0xcc66ffff, 0xcc33ffff, 0xcc00ffff, 0xccffccff, 0xccccccff, 0xcc99ccff, 0xcc66ccff, 0xcc33ccff, 0xcc00ccff, 0xccff99ff,
    0xcccc99ff, 0xcc9999ff, 0xcc6699ff, 0xcc3399ff, 0xcc0099ff, 0xccff66ff, 0xcccc66ff, 0xcc9966ff, 0xcc6666ff, 0xcc3366ff, 0xcc0066ff, 0xccff33ff, 0xcccc33ff, 0xcc9933ff, 0xcc6633ff, 0xcc3333ff,
    0xcc0033ff, 0xccff00ff, 0xcccc00ff, 0xcc9900ff, 0xcc6600ff, 0xcc3300ff, 0xcc0000ff, 0xccffffcc, 0xccccffcc, 0xcc99ffcc, 0xcc66ffcc, 0xcc33ffcc, 0xcc00ffcc, 0xccffff99, 0xccccff99, 0xcc99ff99,
    0xcc66ff99, 0xcc33ff99, 0xcc00ff99, 0xccffff66, 0xcccc66ff, 0xcc9966ff, 0xcc6666ff, 0xcc3366ff, 0xcc0066ff, 0xccffff33, 0xccccff33, 0xcc99ff33, 0xcc66ff33, 0xcc33ff33, 0xcc00ff33, 0xccffff00,
    0xccccff00, 0xcc99ff00, 0xcc66ff00, 0xcc33ff00, 0xcc00ff00, 0x99ffffff, 0x99ccffff, 0x9999ffff, 0x9966ffff, 0x9933ffff, 0x9900ffff, 0x99ffccff, 0x99ccccff, 0x9999ccff, 0x9966ccff, 0x9933ccff,
    0x9900ccff, 0x99ff99ff, 0x99cc99ff, 0x999999ff, 0x996699ff, 0x993399ff, 0x990099ff, 0x99ff66ff, 0x99cc66ff, 0x999966ff, 0x996666ff, 0x993366ff, 0x990066ff, 0x99ff33ff, 0x99cc33ff, 0x999933ff,
    0x996633ff, 0x993333ff, 0x990033ff, 0x99ff00ff, 0x99cc00ff, 0x999900ff, 0x996600ff, 0x993300ff, 0x990000ff, 0x99ffffcc, 0x99ccccff, 0x9999ffcc, 0x9966ffcc, 0x9933ffcc, 0x9900ffcc, 0x99ffff99,
    0x99cccc99, 0x9999ff99, 0x9966ff99, 0x9933ff99, 0x9900ff99, 0x99ffff66, 0x99cccc66, 0x9999ff66, 0x9966ff66, 0x9933ff66, 0x9900ff66, 0x99ffff33, 0x99cccc33, 0x9999ff33, 0x9966ff33, 0x9933ff33,
    0x9900ff33, 0x99ffff00, 0x99cccc00, 0x9999ff00, 0x9966ff00, 0x9933ff00, 0x9900ff00, 0x66ffffff, 0x66ccffff, 0x6699ffff, 0x6666ffff, 0x6633ffff, 0x6600ffff, 0x66ffccff, 0x66ccccff, 0x6699ccff,
    0x6666ccff, 0x6633ccff, 0x6600ccff, 0x66ff99ff, 0x66cc99ff, 0x669999ff, 0x666699ff, 0x663399ff, 0x660099ff, 0x66ff66ff, 0x66cc66ff, 0x669966ff, 0x666666ff, 0x663366ff, 0x660066ff, 0x66ff33ff,
    0x66cc33ff, 0x669933ff, 0x666633ff, 0x663333ff, 0x660033ff, 0x66ff00ff, 0x66cc00ff, 0x669900ff, 0x666600ff, 0x663300ff, 0x660000ff, 0x66ffffcc, 0x66ccccff, 0x6699ffcc, 0x6666ffcc, 0x6633ffcc,
    0x6600ffcc, 0x66ffff99, 0x66cccc99, 0x6699ff99, 0x6666ff99, 0x6633ff99, 0x6600ff99, 0x66ffff66, 0x66cccc66, 0x6699ff66, 0x6666ff66, 0x6633ff66, 0x6600ff66, 0x66ffff33, 0x66cccc33, 0x6699ff33
  ];

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
        palette[i] = `rgb(${r},${g},${b})`;
      }
    }
    offset += chunkSize;
  }

  const coloredVoxels = voxels.map(v => {
    const idx = parseInt(v.color) - 1;
    let color = '#ffffff';
    if (idx >= 0 && idx < 256) {
      color = palette[idx];
    }
    return { ...v, color };
  });

  return reprocessVoxels(coloredVoxels, template);
};
