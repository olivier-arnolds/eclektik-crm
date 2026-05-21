import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import BuilderToolbar from './panels/BuilderToolbar';
import { validatePlaybook, hasErrors } from './lib/playbookValidation';
import { publishPlaybookVersion } from './lib/playbookVersioning';
import { listPlaybooks, createPlaybook, loadPlaybookGraph, savePlaybookGraph, getPlaybook } from './lib/playbookGraphIO';

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

  const [playbookMeta, setPlaybookMeta] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadPlaybookGraph(playbookId),
      getPlaybook(playbookId),
    ])
      .then(([{ nodes, edges }, meta]) => {
        setNodes(nodes);
        setEdges(edges);
        setPlaybookMeta(meta);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [playbookId, setNodes, setEdges]);

  const issues = useMemo(() => validatePlaybook({ nodes, edges }), [nodes, edges]);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await savePlaybookGraph(playbookId, { nodes, edges });
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (hasErrors(issues)) {
      alert('Fix errors voor publish.');
      return;
    }
    setPublishing(true);
    try {
      await savePlaybookGraph(playbookId, { nodes, edges });
      const newVersion = await publishPlaybookVersion(playbookId, { nodes, edges }, null);
      setPlaybookMeta(m => ({ ...m, version: newVersion, status: 'active' }));
      alert(`Gepubliceerd als v${newVersion}.`);
    } catch (err) {
      alert('Publish failed: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

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
    <div style={{ display:'flex', flexDirection:'column', width:'100%', height:'100%' }}>
      <BuilderToolbar
        playbookName={playbookMeta?.name}
        version={playbookMeta?.version}
        status={playbookMeta?.status}
        saving={saving}
        publishing={publishing}
        issues={issues}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onClose={onClose}
      />
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <NodePalette />
        <div style={{ flex:1, position:'relative' }}>
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
