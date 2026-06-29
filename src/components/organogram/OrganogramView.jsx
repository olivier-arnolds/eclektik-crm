import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ReactFlow, ReactFlowProvider, useNodesState, useEdgesState, Background, Controls, MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ContactNode from './ContactNode';
import OrgPalette from './OrgPalette';
import DealPicker from './DealPicker';
import { OrganogramContext } from './OrganogramContext';
import { loadOrganogram, saveOrganogram, edgeStyleFor, handlesFor } from './lib/organogramIO';

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
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Voorkomt autosave tijdens/direct na het laden van een account.
  const loadedAccountRef = useRef(null);
  const saveTimerRef = useRef(null);

  const accContacts = useMemo(
    () => (accountId
      ? contacts.filter(c => c.accountId === accountId && !c.isInactive)
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      : []),
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
      .catch(err => { alert('Loading failed: ' + err.message); })
      .finally(() => setLoading(false));
  }, [accountId, setNodes, setEdges]);

  // Autosave (gedebounced) bij elke wijziging, behalve tijdens laden.
  useEffect(() => {
    if (!accountId || loadedAccountRef.current !== accountId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveOrganogram(accountId, { nodes, edges })
        .then(() => setSaveError(false))
        .catch(err => { console.error('Org chart autosave failed:', err); setSaveError(true); });
    }, 600);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [nodes, edges, accountId]);

  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    if (!rfInstance) return;
    const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    // Placeholder ("onbekend contact"): node zonder contactId.
    if (e.dataTransfer.types.includes('application/organogram-unknown')) {
      setNodes(nds => nds.concat({
        id: crypto.randomUUID(), type: 'contactNode', position, data: { contactId: null, dealRefs: [], label: null },
      }));
      return;
    }
    const contactId = e.dataTransfer.getData('application/organogram-contact');
    if (!contactId) return;
    if (placedContactIds.has(contactId)) return; // geen dubbele
    setNodes(nds => nds.concat({
      id: crypto.randomUUID(), type: 'contactNode', position, data: { contactId, dealRefs: [], label: null },
    }));
  }, [rfInstance, setNodes, placedContactIds]);

  const onConnect = useCallback((params) => {
    // Relatie-type volgt uit welke kant je gebruikt: links/rechts = peer
    // (gelijk niveau), boven/onder = reports_to (hiërarchie). De handles
    // worden genormaliseerd zodat ze consistent zijn met laden uit de DB.
    const isPeer = ['left', 'right'].includes(params.sourceHandle) || ['left', 'right'].includes(params.targetHandle);
    const relType = isPeer ? 'peer' : 'reports_to';
    setEdges(eds => eds.concat({
      id: crypto.randomUUID(), source: params.source, target: params.target,
      ...handlesFor(relType), data: { relType }, ...edgeStyleFor(relType),
    }));
  }, [setEdges]);

  // Dubbelklik op een edge wisselt tussen reports_to en peer (incl. de kant
  // waar de lijn aanhecht, zodat de stijl en positie blijven kloppen).
  const onEdgeDoubleClick = useCallback((e, edge) => {
    const next = (edge.data?.relType === 'peer') ? 'reports_to' : 'peer';
    setEdges(eds => eds.map(x => x.id === edge.id
      ? { ...x, ...handlesFor(next), data: { relType: next }, ...edgeStyleFor(next) }
      : x));
  }, [setEdges]);

  // Context-callbacks voor ContactNode.
  const onRequestAttachDeal = useCallback((nodeId) => setDealPickerNodeId(nodeId), []);
  const onRemoveNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    const hasEdges = edges.some(e => e.source === nodeId || e.target === nodeId);
    // Een verbonden contact wegklikken behoudt de structuur: het wordt een
    // 'onbekend contact' (placeholder) op dezelfde plek met dezelfde lijnen,
    // en de contactpersoon komt weer terug in de linkerbalk. Een los blokje
    // (of placeholder) verdwijnt gewoon.
    if (node?.data.contactId && hasEdges) {
      setNodes(nds => nds.map(n => n.id === nodeId
        ? { ...n, data: { ...n.data, contactId: null, label: null, dealRefs: [] } }
        : n));
      return;
    }
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, [nodes, edges, setNodes, setEdges]);
  const onRemoveDeal = useCallback((nodeId, ref) => {
    setNodes(nds => nds.map(n => n.id === nodeId
      ? { ...n, data: { ...n.data, dealRefs: n.data.dealRefs.filter(r => r.id !== ref.id) } }
      : n));
  }, [setNodes]);
  // Vervang een placeholder door een echt contact (positie + lijnen blijven).
  const onReplaceNodeContact = useCallback((nodeId, contactId) => {
    setNodes(nds => {
      if (nds.some(n => n.data.contactId === contactId)) return nds; // al geplaatst
      return nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, contactId, label: null } } : n);
    });
  }, [setNodes]);
  const onSetNodeLabel = useCallback((nodeId, label) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label } } : n));
  }, [setNodes]);

  // Handmatig opslaan via de knop (naast de autosave), met zichtbare bevestiging.
  const handleSave = useCallback(async () => {
    if (!accountId) return;
    setSaving(true);
    try {
      await saveOrganogram(accountId, { nodes, edges });
      setSaveError(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      console.error('Org chart save failed:', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }, [accountId, nodes, edges]);

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
    contactsById, dealsById, onRequestAttachDeal, onRemoveDeal, onRemoveNode, onReplaceNodeContact, onSetNodeLabel, onOpenDeal: onOpenDeal || (() => {}),
  }), [contactsById, dealsById, onRequestAttachDeal, onRemoveDeal, onRemoveNode, onReplaceNodeContact, onSetNodeLabel, onOpenDeal]);

  return (
    <div className="lane" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Kop met account-kiezer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '0.5px solid var(--sep)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>Org.chart</span>
        <select value={accountId || ''}
          onChange={(e) => { const a = accounts.find(x => x.id === e.target.value); onPickAccount(a || null); }}
          style={{ flex: 1, maxWidth: 320, padding: '5px 8px', borderRadius: 4, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: 12, fontFamily: 'inherit' }}>
          <option value="">— Choose an account —</option>
          {[...accounts].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        {saveError && (
          <span title="Changes could not be saved. Check your connection."
            style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            ⚠ not saved
          </span>
        )}
        {justSaved && !saveError && (
          <span style={{ fontSize: 11, color: 'var(--good)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            ✓ saved
          </span>
        )}
        {accountId && (
          <button className="btn-primary tiny" onClick={handleSave} disabled={saving}
            title="Save org chart"
            style={{ whiteSpace: 'nowrap' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
        {onToggleExpand && (
          <button className="btn-ghost tiny" onClick={onToggleExpand} title={expanded ? 'Show account panel' : 'Full width'}>
            {expanded ? '⇥ Panel' : '⇤ Wide'}
          </button>
        )}
      </div>

      {!accountId ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          Choose an account to build the org chart.
        </div>
      ) : (
        <OrganogramContext.Provider value={ctxValue}>
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <OrgPalette contacts={accContacts} placedContactIds={placedContactIds} dealCount={accDeals.length} />
            <div style={{ flex: 1, position: 'relative' }}>
              {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', zIndex: 5 }}>Loading…</div>}
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
