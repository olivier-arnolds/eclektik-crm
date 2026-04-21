// Compose modal — AI draft, tone/channel/template, send
(function () {
  const { useState, useEffect, useMemo } = React;

  const TONES = ['Professional', 'Warm', 'Executive', 'Direct'];
  const CHANNELS = ['email', 'teams', 'whatsapp', 'linkedin'];
  const TEMPLATES = ['Follow-up', 'Proposal cover', 'Check-in', 'Escalation', 'Meeting recap'];

  function ComposeModal({ ctx, onClose, onSend, onConvertToAction }) {
    const account = ctx.accountId ? BD_DATA.byId.account(ctx.accountId) : null;
    const contact = ctx.contactId ? BD_DATA.byId.contact(ctx.contactId) : null;
    const deal = ctx.dealId ? BD_DATA.byId.deal(ctx.dealId) : null;

    const [tone, setTone] = useState('Professional');
    const [channel, setChannel] = useState(ctx.channel || 'email');
    const [template, setTemplate] = useState('Follow-up');
    const [contextNotes, setContextNotes] = useState(ctx.prefill || '');
    const [draft, setDraft] = useState('');
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const generate = () => {
      setGenerating(true);
      setDraft('');
      // Fake streaming
      const lines = buildDraft({ tone, channel, template, contextNotes, account, contact, deal });
      let i = 0;
      const chars = lines.join('\n');
      const t = setInterval(() => {
        i += Math.max(2, Math.floor(Math.random()*6));
        setDraft(chars.slice(0, i));
        if (i >= chars.length) { clearInterval(t); setGenerating(false); }
      }, 18);
    };

    useEffect(() => {
      // auto-generate when opening
      generate();
      // eslint-disable-next-line
    }, []);

    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal modal-compose" onClick={e=>e.stopPropagation()}>
          <div className="compose-header">
            <div className="compose-to">
              <span className="compose-label">To</span>
              {contact && <span className="pill"><Avatar name={contact.name} size={14} color="oklch(62% 0.08 220)"/> {contact.name}</span>}
              {account && !contact && <span className="pill"><AccountMark account={account} size={14}/> {account.name}</span>}
              {!account && !contact && <span className="pill pill-muted">No recipient</span>}
              <ChannelIcon ch={channel} size={12}/>
            </div>
            <button className="icon-btn" onClick={onClose}><I.close/></button>
          </div>

          <div className="compose-split">
            <div className="compose-inputs">
              <div className="compose-field">
                <label>Context or Copilot summary</label>
                <textarea
                  rows={4}
                  placeholder="Paste notes, meeting summary, or the thread you're responding to…"
                  value={contextNotes}
                  onChange={e=>setContextNotes(e.target.value)}
                />
              </div>

              <div className="compose-field">
                <label>Tone</label>
                <div className="chip-row">
                  {TONES.map(t => (
                    <button key={t} className={`chip ${tone===t?'chip-on':''}`} onClick={()=>setTone(t)}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="compose-field">
                <label>Channel</label>
                <div className="chip-row">
                  {CHANNELS.map(c => (
                    <button key={c} className={`chip ${channel===c?'chip-on':''}`} onClick={()=>setChannel(c)}>
                      <ChannelIcon ch={c} size={10}/>
                      <span>{c}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="compose-field">
                <label>Template</label>
                <div className="chip-row">
                  {TEMPLATES.map(t => (
                    <button key={t} className={`chip ${template===t?'chip-on':''}`} onClick={()=>setTemplate(t)}>{t}</button>
                  ))}
                </div>
              </div>

              <button className="btn-primary compose-regen" onClick={generate} disabled={generating}>
                <I.sparkle/>
                {generating ? 'Drafting…' : 'Regenerate draft'}
              </button>
            </div>

            <div className="compose-draft">
              <div className="draft-header">
                <span className="draft-title">
                  <I.sparkle/>
                  <span>AI draft</span>
                  {generating && <span className="draft-status">streaming…</span>}
                </span>
                <div className="draft-tools">
                  <button className="btn-ghost tiny" onClick={()=>{
                    navigator.clipboard?.writeText(draft);
                    setCopied(true); setTimeout(()=>setCopied(false), 1200);
                  }}>{copied ? 'Copied ✓' : 'Copy'}</button>
                </div>
              </div>
              <div className="draft-body">
                <pre>{draft}{generating && <span className="draft-cursor">▍</span>}</pre>
              </div>
              <div className="draft-actions">
                <button className="btn-ghost" onClick={()=>onConvertToAction && onConvertToAction({
                  title: `Follow-up: ${template}${account ? ' · '+account.name : ''}`,
                  accountId: account?.id, dealId: deal?.id,
                })}>
                  <I.calendar/> Schedule as action
                </button>
                <button className="btn-primary" onClick={()=>onSend({
                  channel, subject: subjectLine({template, account, deal}), body: draft, accountId: account?.id, dealId: deal?.id,
                })}>
                  <I.send/> {channel === 'email' ? 'Open in Outlook' : channel === 'teams' ? 'Post to Teams' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function subjectLine({ template, account, deal }) {
    const name = deal?.title || account?.name || '';
    return `${template}${name ? ' — ' + name : ''}`;
  }

  function buildDraft({ tone, channel, template, contextNotes, account, contact, deal }) {
    const hi = channel === 'teams' ? `@${contact?.name?.split(' ')[0] || 'team'}` :
               channel === 'whatsapp' ? `${contact?.name?.split(' ')[0] || 'Hi'} 👋` :
               `Dear ${contact?.name?.split(' ')[0] || 'there'},`;
    const sign = tone === 'Warm' ? '\nThanks,\nMichiel'
               : tone === 'Executive' ? '\nRegards,\nMichiel V.G.'
               : tone === 'Direct' ? '\n— M.'
               : '\nBest regards,\nMichiel';

    const opener = {
      'Professional': `Thank you for the time yesterday — the conversation on ${deal?.title || 'the partnership'} was useful.`,
      'Warm':         `Hope you're doing well. Really appreciated the conversation on ${deal?.title || 'the programme'}.`,
      'Executive':    `Following our exchange on ${deal?.title || 'the engagement'}, a short note to consolidate the position.`,
      'Direct':       `Picking up on ${deal?.title || 'the thread'}.`,
    }[tone];

    const body = {
      'Follow-up': [
        `To close the loop:`,
        `• Revised scope reflects the Tier 2 carve-out we discussed`,
        `• Termination clause moved to 45 days as a compromise`,
        `• I'll circulate v3 for legal review by end of week`,
      ],
      'Proposal cover': [
        `Attached is the proposal for ${deal?.title || 'the engagement'}.`,
        `Headline numbers: ${deal ? fmtMoney(deal.value) : '—'}, 12-month term, quarterly governance.`,
        `Happy to walk through the pricing logic on a 20-minute call.`,
      ],
      'Check-in': [
        `Quick check-in — it's been a couple of weeks since we last connected.`,
        `Is there anything on your side where a nudge from us would help move things forward?`,
      ],
      'Escalation': [
        `Flagging this ahead of Thursday's board: we have two open items that need a decision by EOB Wednesday.`,
        `Happy to jump on a 15-minute call to unblock.`,
      ],
      'Meeting recap': [
        `Short recap of today's session:`,
        `• Decisions: Tier 2 MDF carve-out agreed; termination → 45 days`,
        `• Actions — me: send SOW v3, board one-pager`,
        `• Actions — ${contact?.name?.split(' ')[0] || 'you'}: board view on exclusivity (Thu)`,
      ],
    }[template];

    const ctxNote = contextNotes.trim()
      ? [``, `Context you provided:`, ...contextNotes.trim().split('\n').map(l => `> ${l}`)]
      : [];

    return [hi, ``, opener, ``, ...body, ...ctxNote, sign];
  }

  Object.assign(window, { ComposeModal });
})();
