import { useState } from 'react';
import { avatarColorFromName, getInitials } from '../../lib/constants';
import Avatar from '../atoms/Avatar';
import Btn from '../atoms/Btn';
import Empty from '../atoms/Empty';

import AddContactModal from '../forms/AddContactModal';

export default function ContactsList({ contacts, accounts, onSelectContact, refetch }) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [sortBy, setSortBy] = useState('recent');

  const getAcc = (id) => accounts.find(a => a.id === id);

  const filtered = contacts
    .filter(c => {
      if (!search) return true;
      const t = search.toLowerCase();
      return c.name.toLowerCase().includes(t) ||
        c.role.toLowerCase().includes(t) ||
        c.email.toLowerCase().includes(t) ||
        (getAcc(c.accountId)?.name || '').toLowerCase().includes(t);
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        const dateA = a.updated_at || a.created_at || '';
        const dateB = b.updated_at || b.created_at || '';
        return dateB.localeCompare(dateA);
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ background: "#FFFFFF", borderBottom: "0.5px solid #D3D1C7", padding: "16px 18px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Contacts</div>
            <div style={{ fontSize: 12, color: "#888780", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
              {filtered.length} contacts
              <span style={{ display: "inline-flex", gap: 4, marginLeft: 4 }}>
                <button onClick={() => setSortBy('recent')} style={{ padding: "1px 6px", borderRadius: 4, border: "0.5px solid", borderColor: sortBy==='recent' ? "#185FA5" : "#D3D1C7", background: sortBy==='recent' ? "#E6F1FB" : "transparent", color: sortBy==='recent' ? "#0C447C" : "#888780", cursor: "pointer", fontFamily: "inherit", fontSize: 10 }}>Recent</button>
                <button onClick={() => setSortBy('az')} style={{ padding: "1px 6px", borderRadius: 4, border: "0.5px solid", borderColor: sortBy==='az' ? "#185FA5" : "#D3D1C7", background: sortBy==='az' ? "#E6F1FB" : "transparent", color: sortBy==='az' ? "#0C447C" : "#888780", cursor: "pointer", fontFamily: "inherit", fontSize: 10 }}>A–Z</button>
              </span>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ padding: "6px 14px", borderRadius: 7, border: "none", fontSize: 12, cursor: "pointer", background: "#042C53", color: "#B5D4F4", fontFamily: "inherit", fontWeight: 500 }}>+ Contact</button>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, role, email, company..."
          style={{ width: "100%", marginTop: 10, padding: "7px 11px", borderRadius: 7, border: "0.5px solid #D3D1C7", fontSize: 12, background: "#F1EFE8", color: "#2C2C2A", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
        />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
        {filtered.length === 0 ? (
          <Empty text={search ? `No results for "${search}".` : "No contacts."} />
        ) : (
          filtered.map(c => {
            const acc = getAcc(c.accountId);
            return (
              <div key={c.id}
                onClick={() => onSelectContact && onSelectContact(c)}
                style={{
                  background: "#FFFFFF", borderRadius: 9, border: "0.5px solid #D3D1C7",
                  padding: "12px 14px", marginBottom: 6, display: "flex", alignItems: "center",
                  gap: 12, cursor: "pointer"
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#888780"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#D3D1C7"}
              >
                <Avatar initials={c.initials} bg={c.avatarBg} color={c.avatarColor} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#888780", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.role}{acc ? ` · ${acc.name}` : ''}
                  </div>
                  {c.email && <div style={{ fontSize: 11, color: "#378ADD", marginTop: 1 }}>{c.email}</div>}
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <Btn small>✉</Btn>
                  <Btn small>◎</Btn>
                </div>
              </div>
            );
          })
        )}
      </div>
      <AddContactModal open={showAdd} onClose={() => setShowAdd(false)} refetch={refetch} accounts={accounts} />
    </div>
  );
}
