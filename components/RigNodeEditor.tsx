
import React, { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Edge,
  Node,
  OnConnect,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { RigPart, AppState } from '../types';
import { X, Plus, Trash2 } from 'lucide-react';

interface RigNodeEditorProps {
  state: AppState;
  onClose: () => void;
  onUpdatePartParent: (part: RigPart, parent: RigPart | null) => void;
  onSelectPart: (part: RigPart | null) => void;
  onAddBone: (part: RigPart) => void;
  onRemoveBone: (part: RigPart) => void;
}

const BoneNode = ({ data, selected }: any) => {
  return (
    <div className={`px-4 py-2 rounded-xl border-2 transition-all min-w-[120px] ${selected ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-500/40' : 'bg-neutral-800 border-white/10 hover:border-white/20'}`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-indigo-400" />
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Bone</span>
        <span className="text-xs font-bold text-white">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-indigo-400" />
    </div>
  );
};

const nodeTypes = {
  bone: BoneNode,
};

const RigNodeEditor: React.FC<RigNodeEditorProps> = ({ 
  state, onClose, onUpdatePartParent, onSelectPart, onAddBone, onRemoveBone 
}) => {
  const initialNodes: Node[] = useMemo(() => {
    return state.activeParts.map((part, i) => ({
      id: part,
      type: 'bone',
      data: { label: part },
      position: { x: 250, y: i * 100 },
      selected: state.selectedPart === part,
    }));
  }, [state.activeParts, state.selectedPart]);

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    Object.entries(state.partParents).forEach(([child, parent]) => {
      if (parent && state.activeParts.includes(child as RigPart) && state.activeParts.includes(parent as RigPart)) {
        edges.push({
          id: `${parent}-${child}`,
          source: parent,
          target: child,
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#6366f1',
          },
        });
      }
    });
    return edges;
  }, [state.partParents, state.activeParts]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync selection from state to nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === state.selectedPart,
      }))
    );
  }, [state.selectedPart, setNodes]);

  const onConnect: OnConnect = useCallback(
    (params) => {
      if (params.source && params.target) {
        onUpdatePartParent(params.target as RigPart, params.source as RigPart);
      }
    },
    [onUpdatePartParent]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    onSelectPart(node.id as RigPart);
  }, [onSelectPart]);

  const onPaneClick = useCallback(() => {
    onSelectPart(null);
  }, [onSelectPart]);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    // Remove parent connection
    onUpdatePartParent(edge.target as RigPart, null);
  }, [onUpdatePartParent]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-neutral-900/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <i className="fas fa-project-diagram text-white"></i>
          </div>
          <div>
            <h2 className="text-sm font-black tracking-widest uppercase">Visual Rig Editor</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-tighter">Drag connections to define bone hierarchy</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Tip:</span>
            <span className="text-[10px] text-white/60">Click edge to break connection</span>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
        >
          <Background color="#333" gap={20} />
          <Controls />
        </ReactFlow>

        {/* Floating Actions */}
        <div className="absolute bottom-8 right-8 flex flex-col gap-3">
          {state.selectedPart && state.selectedPart !== RigPart.ROOT && (
            <button 
              onClick={() => onRemoveBone(state.selectedPart!)}
              className="flex items-center gap-3 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-2xl transition-all shadow-xl backdrop-blur-md"
            >
              <Trash2 size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Delete Bone</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RigNodeEditor;
