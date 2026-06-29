import { createContext, useContext } from 'react';

// Lookups + node-callbacks voor ContactNode, los van node.data zodat de
// opgeslagen graph puur blijft (alleen contactId + dealRefs).
export const OrganogramContext = createContext({
  contactsById: {},        // { [contactId]: adaptedContact }
  dealsById: {},           // { [dealId]: adaptedDeal }
  onRequestAttachDeal: () => {},  // (nodeId) => void  — opent DealPicker
  onRemoveDeal: () => {},         // (nodeId, dealRef) => void
  onRemoveNode: () => {},         // (nodeId) => void  — haalt blokje van canvas
  onOpenDeal: () => {},           // (deal) => void
});

export function useOrganogram() {
  return useContext(OrganogramContext);
}
