import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ReactFlow, ReactFlowProvider, useNodesState, useEdgesState, Background, Controls, MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ContactNode from './ContactNode';
import OrgPalette from './OrgPalette';
import DealPicker from './DealPicker';
import { OrganogramContext } from './OrganogramContext';
import { loadOrganogram, saveOrganogram, edgeStyleFor } from './lib/organogramIO';

const nodeTypes = { contactNode: ContactNode };

export default function OrganogramView(props) {
  return (
    <ReactFlowProvider>
      <OrganogramCanvas {...props} />
    </ReactFlowProvider>
  );
}

function OrganogramCanvas({ accountId, accounts, contacts, deals, onPickAccount, onOpenDeal, expanded, onToggleExpand }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rfInstance, setRfInstance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dealPickerNodeId, setDealPickerNodeId] = useState(null);
  const [saveError, setSaveError] = useState(false);

  // Voorkomt autosave tijdens/direct na het laden van een account.
  const loadedAccountRef = useRef(null);
  const saveTimerRef = useRef(null);

  const accContacts = useMemo(
    () => (accountId ? contacts.filter(c => c.accountId === accountId && !c.isInactive) : []),
    [contacts, accountId]
  );
  const accDeals = useMemo(
    () => (accountId ? deals.filter(d => d.accountId === accountId) : []),
    [deals, accountId]
  );

  const contactsById = useMemo(() => Object.fromEntries(contacts.map(c => [c.id, c])), [contacts]);
  const dealsById = useMemo(() => Object.fromEntries(deals.map(d => [d.id, d])), [deals]);
  const placedContactIds = useMemo(() => new Set(nodes.map(n => n.data.contactId)), [nodes]);

  // Laad de graph wanneer het account wijzigt.
  useEffect(() => {
    if (!accountId) { setNodes([]); setEdges([]); loadedAccountRef.current = null; return; }
    setLoading(true);
    loadedAccountRef.current = null; // markeer "nog niet geladen" zodat autosave wacht
    loadOrganogram(accountId)
      .then(({ nodes, edges }) => { setNodes(nodes); setEdges(edges); loadedAccountRef.current = accountId; })
      .catch(err => { alert('Laden mislukt: ' + err.message); })
      .finally(() => setLoading(false));
  }, [accountId, setNodes, setEdges]);

  // Autosave (gedebounced) bij elke wijziging, behalve tijdens laden.
  useEffect(() => {
    if (!accountId || loadedAccountRef.current !== accountId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveOrganogram(accountId, { nodes, edges })
        .then(() => setSaveError(false))
        .catch(err => { console.error('Organogram autosave faalde:', err); setSaveError(true); });
    }, 600);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [nodes, edges, accountId]);

  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const contactId = e.dataTransfer.getData('application/organogram-contact');
    if (!contactId || !rfInstance) return;
    if (placedContactIds.has(contactId)) return; // geen dubbele
    const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setNodes(nds => nds.concat({
      id: crypto.randomUUID(), type: 'contactNode', position, data: { contactId, dealRefs: [] },
    }));
  }, [rfInstance, setNodes, placedContactIds]);

  const onConnect = useCallback((params) => {
    setEdges(eds => eds.concat({
      id: crypto.randomUUID(), source: params.source, target: params.target,
      data: { relType: 'reports_to' }, ...edgeStyleFor('reports_to'),
    }));
  }, [setEdges]);

  // Dubbelklik op een edge wisselt tussen reports_to en peer.
  const onEdgeDoubleClick = useCallback((e, edge) => {
    const next = (edge.data?.relType === 'peer') ? 'reports_to' : 'peer';
    setEdges(eds => eds.map(x => x.id === edge.id ? { ...x, data: { relType: next }, ...edgeStyleFor(next) } : x));
  }, [setEdges]);

  // Context-callbacks voor ContactNode.
  const onRequestAttachDeal = useCallback((nodeId) => setDealPickerNodeId(nodeId), []);
  const onRemoveDeal = useCallback((nodeId, ref) => {
    setNodes(nds => nds.map(n => n.id === nodeId
      ? { ...n, data: { ...n.data, dealRefs: n.data.dealRefs.filter(r => r.id !== ref.id) } }
      : n));
  }, [setNodes]);

  const handlePickDeal = useCallback((dealId) => {
    const deal = dealsById[dealId];
    if (!deal) { setDealPickerNodeId(null); return; }
    const ref = { table: deal.table, id: deal.id };
    setNodes(nds => nds.map(n => {
      if (n.id !== dealPickerNodeId) return n;
      if (n.data.dealRefs.some(r => r.id === ref.id)) return n; // al gekoppeld
      return { ...n, data: { ...n.data, dealRefs: n.data.dealRefs.concat(ref) } };
    }));
    setDealPickerNodeId(null);
  }, [dealsById, dealPickerNodeId, setNodes]);

  const ctxValue = useMemo(() => ({
    contactsById, dealsById, onRequestAttachDeal, onRemoveDeal, onOpenDeal: onOpenDeal || (() => {}),
  }), [contactsById, dealsById, onRequestAttachDeal, onRemoveDeal, onOpenDeal]);

  return (
    <div className="lane" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Kop met account-kiezer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '0.5px solid var(--sep)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>Organogram</span>
        <select value={accountId || ''}
          onChange={(e) => { const a = accounts.find(x => x.id === e.target.value); onPickAccount(a || null); }}
          style={{ flex: 1, maxWidth: 320, padding: '5px 8px', borderRadius: 4, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: 12, fontFamily: 'inherit' }}>
          <option value="">— Kies een account —</option>
          {[...accounts].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        {saveError && (
          <span title="Wijzigingen konden niet automatisch worden opgeslagen. Controleer je verbinding."
            style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            ⚠ niet opgeslagen
          </span>
        )}
        {onToggleExpand && (
          <button className="btn-ghost tiny" onClick={onToggleExpand} title={expanded ? 'Toon accountpaneel' : 'Volledig scherm'}>
            {expanded ? '⇥ Paneel' : '⇤ Breed'}
          </button>
        )}
      </div>

      {!accountId ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          Kies een account om het organogram te bouwen.
        </div>
      ) : (
        <OrganogramContext.Provider value={ctxValue}>
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <OrgPalette contacts={accContacts} placedContactIds={placedContactIds} dealCount={accDeals.length} />
            <div style={{ flex: 1, position: 'relative' }}>
              {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', zIndex: 5 }}>Laden…</div>}
              <ReactFlow
                nodes={nodes} edges={edges}
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                onConnect={onConnect} onEdgeDoubleClick={onEdgeDoubleClick}
                nodeTypes={nodeTypes} onInit={setRfInstance}
                onDrop={onDrop} onDragOver={onDragOver} fitView>
                <Background />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </div>
          </div>
        </OrganogramContext.Provider>
      )}

      {dealPickerNodeId && (
        <DealPicker deals={accDeals} onPick={handlePickDeal} onClose={() => setDealPickerNodeId(null)} />
      )}
    </div>
  );
}
