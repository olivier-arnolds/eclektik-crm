import { useState, useEffect, useCallback, useMemo } from "react";
import DOMPurify from 'dompurify';
import { sc, docIcon, fmt } from '../../lib/constants';
import { updateRow, insertRow } from '../../hooks/useSupabase';
import { useItemCalendar } from '../../hooks/useItemCalendar';
import { useItemTasks } from '../../hooks/useItemTasks';
import { useItemActivityLog } from '../../hooks/useItemActivityLog';
import { supabase } from '../../supabase';
import ComposeEmail from '../forms/ComposeEmail';
import LinkedInCompose from '../forms/LinkedInCompose';
import Chip from '../atoms/Chip';
import Avatar from '../atoms/Avatar';
import Btn from '../atoms/Btn';
import Empty from '../atoms/Empty';
import SubBar from '../atoms/SubBar';
import ProjectPlanTab from './ProjectPlanTab';
import ItemRappelTab from './ItemRappelTab';
import EditableField from './EditableField';

export default function ItemDetail({ item, onBack, onSelectContact, extraTimeline, addNote, noteText, setNoteText, accounts, contacts, followUps, comms, tasks, calEvents, refetch }) {
  const getAcc = (id) => accounts.find(a => a.id === id);
  const getCts = (ids) => contacts.filter(c => ids && ids.includes(c.id));
  const rappelsFor = (id) => followUps.filter(r => r.itemIds.includes(id));
  const commsFor = (id) => comms.filter(c => c.itemIds.includes(id)).sort((a,b) => (b.date||'').localeCompare(a.date||''));
  const tasksFor = (id) => tasks.filter(t => t.itemIds.includes(id));
  const calFor = (id) => {
    const evs = calEvents.filter(e => e.itemIds.includes(id));
    const groups = {};
    evs.forEach(e => { if (!groups[e.dateLabel]) groups[e.dateLabel] = []; groups[e.dateLabel].push(e); });
    return Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0]));
  };

  const isProj = ['onboarding','active','inactive','past'].includes(item.funnelStage);
  const itemTable = item.funnelStage === 'lead' ? 'leads' : 'opportunities';
  const [tab, setTab] = useState(isProj ? "project plan" : "overview");
  const acc = getAcc(item.accountId);
  const isLD = !isProj;
  const stC = sc(item.subStatus||item.funnelStage);
  const partners = (item.partnerIds||[]).map(getAcc).filter(Boolean);
  const funder = item.funderId ? getAcc(item.funderId) : null;
  const timeline = [...(extraTimeline||[]), ...(item.timeline||[])];

  const tabs = isProj
    ? ["project plan","overview","follow-ups","activity log","tasks","calendar","documents","timeline"]
    : ["overview","follow-ups","activity log","tasks","calendar","documents","timeline"];

  const pendingR = rappelsFor(item.id).filter(r => r.status==="no-reply").length;

  // Convert to Opportunity state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertForm, setConvertForm] = useState({ estRevenue: item.value || 0, probability: item.probability || 50, closeDate: item.closeDate || '', productLine: '' });
  const [converting, setConverting] = useState(false);

  // Disqualify state
  const [showDisqualify, setShowDisqualify] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState('');
  const [disqualifying, setDisqualifying] = useState(false);

  const handleConvertToOpportunity = async () => {
    setConverting(true);
    let companyId = item.accountId;
    let companyName = acc?.name || item.company_name || '';
    let contactId = item.contactIds?.[0] || null;

    // Auto-create company if none linked
    if (!companyId && companyName) {
      const { data: newCompany } = await insertRow('companies', {
        name: companyName,
        website: item.website || null,
        linkedin_url: item.linkedin_url || null,
        type: 'Prospect',
        stage: 'Active',
        owner: item.owner || 'MVG',
      });
      if (newCompany?.id) companyId = newCompany.id;
    }

    // Auto-create contact if none linked
    if (!contactId && (item.full_name || item.email)) {
      const nameParts = (item.full_name || item.title || '').split(' ');
      const { data: newContact } = await insertRow('contacts', {
        full_name: item.full_name || item.title || '',
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: item.email || null,
        linkedin_url: item.linkedin_url || null,
        company_id: companyId || null,
        company_name: companyName,
        title: item.role || item.productLine || '',
        stage: 'Active',
        source: 'Lead conversion',
        owner: item.owner || 'MVG',
      });
      if (newContact?.id) contactId = newContact.id;
    }

    // Create opportunity
    await insertRow('opportunities', {
      topic: item.title,
      company_id: companyId,
      company_name: companyName,
      contact_id: contactId,
      stage: 'opportunity',
      sub_status: 'qualify',
      status: 'Open',
      est_revenue: convertForm.estRevenue || 0,
      probability: convertForm.probability || 0,
      est_close_date: convertForm.closeDate || null,
      product_line: convertForm.productLine || null,
      owner: item.owner || null,
    });
    await updateRow('leads', item.id, { status: 'Converted', converted: true });
    await refetch();
    setShowConvertModal(false);
    setConverting(false);
    onBack();
  };

  const handleDisqualify = async () => {
    setDisqualifying(true);
    await updateRow('leads', item.id, { status: 'Disqualified', sub_status: null, notes: (item.notes ? item.notes + '\n' : '') + 'Disqualified: ' + disqualifyReason });
    await refetch();
    setShowDisqualify(false);
    setDisqualifying(false);
    onBack();
  };

  const [showCompose, setShowCompose] = useState(false);
  const [composeEmail, setComposeEmail] = useState('');

  // Quick-action bar: LinkedIn compose
  const [showLinkedInCompose, setShowLinkedInCompose] = useState(false);

  // Playbook enrollment state
  const [showEnrollPlaybook, setShowEnrollPlaybook] = useState(false);
  const [availablePlaybooks, setAvailablePlaybooks] = useState(null);
  const [enrolling, setEnrolling] = useState(null);
  const [enrollResult, setEnrollResult] = useState(null);

  useEffect(() => {
    if (showEnrollPlaybook) {
      supabase.from('playbooks').select('*, playbook_steps(id)').in('status', ['active', 'draft'])
        .then(({ data }) => {
          setAvailablePlaybooks((data || []).map(pb => ({ ...pb, step_count: pb.playbook_steps?.length || 0 })));
        });
    }
  }, [showEnrollPlaybook]);

  const {
    items: activityLogItems,
    loading: activityLogLoading,
    expanded: expandedActivity,
    setExpanded: setExpandedActivity,
    refresh: loadActivityLog,
  } = useItemActivityLog(item, contacts, comms, { enabled: tab === 'activity log' });

  const {
    showTaskForm, setShowTaskForm,
    taskForm, setTaskForm, savingTask,
    toggleTask: handleToggleTask,
    createTask: handleCreateTask,
  } = useItemTasks(item, refetch);

  const contactEmailPrefill = getCts(item.contactIds).map(c => c.email).filter(Boolean).join(', ');
  const {
    graphEvents, graphCalLoading, graphCalError,
    showMeetingForm, setShowMeetingForm,
    meetingForm, setMeetingForm, savingMeeting,
    fetchGraphCal, createMeeting: handleCreateMeeting,
    groupedGraphEvents,
  } = useItemCalendar(item, refetch, contactEmailPrefill, { enabled: tab === 'calendar' });

  const fmtCalTime = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const fmtDateLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (d.getTime() === today.getTime()) return 'Today, ' + d.getDate() + ' ' + months[d.getMonth()];
    if (d.getTime() === tomorrow.getTime()) return 'Tomorrow, ' + d.getDate() + ' ' + months[d.getMonth()];
    return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()];
  };

  const evColors = ['#378ADD','#1D9E75','#D85A30','#7C5CFC','#E24B4A','#DAA520'];


  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ background:"#FFFFFF", borderBottom:"0.5px solid #D3D1C7", padding:"12px 18px 0", flexShrink:0 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:"#888780", fontFamily:"inherit", padding:0, marginBottom:10 }}>← back</button>
        <div style={{ display:"flex", alignItems:"flex-start", gap:12, paddingBottom:12 }}>
          <div style={{ width:44, height:44, borderRadius:10, background:stC.bg, color:stC.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
            {item.funnelStage==="lead"?"◈":item.funnelStage==="opportunity"?"◉":"●"}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:500 }}>{item.title}</div>
            <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap" }}>
              <Chip>{acc?.flag} {acc?.name}</Chip>
              <Chip bg={stC.bg} color={stC.color}>{item.funnelStage}</Chip>
              {item.productLine && item.productLine.split(",").map(pl => pl.trim()).filter(Boolean).map(pl => <Chip key={pl}>{pl}</Chip>)}
              <Chip>Owner: {item.owner}</Chip>
              {funder && <Chip bg="#FAEEDA" color="#633806">ECIF {fmt(item.fundingAmount||0)}</Chip>}
            </div>
            {isLD && item.subStatus && <div style={{ marginTop:10 }}><SubBar current={item.subStatus} /></div>}
            {item.funnelStage === 'lead' && (
              <div style={{ display:"flex", gap:6, marginTop:10 }}>
                <button onClick={() => setShowConvertModal(true)} style={{ padding:"5px 12px", borderRadius:6, border:"none", background:"#1D9E75", color:"#fff", fontSize:11, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>Convert to Opportunity</button>
                <button onClick={() => setShowDisqualify(true)} style={{ padding:"5px 12px", borderRadius:6, border:"0.5px solid #B4B2A9", background:"#F1EFE8", color:"#888780", fontSize:11, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>Disqualify</button>
              </div>
            )}
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontSize:22, fontWeight:500 }}>{fmt(item.value)}</div>
            {isLD && <div style={{ fontSize:12, color:"#888780", marginTop:2 }}>{item.probability}% · closes {item.closeDate}</div>}
            {item.startDate && <div style={{ fontSize:12, color:"#888780", marginTop:2 }}>{item.startDate}{item.endDate?` → ${item.endDate}`:""}</div>}
          </div>
        </div>
        {/* Quick-action bar */}
        <div style={{ display:"flex", gap:8, padding:"8px 0 6px", borderTop:"0.5px solid #D3D1C7", marginLeft:-18, marginRight:-18, paddingLeft:18, paddingRight:18 }}>
          <button onClick={() => { const c = getCts(item.contactIds)[0]; setComposeEmail(c?.email || item.email || ''); setShowCompose(true); }}
            style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"6px 10px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:11, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", fontWeight:500 }}>
            &#9993; Send Email
          </button>
          <button onClick={() => setShowLinkedInCompose(true)}
            style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"6px 10px", borderRadius:7, border:"0.5px solid #0A66C2", fontSize:11, cursor:"pointer", background:"#fff", color:"#0A66C2", fontFamily:"inherit", fontWeight:500 }}>
            in Send LinkedIn Message
          </button>
          <button onClick={() => setShowEnrollPlaybook(true)}
            style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"6px 10px", borderRadius:7, border:"0.5px solid #7C5CFC", fontSize:11, cursor:"pointer", background:"#fff", color:"#7C5CFC", fontFamily:"inherit", fontWeight:500 }}>
            &#128203; Enroll in Playbook
          </button>
        </div>
        <div style={{ display:"flex", borderTop:"0.5px solid #D3D1C7", marginLeft:-18, marginRight:-18, paddingLeft:18, overflowX:"auto" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding:"8px 12px", fontSize:11, cursor:"pointer", background:"transparent", border:"none", borderBottom:tab===t?"2px solid #378ADD":"2px solid transparent", color:tab===t?"#2C2C2A":"#888780", fontWeight:tab===t?500:400, fontFamily:"inherit", textTransform:"capitalize", whiteSpace:"nowrap", flexShrink:0 }}>
              {t}
              {t==="follow-ups" && pendingR>0 && <span style={{ marginLeft:3, background:"#E24B4A", color:"#fff", fontSize:9, padding:"1px 4px", borderRadius:6 }}>{pendingR}</span>}
              {t==="activity log" && commsFor(item.id).filter(c=>c.unread).length>0 && <span style={{ marginLeft:3, background:"#378ADD", color:"#fff", fontSize:9, padding:"1px 4px", borderRadius:6 }}>{commsFor(item.id).filter(c=>c.unread).length}</span>}
              {t==="tasks" && tasksFor(item.id).filter(t=>!t.done).length>0 && <span style={{ marginLeft:3, background:"#888780", color:"#fff", fontSize:9, padding:"1px 4px", borderRadius:6 }}>{tasksFor(item.id).filter(t=>!t.done).length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"16px 18px" }}>
        {tab==="project plan" && <ProjectPlanTab item={item} />}
        {tab==="overview" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"12px 14px" }}>
              <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Parties</div>
              {[{ label:"Client", a:acc }, ...partners.map(p=>({ label:"Partner", a:p })), funder?{ label:item.funderLabel||"Funder", a:funder, funding:item.fundingAmount }:null].filter(Boolean).map((p,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:"0.5px solid #F1EFE8" }}>
                  <span style={{ fontSize:18 }}>{p.a?.flag}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500 }}>{p.a?.name}</div>
                    <div style={{ fontSize:11, color:"#888780" }}>{p.label}</div>
                  </div>
                  {p.funding && <Chip bg="#FAEEDA" color="#633806" size={10}>€{(p.funding/1000).toFixed(0)}k ECIF</Chip>}
                </div>
              ))}
            </div>
            <div style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"12px 14px" }}>
              <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Contacts</div>
              {getCts(item.contactIds).map(c => (
                <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <Avatar initials={c.initials} bg={c.avatarBg} color={c.avatarColor} size={32} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color: onSelectContact ? "#378ADD" : undefined, cursor: onSelectContact ? "pointer" : undefined }} onClick={() => onSelectContact && onSelectContact(c)} onMouseEnter={e => { if (onSelectContact) e.currentTarget.style.textDecoration = 'underline'; }} onMouseLeave={e => { if (onSelectContact) e.currentTarget.style.textDecoration = 'none'; }}>{c.name}</div>
                    <div style={{ fontSize:11, color:"#888780" }}>{c.role} · {getAcc(c.accountId)?.name}</div>
                    <div style={{ fontSize:11, color:"#5F5E5A", marginTop:2 }}>
                      <EditableField value={c.email || ""} field="email" table="contacts" rowId={c.id} type="text" displayValue={c.email || "Add email..."} refetch={refetch} updateRow={updateRow} />
                    </div>
                    <div style={{ fontSize:11, color:"#5F5E5A", marginTop:1 }}>
                      <EditableField value={c.phone || ""} field="phone" table="contacts" rowId={c.id} type="text" displayValue={c.phone || "Add phone..."} refetch={refetch} updateRow={updateRow} />
                    </div>
                    {c.source && <div style={{ fontSize:10, color:"#378ADD", marginTop:2 }}>Source: {c.source}</div>}
                  </div>
                  <div style={{ display:"flex", gap:5 }}><Btn small onClick={() => { setComposeEmail(c.email || ''); setShowCompose(true); }}>✉</Btn><Btn small>◎</Btn></div>
                </div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              <div style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:500, marginBottom:4 }}>Value</div>
                <div style={{ fontSize:14, fontWeight:500 }}>
                  <EditableField value={item.value} field="value" table={itemTable} rowId={item.id} type="number" displayValue={fmt(item.value)} refetch={refetch} updateRow={updateRow} />
                </div>
              </div>
              <div style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:500, marginBottom:4 }}>{isLD ? "Probability" : "Owner"}</div>
                <div style={{ fontSize:14, fontWeight:500 }}>
                  {isLD
                    ? <EditableField value={item.probability} field="probability" table={itemTable} rowId={item.id} type="number" suffix="%" refetch={refetch} updateRow={updateRow} />
                    : <EditableField value={item.owner} field="owner" table={itemTable} rowId={item.id} options={["MVG","OA","YK"]} refetch={refetch} updateRow={updateRow} />
                  }
                </div>
              </div>
              <div style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:500, marginBottom:4 }}>{isLD ? "Close date" : "Period"}</div>
                <div style={{ fontSize:14, fontWeight:500 }}>
                  {isLD
                    ? <EditableField value={item.closeDate} field="close_date" table={itemTable} rowId={item.id} type="date" refetch={refetch} updateRow={updateRow} />
                    : <EditableField value={item.startDate || ""} field="start_date" table={itemTable} rowId={item.id} type="date" displayValue={item.startDate || "—"} refetch={refetch} updateRow={updateRow} />
                  }
                </div>
              </div>
            </div>
            <div style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"12px 14px", marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Type / Product Line</div>
              <div style={{ fontSize:13 }}>
                <EditableField value={item.productLine || ""} field="product_line" table={itemTable} rowId={item.id} type="multiselect" options={["Glint","ROI","Seer","Insights","Other"]} displayValue={item.productLine ? item.productLine.split(",").map(s=>s.trim()).filter(Boolean).join(", ") : "Select types..."} refetch={refetch} updateRow={updateRow} />
              </div>
            </div>
            <div style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"12px 14px" }}>
              <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Notes</div>
              <div style={{ fontSize:13, color:"#5F5E5A", lineHeight:1.6 }}>
                <EditableField value={item.notes || ""} field="notes" table={itemTable} rowId={item.id} type="textarea" displayValue={item.notes || "Click to add notes..."} refetch={refetch} updateRow={updateRow} />
              </div>
            </div>
          </div>
        )}
        {tab==="follow-ups" && <ItemRappelTab itemId={item.id} item={item} followUps={followUps} contacts={contacts} refetch={refetch} />}
        {tab==="activity log" && (
          <div>
            <div style={{ display:"flex", gap:6, marginBottom:10 }}>
              <button onClick={() => { const c = getCts(item.contactIds)[0]; setComposeEmail(c?.email || item.email || ''); setShowCompose(true); }} style={{ flex:1, display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", justifyContent:"center", fontWeight:500 }}>&#9993; Compose</button>
              <button onClick={() => setShowLinkedInCompose(true)} style={{ flex:1, display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:7, border:"0.5px solid #0A66C2", fontSize:12, cursor:"pointer", background:"#fff", color:"#0A66C2", fontFamily:"inherit", justifyContent:"center", fontWeight:500 }}>in LinkedIn</button>
              <button onClick={loadActivityLog} style={{ padding:"7px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, cursor:"pointer", background:"#fff", color:"#888780", fontFamily:"inherit" }}>&#8635; Refresh</button>
            </div>
            {activityLogLoading ? (
              <div style={{ textAlign:"center", padding:20, color:"#888780", fontSize:12 }}>Loading activity log...</div>
            ) : activityLogItems.length === 0 ? (
              <Empty text="No communications found. Try sending an email or LinkedIn message." />
            ) : (
              activityLogItems.map((a, i) => {
                const channelColors = { Email: { bg: '#E6F1FB', color: '#0C447C' }, LinkedIn: { bg: '#E8F4E8', color: '#0A66C2' }, Note: { bg: '#FAEEDA', color: '#633806' }, Teams: { bg: '#EEEDFE', color: '#3C3489' } };
                const cc = channelColors[a._channel] || { bg: '#F1EFE8', color: '#5F5E5A' };
                const isExpanded = expandedActivity === a._id;
                return (
                  <div key={a._id} onClick={() => setExpandedActivity(isExpanded ? null : a._id)}
                    style={{ padding:"9px 0", borderBottom: i < activityLogItems.length - 1 ? "0.5px solid #D3D1C7" : "none", cursor:"pointer" }}>
                    <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                      <div style={{ width:28, height:28, borderRadius:7, background:cc.bg, color:cc.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:11, fontWeight:600 }}>{a._icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                          <span style={{ fontSize:10, padding:"1px 6px", borderRadius:8, background:cc.bg, color:cc.color, fontWeight:600 }}>{a._channel}</span>
                          <span style={{ fontSize:10, color:"#888780" }}>{a._direction === 'outbound' ? '\u2197 outbound' : '\u2199 inbound'}</span>
                          {a._from && <span style={{ fontSize:10, color:"#5F5E5A" }}>{a._from}</span>}
                        </div>
                        <div style={{ fontSize:12, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a._subject || a._preview}</div>
                        {!isExpanded && a._preview && a._preview !== a._subject && <div style={{ fontSize:11, color:"#888780", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a._preview}</div>}
                        <div style={{ fontSize:10, color:"#888780", marginTop:1 }}>{a._date ? new Date(a._date).toLocaleDateString('en', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : ''}</div>
                      </div>
                    </div>
                    {isExpanded && a._body && (
                      <div style={{ marginTop:8, marginLeft:38, padding:"10px 12px", background:"#FAFAF8", borderRadius:7, border:"0.5px solid #D3D1C7", fontSize:12, color:"#2C2C2A", lineHeight:1.6, maxHeight:300, overflowY:"auto" }}
                        dangerouslySetInnerHTML={a._type === 'email' ? { __html: DOMPurify.sanitize(a._body) } : undefined}>
                        {a._type !== 'email' ? a._body : undefined}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
        {tab==="tasks" && (
          <div>
            <button onClick={() => setShowTaskForm(f => !f)} style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", marginBottom:10, justifyContent:"center", fontWeight:500 }}>+ Add task</button>
            {showTaskForm && (
              <div style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #378ADD", padding:"12px 14px", marginBottom:10, display:"flex", flexDirection:"column", gap:8 }}>
                <input placeholder="Title *" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                <textarea placeholder="Description (optional)" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8", resize:"vertical" }} />
                <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                  <Btn small onClick={() => setShowTaskForm(false)}>Cancel</Btn>
                  <Btn small primary onClick={handleCreateTask} disabled={savingTask}>{savingTask ? 'Saving...' : 'Create'}</Btn>
                </div>
              </div>
            )}
            {tasksFor(item.id).length === 0 ? <Empty text="No tasks for this item." /> :
              tasksFor(item.id).map((t,i,arr) => (
                <div key={t.id} style={{ display:"flex", gap:10, padding:"9px 0", borderBottom:i<arr.length-1?"0.5px solid #D3D1C7":"none", alignItems:"flex-start" }}>
                  <div onClick={() => handleToggleTask(t)} style={{ width:16, height:16, borderRadius:4, border:`0.5px solid ${t.done?"#1D9E75":"#888780"}`, background:t.done?"#1D9E75":"transparent", flexShrink:0, marginTop:1, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                    {t.done && <span style={{ color:"#fff", fontSize:9, fontWeight:700 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:t.done?"#888780":"#2C2C2A", textDecoration:t.done?"line-through":"none" }}>{t.text}</div>
                    <div style={{ fontSize:10, color:t.overdue?"#D85A30":"#888780", marginTop:2 }}>{t.due}</div>
                  </div>
                </div>
              ))
            }
          </div>
        )}
        {tab==="calendar" && (
          <div>
            <button onClick={() => setShowMeetingForm(f => !f)} style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", marginBottom:10, justifyContent:"center", fontWeight:500 }}>+ Schedule meeting</button>
            {showMeetingForm && (
              <div style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #378ADD", padding:"12px 14px", marginBottom:10, display:"flex", flexDirection:"column", gap:8 }}>
                <input placeholder="Subject *" value={meetingForm.subject} onChange={e => setMeetingForm(f => ({ ...f, subject: e.target.value }))} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                <input type="date" value={meetingForm.date} onChange={e => setMeetingForm(f => ({ ...f, date: e.target.value }))} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                <div style={{ display:"flex", gap:8 }}>
                  <input type="time" value={meetingForm.startTime} onChange={e => setMeetingForm(f => ({ ...f, startTime: e.target.value }))} style={{ flex:1, padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                  <span style={{ alignSelf:"center", fontSize:12, color:"#888780" }}>-</span>
                  <input type="time" value={meetingForm.endTime} onChange={e => setMeetingForm(f => ({ ...f, endTime: e.target.value }))} style={{ flex:1, padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                </div>
                <input placeholder="Attendees (emails, comma-separated)" value={meetingForm.attendees} onChange={e => setMeetingForm(f => ({ ...f, attendees: e.target.value }))} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#5F5E5A", cursor:"pointer" }}>
                  <input type="checkbox" checked={meetingForm.isOnline} onChange={e => setMeetingForm(f => ({ ...f, isOnline: e.target.checked }))} />
                  Online meeting (Teams)
                </label>
                {graphCalError && <div style={{ fontSize:11, color:"#E24B4A" }}>{graphCalError}</div>}
                <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                  <Btn small onClick={() => setShowMeetingForm(false)}>Cancel</Btn>
                  <Btn small primary onClick={handleCreateMeeting} disabled={savingMeeting}>{savingMeeting ? 'Creating...' : 'Create'}</Btn>
                </div>
              </div>
            )}
            {graphCalLoading && <div style={{ fontSize:12, color:"#888780", textAlign:"center", padding:16 }}>Loading calendar...</div>}
            {!graphCalLoading && !localStorage.getItem('graph_token') && graphEvents.length === 0 && (
              <div style={{ background:"#F1EFE8", borderRadius:7, padding:"10px 12px", fontSize:12, color:"#888780", textAlign:"center", marginBottom:10 }}>Log in again to load calendar</div>
            )}
            {!graphCalLoading && groupedGraphEvents.length === 0 && localStorage.getItem('graph_token') && (
              <Empty text="No upcoming meetings found." />
            )}
            {groupedGraphEvents.map(([dateKey, evs]) => (
              <div key={dateKey} style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>{fmtDateLabel(dateKey)}</div>
                {evs.map((ev, idx) => (
                  <div key={ev.id} style={{ display:"flex", gap:8, padding:"7px 10px", borderRadius:7, border:"0.5px solid #D3D1C7", marginBottom:5, cursor:"pointer" }}>
                    <div style={{ width:3, borderRadius:2, background:evColors[idx % evColors.length], flexShrink:0, alignSelf:"stretch" }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ fontSize:12, fontWeight:500 }}>{ev.title}</div>
                        {ev.isOnline && <span style={{ fontSize:9, background:"#E8F0FE", color:"#378ADD", padding:"1px 5px", borderRadius:4, fontWeight:500 }}>Teams</span>}
                      </div>
                      <div style={{ fontSize:11, color:"#888780" }}>{fmtCalTime(ev.startAt)} – {fmtCalTime(ev.endAt)}</div>
                      {ev.attendees && <div style={{ fontSize:10, color:"#888780", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ev.attendees}</div>}
                      {ev.location && !ev.isOnline && <div style={{ fontSize:10, color:"#888780", marginTop:1 }}>{ev.location}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        {tab==="documents" && (
          <div>
            {(item.documents||[]).length > 0
              ? (item.documents||[]).map((doc,i) => (
                <div key={i} style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"11px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="#888780"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="#D3D1C7"}
                >
                  <div style={{ width:34, height:34, borderRadius:7, background:"#F1EFE8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{docIcon[doc.type]||"📄"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{doc.name}</div>
                    <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>Added {doc.date}</div>
                  </div>
                  <span style={{ fontSize:11, color:"#888780" }}>↓</span>
                </div>
              ))
              : <Empty text="No documents yet." />
            }
            <button style={{ display:"flex", alignItems:"center", gap:6, marginTop:4, padding:"8px 14px", borderRadius:7, border:"0.5px dashed #B4B2A9", fontSize:12, cursor:"pointer", background:"transparent", color:"#888780", fontFamily:"inherit", width:"100%" }}>+ Upload document</button>
          </div>
        )}
        {tab==="timeline" && timeline.map((e,i) => (
          <div key={i} style={{ display:"flex", gap:12, marginBottom:12, position:"relative" }}>
            {i < timeline.length-1 && <div style={{ position:"absolute", left:9, top:22, bottom:-12, width:"0.5px", background:"#D3D1C7" }} />}
            <div style={{ width:20, height:20, borderRadius:"50%", background:stC.bg, color:stC.color, border:`0.5px solid ${stC.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, flexShrink:0, zIndex:1 }}>{e.icon}</div>
            <div style={{ flex:1, background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"9px 12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <div style={{ fontSize:12, fontWeight:500 }}>{e.type}</div>
                <div style={{ fontSize:11, color:"#888780" }}>{e.time}</div>
              </div>
              <div style={{ fontSize:12, color:"#5F5E5A", lineHeight:1.5 }}>{e.text}</div>
              <div style={{ fontSize:10, color:"#888780", marginTop:5 }}>→ {e.owner}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:8, padding:"10px 18px", borderTop:"0.5px solid #D3D1C7", background:"#FFFFFF", flexShrink:0 }}>
        <input value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key==="Enter" && addNote(item.id)}
          placeholder="Log activity, note, or update..."
          style={{ flex:1, padding:"7px 11px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, background:"#F1EFE8", color:"#2C2C2A", fontFamily:"inherit", outline:"none" }} />
        <Btn onClick={() => addNote(item.id)}>Log</Btn>
        <Btn primary>Analyse</Btn>
      </div>
      <ComposeEmail open={showCompose} onClose={() => setShowCompose(false)} contactEmail={composeEmail} item={item} refetch={refetch} />
      <LinkedInCompose open={showLinkedInCompose} onClose={() => setShowLinkedInCompose(false)} contactName={getCts(item.contactIds)[0]?.name || ''} linkedinUrl={getCts(item.contactIds)[0]?.linkedin_url || ''} />

      {/* Enroll in Playbook modal */}
      {showEnrollPlaybook && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.3)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }} onClick={() => setShowEnrollPlaybook(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:12, padding:"24px 28px", width:420, maxHeight:"70vh", overflowY:"auto" }}>
            <div style={{ fontSize:16, fontWeight:500, marginBottom:4 }}>Enroll in a Playbook</div>
            <div style={{ fontSize:11, color:"#888780", marginBottom:8 }}>Select a playbook to start the outreach sequence for the first contact</div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, padding:"6px 10px", background:"#F1EFE8", borderRadius:6 }}>
              <label style={{ fontSize:11, color:"#888780", whiteSpace:"nowrap" }}>Start date (optional):</label>
              <input type="date" id="enroll-start-date-item" style={{ padding:"4px 8px", borderRadius:6, border:"0.5px solid #D3D1C7", fontSize:11, fontFamily:"inherit", background:"#fff" }} />
            </div>
            {availablePlaybooks === null ? (
              <div style={{ textAlign:"center", padding:20, color:"#888780", fontSize:12 }}>Loading playbooks...</div>
            ) : availablePlaybooks.length === 0 ? (
              <div style={{ textAlign:"center", padding:20, color:"#888780", fontSize:12 }}>No playbooks created yet. Go to Playbooks to create one first.</div>
            ) : (
              availablePlaybooks.map(pb => (
                <div key={pb.id} style={{ background:"#FAFAF8", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"12px 14px", marginBottom:6, display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
                  onClick={async () => {
                    const firstContactId = item.contactIds?.[0];
                    if (!firstContactId) return;
                    setEnrolling(pb.id);
                    setEnrollResult(null);
                    const startDateVal = document.getElementById('enroll-start-date-item')?.value;
                    const now = startDateVal ? new Date(startDateVal + 'T09:00:00') : new Date();
                    const { error } = await supabase.from('playbook_enrollments').insert({
                      playbook_id: pb.id,
                      contact_id: firstContactId,
                      current_step: 1,
                      status: 'active',
                      next_step_at: now.toISOString(),
                    });
                    if (!error) {
                      setEnrollResult('enrolled');
                      setTimeout(() => { setShowEnrollPlaybook(false); setEnrollResult(null); }, 1500);
                    } else {
                      setEnrollResult('error');
                    }
                    setEnrolling(null);
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="#378ADD"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="#D3D1C7"}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{pb.name}</div>
                    <div style={{ fontSize:10, color:"#888780", marginTop:2 }}>
                      {pb.step_count || '?'} steps · {pb.status} · Owner: {pb.owner || '\u2014'}
                    </div>
                  </div>
                  {enrolling === pb.id ? (
                    <span style={{ fontSize:11, color:"#888780" }}>Enrolling...</span>
                  ) : enrollResult === 'enrolled' ? (
                    <span style={{ fontSize:11, color:"#1D9E75" }}>\u2713 Enrolled</span>
                  ) : (
                    <span style={{ fontSize:11, color:"#378ADD" }}>Enroll \u2192</span>
                  )}
                </div>
              ))
            )}
            {enrollResult === 'error' && <div style={{ fontSize:11, color:"#dc2626", marginTop:8 }}>Failed to enroll. Contact may already be in this playbook.</div>}
            <div style={{ display:"flex", justifyContent:"flex-end", marginTop:12 }}>
              <button onClick={() => setShowEnrollPlaybook(false)} style={{ padding:"6px 14px", borderRadius:6, border:"0.5px solid #D3D1C7", fontSize:11, cursor:"pointer", background:"#fff", color:"#888780", fontFamily:"inherit" }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Opportunity modal */}
      {showConvertModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999 }} onClick={() => setShowConvertModal(false)}>
          <div style={{ background:"#FFFFFF", borderRadius:12, padding:"20px 24px", width:400, maxWidth:"90vw", boxShadow:"0 8px 32px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Convert to Opportunity</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div>
                <label style={{ fontSize:11, color:"#888780", display:"block", marginBottom:3 }}>Estimated Revenue</label>
                <input type="number" value={convertForm.estRevenue} onChange={e => setConvertForm(f => ({ ...f, estRevenue: Number(e.target.value) }))} style={{ width:"100%", padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8", boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ fontSize:11, color:"#888780", display:"block", marginBottom:3 }}>Probability (%)</label>
                <input type="number" min={0} max={100} value={convertForm.probability} onChange={e => setConvertForm(f => ({ ...f, probability: Number(e.target.value) }))} style={{ width:"100%", padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8", boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ fontSize:11, color:"#888780", display:"block", marginBottom:3 }}>Close Date</label>
                <input type="date" value={convertForm.closeDate} onChange={e => setConvertForm(f => ({ ...f, closeDate: e.target.value }))} style={{ width:"100%", padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8", boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ fontSize:11, color:"#888780", display:"block", marginBottom:3 }}>Product Line</label>
                <select value={convertForm.productLine} onChange={e => setConvertForm(f => ({ ...f, productLine: e.target.value }))} style={{ width:"100%", padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8", boxSizing:"border-box" }}>
                  <option value="">Select...</option>
                  <option value="Glint">Glint</option>
                  <option value="ROI">ROI</option>
                  <option value="Seer">Seer</option>
                  <option value="Insights">Insights</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:18 }}>
              <button onClick={() => setShowConvertModal(false)} style={{ padding:"6px 14px", borderRadius:6, border:"0.5px solid #B4B2A9", background:"#F1EFE8", color:"#5F5E5A", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
              <button onClick={handleConvertToOpportunity} disabled={converting} style={{ padding:"6px 14px", borderRadius:6, border:"none", background:"#1D9E75", color:"#fff", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit", opacity:converting?0.6:1 }}>{converting ? 'Converting...' : 'Convert'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Disqualify modal */}
      {showDisqualify && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999 }} onClick={() => setShowDisqualify(false)}>
          <div style={{ background:"#FFFFFF", borderRadius:12, padding:"20px 24px", width:380, maxWidth:"90vw", boxShadow:"0 8px 32px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Disqualify Lead</div>
            <div>
              <label style={{ fontSize:11, color:"#888780", display:"block", marginBottom:3 }}>Reason</label>
              <textarea value={disqualifyReason} onChange={e => setDisqualifyReason(e.target.value)} rows={3} placeholder="Why is this lead being disqualified?" style={{ width:"100%", padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8", resize:"vertical", boxSizing:"border-box" }} />
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:18 }}>
              <button onClick={() => setShowDisqualify(false)} style={{ padding:"6px 14px", borderRadius:6, border:"0.5px solid #B4B2A9", background:"#F1EFE8", color:"#5F5E5A", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
              <button onClick={handleDisqualify} disabled={disqualifying || !disqualifyReason.trim()} style={{ padding:"6px 14px", borderRadius:6, border:"none", background:"#D85A30", color:"#fff", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit", opacity:(disqualifying || !disqualifyReason.trim())?0.6:1 }}>{disqualifying ? 'Saving...' : 'Disqualify'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
