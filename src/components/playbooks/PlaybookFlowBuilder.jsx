import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import NodeCard from './nodes/NodeCard';
import { loadPlaybookGraph } from './lib/playbookGraphIO';

const nodeTypes = { custom: NodeCard };

export default function PlaybookFlowBuilder({ playbookId, onClose, onOpenPlaybook }) {
  if (!playbookId) {
    return <PlaybookListing onOpenPlaybook={onOpenPlaybook} />;
  }
  return (
    <ReactFlowProvider>
      <FlowCanvas playbookId={playbookId} onClose={onClose} />
    </ReactFlowProvider>
  );
}

function FlowCanvas({ playbookId, onClose }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    loadPlaybookGraph(playbookId)
      .then(({ nodes, edges }) => {
        setNodes(nodes);
        setEdges(edges);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [playbookId, setNodes, setEdges]);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#888780' }}>Loading playbook...</div>;
  if (error) return <div style={{ padding:40, color:'#dc2626' }}>Error: {error}</div>;

  return (
    <div style={{ width:'100%', height:'100%', position:'relative' }}>
      <button
        onClick={onClose}
        style={{ position:'absolute', top:12, left:12, zIndex:10, padding:'6px 10px', fontSize:11,
                 background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:6, cursor:'pointer' }}>
        ← Terug naar lijst
      </button>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

function PlaybookListing({ onOpenPlaybook }) {
  // Stub voor Task 8 — wordt daar volledig ingevuld
  return (
    <div style={{ padding:24 }}>
      <h2 style={{ fontSize:14, marginBottom:8 }}>Playbooks</h2>
      <p style={{ fontSize:12, color:'#888780' }}>Lijst-component wordt ingevuld in Task 8.</p>
    </div>
  );
}
