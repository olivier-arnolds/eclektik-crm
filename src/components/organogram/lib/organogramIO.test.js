import { describe, it, expect } from 'vitest';
import { rowsToFlow, flowToRows, edgeStyleFor, handlesFor } from './organogramIO';

describe('edgeStyleFor', () => {
  it('reports_to is een doorgetrokken lijn (geen dash)', () => {
    const s = edgeStyleFor('reports_to');
    expect(s.style.strokeDasharray).toBeUndefined();
  });
  it('peer is gestippeld', () => {
    const s = edgeStyleFor('peer');
    expect(s.style.strokeDasharray).toBe('6 4');
  });
  it('onbekend/leeg valt terug op reports_to-stijl', () => {
    expect(edgeStyleFor(undefined).style.strokeDasharray).toBeUndefined();
  });
});

describe('handlesFor', () => {
  it('peer koppelt rechts -> links (horizontaal)', () => {
    expect(handlesFor('peer')).toEqual({ sourceHandle: 'right', targetHandle: 'left' });
  });
  it('reports_to koppelt onder -> boven (verticaal)', () => {
    expect(handlesFor('reports_to')).toEqual({ sourceHandle: 'bottom', targetHandle: 'top' });
  });
  it('onbekend/leeg valt terug op verticaal', () => {
    expect(handlesFor(undefined)).toEqual({ sourceHandle: 'bottom', targetHandle: 'top' });
  });
});

describe('rowsToFlow', () => {
  it('mapt node-rijen naar React Flow nodes', () => {
    const { nodes } = rowsToFlow({
      nodeRows: [{ id: 'n1', contact_id: 'c1', pos_x: 10, pos_y: 20, deal_refs: [{ table: 'leads', id: 'd1' }] }],
      edgeRows: [],
    });
    expect(nodes).toEqual([{
      id: 'n1', type: 'contactNode', position: { x: 10, y: 20 },
      data: { contactId: 'c1', dealRefs: [{ table: 'leads', id: 'd1' }], label: null },
    }]);
  });

  it('mapt een placeholder-node (geen contact) met label', () => {
    const { nodes } = rowsToFlow({
      nodeRows: [{ id: 'n9', contact_id: null, pos_x: 1, pos_y: 2, label: 'Teamlead' }],
      edgeRows: [],
    });
    expect(nodes[0].data.contactId).toBeNull();
    expect(nodes[0].data.label).toBe('Teamlead');
  });

  it('mapt edge-rijen met relType en stijl', () => {
    const { edges } = rowsToFlow({
      nodeRows: [],
      edgeRows: [{ id: 'e1', source_node_id: 'n1', target_node_id: 'n2', rel_type: 'peer' }],
    });
    expect(edges[0].id).toBe('e1');
    expect(edges[0].source).toBe('n1');
    expect(edges[0].target).toBe('n2');
    expect(edges[0].data.relType).toBe('peer');
    expect(edges[0].style.strokeDasharray).toBe('6 4');
    expect(edges[0].sourceHandle).toBe('right');
    expect(edges[0].targetHandle).toBe('left');
  });

  it('vult ontbrekende deal_refs aan tot lege array en pos tot 0', () => {
    const { nodes } = rowsToFlow({ nodeRows: [{ id: 'n1', contact_id: 'c1' }], edgeRows: [] });
    expect(nodes[0].data.dealRefs).toEqual([]);
    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
  });
});

describe('flowToRows', () => {
  it('mapt React Flow nodes/edges terug naar DB-rijen met company_id', () => {
    const { nodeRows, edgeRows } = flowToRows('comp1', {
      nodes: [{ id: 'n1', position: { x: 5, y: 6 }, data: { contactId: 'c1', dealRefs: [{ table: 'opportunities', id: 'd9' }] } }],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', data: { relType: 'peer' } }],
    });
    expect(nodeRows).toEqual([{
      id: 'n1', company_id: 'comp1', contact_id: 'c1',
      pos_x: 5, pos_y: 6, deal_refs: [{ table: 'opportunities', id: 'd9' }], label: null,
    }]);
    expect(edgeRows).toEqual([{
      id: 'e1', company_id: 'comp1', source_node_id: 'n1', target_node_id: 'n2', rel_type: 'peer',
    }]);
  });

  it('placeholder-node: contact_id null + label bewaard', () => {
    const { nodeRows } = flowToRows('comp1', {
      nodes: [{ id: 'n9', position: { x: 0, y: 0 }, data: { contactId: null, dealRefs: [], label: 'Teamlead' } }],
      edges: [],
    });
    expect(nodeRows[0].contact_id).toBeNull();
    expect(nodeRows[0].label).toBe('Teamlead');
  });

  it('default rel_type is reports_to wanneer data.relType ontbreekt', () => {
    const { edgeRows } = flowToRows('comp1', {
      nodes: [], edges: [{ id: 'e1', source: 'n1', target: 'n2', data: {} }],
    });
    expect(edgeRows[0].rel_type).toBe('reports_to');
  });

  it('round-trip rowsToFlow → flowToRows behoudt kernvelden', () => {
    const nodeRows = [{ id: 'n1', contact_id: 'c1', pos_x: 1, pos_y: 2, deal_refs: [] }];
    const edgeRows = [{ id: 'e1', source_node_id: 'n1', target_node_id: 'n2', rel_type: 'reports_to' }];
    const flow = rowsToFlow({ nodeRows, edgeRows });
    const back = flowToRows('comp1', flow);
    expect(back.nodeRows[0]).toMatchObject({ id: 'n1', contact_id: 'c1', pos_x: 1, pos_y: 2 });
    expect(back.edgeRows[0]).toMatchObject({ id: 'e1', source_node_id: 'n1', target_node_id: 'n2', rel_type: 'reports_to' });
  });
});
