import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/apiFetch';

export default function LinkedInCompose({ open, onClose, contactName, linkedinUrl }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [accountId, setAccountId] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  // Fetch Unipile LinkedIn account ID on mount
  useEffect(() => {
    if (open && !accountId) {
      setLoadingAccount(true);
      apiFetch('/api/unipile?action=list-accounts')
        .then(r => r.json())
        .then(data => {
          if (data.success && data.data) {
            // Find the LinkedIn account
            const accounts = Array.isArray(data.data) ? data.data : (data.data.items || data.data.accounts || []);
            const li = accounts.find(a =>
              (a.type || '').toLowerCase().includes('linkedin') ||
              (a.provider || '').toLowerCase().includes('linkedin')
            );
            if (li) setAccountId(li.id);
          }
          setLoadingAccount(false);
        })
        .catch(() => setLoadingAccount(false));
    }
  }, [open]);

  if (!open) return null;

  const handleSend = async () => {
    if (!text.trim() || !accountId || !linkedinUrl) return;
    setSending(true);
    setResult(null);

    try {
      // Step 1: Resolve LinkedIn URL to provider ID
      setResult({ info: 'Looking up LinkedIn profile...' });
      const resolveResp = await apiFetch(`/api/unipile?action=resolve-user&account_id=${accountId}&linkedin_url=${encodeURIComponent(linkedinUrl)}`);
      const resolveData = await resolveResp.json();

      if (!resolveData.success || !resolveData.provider_id) {
        setResult({ error: resolveData.error || 'Could not find LinkedIn profile. Make sure the LinkedIn URL is correct.' });
        setSending(false);
        return;
      }

      // Step 2: Start chat with the provider ID
      setResult({ info: 'Sending message...' });
      const resp = await apiFetch('/api/unipile?action=start-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          attendee_id: resolveData.provider_id,
          text: text.trim(),
        }),
      });
      const data = await resp.json();

      if (data.success) {
        setResult({ success: true });
        setTimeout(() => { onClose(); setText(''); setResult(null); }, 2000);
      } else {
        setResult({ error: data.error || data.details?.title || 'Failed to send message' });
      }
    } catch (e) {
      setResult({ error: e.message });
    }
    setSending(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: "24px 28px", width: 480, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 18 }}>in</span>
          <div style={{ fontSize: 16, fontWeight: 500 }}>LinkedIn message to {contactName}</div>
        </div>

        {loadingAccount ? (
          <div style={{ padding: 20, textAlign: "center", color: "#888780", fontSize: 12 }}>Loading LinkedIn account...</div>
        ) : !accountId ? (
          <div style={{ padding: 20, textAlign: "center", color: "#dc2626", fontSize: 12 }}>
            No LinkedIn account connected in Unipile. Go to your Unipile dashboard to connect your LinkedIn account.
          </div>
        ) : (
          <>
            {!linkedinUrl && (
              <div style={{ background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#dc2626", marginBottom: 12 }}>
                This contact has no LinkedIn URL. Add their LinkedIn profile first.
              </div>
            )}

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Type your message..."
              rows={5}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "0.5px solid #D3D1C7", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", marginBottom: 12, boxSizing: "border-box" }}
            />

            {result && result.info && (
              <div style={{ fontSize: 11, color: "#378ADD", marginBottom: 8 }}>⟳ {result.info}</div>
            )}
            {result && result.error && (
              <div style={{ fontSize: 11, color: "#dc2626", marginBottom: 8 }}>{result.error}</div>
            )}
            {result && result.success && (
              <div style={{ fontSize: 11, color: "#1D9E75", marginBottom: 8 }}>✓ Message sent via LinkedIn</div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { onClose(); setText(''); setResult(null); }}
                style={{ padding: "7px 16px", borderRadius: 7, border: "0.5px solid #D3D1C7", fontSize: 12, cursor: "pointer", background: "#fff", color: "#2C2C2A", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleSend}
                disabled={sending || !text.trim() || !linkedinUrl || !accountId}
                style={{ padding: "7px 16px", borderRadius: 7, border: "none", fontSize: 12, cursor: (text.trim() && linkedinUrl && accountId) ? "pointer" : "not-allowed", background: (text.trim() && linkedinUrl) ? "#0A66C2" : "#D3D1C7", color: "#fff", fontFamily: "inherit", fontWeight: 500 }}>
                {sending ? 'Sending...' : 'Send via LinkedIn'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
