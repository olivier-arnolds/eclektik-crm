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
import NodePalette from './panels/NodePalette';
import PropertyPanel from './panels/PropertyPanel';
import { listPlaybooks, createPlaybook, loadPlaybookGraph } from './lib/playbookGraphIO';

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
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

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

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const nodeType = event.dataTransfer.getData('application/playbook-node-type');
    if (!nodeType || !reactFlowInstance) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNode = {
      id: crypto.randomUUID(),
      type: 'custom',
      position,
      data: { nodeType, config: {} },
    };
    setNodes(nds => nds.concat(newNode));
  }, [reactFlowInstance, setNodes]);

  const onConnect = useCallback((params) => {
    const newEdge = {
      id: crypto.randomUUID(),
      source: params.source,
      target: params.target,
      label: '',
      data: {},
    };
    setEdges(eds => eds.concat(newEdge));
  }, [setEdges]);

  const onEdgeDoubleClick = useCallback((event, edge) => {
    const newLabel = prompt('Edge label (bv. "ja", "nee", "deal > 50k"):', edge.label || '');
    if (newLabel !== null) {
      setEdges(eds => eds.map(e => e.id === edge.id ? { ...e, label: newLabel } : e));
    }
  }, [setEdges]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleChangeConfig = useCallback((newConfig) => {
    setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, config: newConfig } } : n));
  }, [selectedNodeId, setNodes]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
    setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#888780' }}>Loading playbook...</div>;
  if (error) return <div style={{ padding:40, color:'#dc2626' }}>Error: {error}</div>;

  return (
    <div style={{ display:'flex', width:'100%', height:'100%' }}>
      <NodePalette />
      <div style={{ flex:1, position:'relative' }}>
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
          onConnect={onConnect}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      <PropertyPanel
        selectedNode={selectedNode}
        onChangeConfig={handleChangeConfig}
        onDeleteNode={handleDeleteNode}
      />
    </div>
  );
}

function PlaybookListing({ onOpenPlaybook }) {
  const [playbooks, setPlaybooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    listPlaybooks()
      .then(rows => { setPlaybooks(rows); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const pb = await createPlaybook(newName.trim());
      setNewName('');
      onOpenPlaybook(pb.id);
    } catch (err) {
      alert('Kan playbook niet aanmaken: ' + err.message);
    }
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#888780' }}>Loading...</div>;
  if (error) return <div style={{ padding:40, color:'#dc2626' }}>Error: {error}</div>;

  return (
    <div style={{ padding:24, maxWidth:800, margin:'0 auto' }}>
      <h2 style={{ fontSize:14, marginBottom:16 }}>Playbooks</h2>

      <div style={{ background:'#F1EFE8', padding:12, borderRadius:6, marginBottom:20, display:'flex', gap:8 }}>
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Nieuwe playbook naam..."
          style={{ flex:1, padding:'6px 10px', border:'0.5px solid #D3D1C7', borderRadius:4, fontSize:12, fontFamily:'inherit' }}
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim()}
          style={{ padding:'6px 14px', background:'#378ADD', color:'#fff', border:'none', borderRadius:4, fontSize:12, cursor: newName.trim() ? 'pointer' : 'not-allowed', opacity: newName.trim() ? 1 : 0.5 }}>
          + Nieuwe playbook
        </button>
      </div>

      {playbooks.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'#888780', fontSize:12 }}>
          Nog geen playbooks. Maak je eerste hierboven aan.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {playbooks.map(pb => (
            <div
              key={pb.id}
              onClick={() => onOpenPlaybook(pb.id)}
              style={{ background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:6, padding:12, cursor:'pointer',
                       display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:500, fontSize:13 }}>{pb.name}</div>
                <div style={{ fontSize:10, color:'#888780', marginTop:2 }}>
                  {pb.status} · v{pb.version} · trigger: {pb.trigger_type || '(geen)'}
                </div>
              </div>
              <div style={{ fontSize:11, color:'#888780' }}>{new Date(pb.created_at).toLocaleDateString('nl-NL')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
