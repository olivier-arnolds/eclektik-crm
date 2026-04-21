// Sample data for the BD app — partner sales & partner management advisory
// Owners: single-user view; switchable across MVG (me) / OA / YK.

window.BD_DATA = (() => {
  const OWNERS = {
    MVG: { id: 'MVG', name: 'Michiel V.G.',  color: '#5B6CFF', initials: 'MV' },
    OA:  { id: 'OA',  name: 'Olivia A.',      color: '#E25C8B', initials: 'OA' },
    YK:  { id: 'YK',  name: 'Yannis K.',      color: '#13A37F', initials: 'YK' },
  };

  const ACCOUNTS = [
    { id: 'a1', name: 'Orbital Systems',   type: 'Partner',        tier: 'Strategic',  region: 'DACH',    arr: 1_420_000, owner: 'MVG', logoHue: 212 },
    { id: 'a2', name: 'Halden Industrial', type: 'Direct',         tier: 'Enterprise', region: 'Nordics', arr: 890_000,   owner: 'MVG', logoHue: 28 },
    { id: 'a3', name: 'Meridian Partners', type: 'Partner',        tier: 'Growth',     region: 'Benelux', arr: 310_000,   owner: 'OA',  logoHue: 160 },
    { id: 'a4', name: 'Kestrel & Fane',    type: 'Advisory',       tier: 'Strategic',  region: 'UK',      arr: 720_000,   owner: 'MVG', logoHue: 340 },
    { id: 'a5', name: 'Northwind Freight', type: 'Direct',         tier: 'Mid-market', region: 'Nordics', arr: 240_000,   owner: 'YK',  logoHue: 200 },
    { id: 'a6', name: 'Arclight Ventures', type: 'Partner',        tier: 'Growth',     region: 'France',  arr: 510_000,   owner: 'MVG', logoHue: 48 },
    { id: 'a7', name: 'Petra Holdings',    type: 'Direct',         tier: 'Enterprise', region: 'Iberia',  arr: 1_100_000, owner: 'OA',  logoHue: 280 },
    { id: 'a8', name: 'Solvay Bauwens',    type: 'Advisory',       tier: 'Mid-market', region: 'Benelux', arr: 180_000,   owner: 'MVG', logoHue: 140 },
  ];

  const CONTACTS = [
    { id: 'c1',  name: 'Anja Köhler',      role: 'VP Alliances',         account: 'a1', email: 'anja.kohler@orbital.de' },
    { id: 'c2',  name: 'Lars Eriksen',     role: 'Head of Procurement',  account: 'a2', email: 'l.eriksen@halden.no' },
    { id: 'c3',  name: 'Pieter Janssens',  role: 'Partner',              account: 'a3', email: 'pj@meridian.be' },
    { id: 'c4',  name: 'Helen Kestrel',    role: 'Managing Director',    account: 'a4', email: 'h.kestrel@kestrelfane.co.uk' },
    { id: 'c5',  name: 'Sanna Virtanen',   role: 'COO',                  account: 'a5', email: 's.virtanen@northwind.fi' },
    { id: 'c6',  name: 'Luc Moreau',       role: 'Investment Principal', account: 'a6', email: 'luc@arclight.fr' },
    { id: 'c7',  name: 'Inés Castillo',    role: 'Chief of Staff',       account: 'a7', email: 'ines@petra.es' },
    { id: 'c8',  name: 'Geert Solvay',     role: 'Managing Partner',     account: 'a8', email: 'g@solvaybauwens.be' },
    { id: 'c9',  name: 'Marko Dietrich',   role: 'Director, Alliances',  account: 'a1', email: 'm.dietrich@orbital.de' },
    { id: 'c10', name: 'Clara Bekele',     role: 'VP Operations',        account: 'a7', email: 'c.bekele@petra.es' },
  ];

  const DEALS = [
    { id: 'd1', title: 'Partner programme rebuild',        account: 'a1', contact: 'c1',  value: 320_000, stage: 'proposal',    owner: 'MVG', staleDays: 2,  nextTask: 'Send revised SOW',    dueIn: 1,  dealType: 'ROI',   closeDate: 'Jun 2026', source: 'Outbound',  description: 'Full rebuild of Orbital partner incentive stack, MDF structure and tier model.' },
    { id: 'd2', title: 'Advisory retainer Q2–Q4',          account: 'a4', contact: 'c4',  value: 145_000, stage: 'negotiation', owner: 'MVG', staleDays: 0,  nextTask: 'Legal review call',   dueIn: 0,  dealType: 'ROE',   closeDate: 'Apr 2026', source: 'Referral',  description: 'Quarterly advisory retainer covering board prep and strategic comms for Kestrel & Fane.' },
    { id: 'd3', title: 'Procurement consolidation',        account: 'a2', contact: 'c2',  value: 480_000, stage: 'qualified',   owner: 'MVG', staleDays: 5,  nextTask: 'Discovery workshop',  dueIn: 3,  dealType: 'GLINT', closeDate: 'Jul 2026', source: 'Inbound',   description: 'Category consolidation across IT, facilities and logistics for Halden Industrial.' },
    { id: 'd4', title: 'Channel expansion Benelux',        account: 'a3', contact: 'c3',  value: 90_000,  stage: 'lead',        owner: 'OA',  staleDays: 8,  nextTask: 'Intro email',         dueIn: 2,  dealType: 'ROI',   closeDate: 'Aug 2026', source: 'Referral',  description: 'New indirect channel partner setup across Benelux region via Meridian Partners.' },
    { id: 'd5', title: 'Nordic freight optimisation',      account: 'a5', contact: 'c5',  value: 210_000, stage: 'proposal',    owner: 'YK',  staleDays: 1,  nextTask: 'Pricing revision',    dueIn: 4,  dealType: 'GLINT', closeDate: 'May 2026', source: 'Outbound',  description: 'Route optimisation and carrier consolidation for Northwind Freight Nordic ops.' },
    { id: 'd6', title: 'LP co-investment advisory',        account: 'a6', contact: 'c6',  value: 275_000, stage: 'qualified',   owner: 'MVG', staleDays: 3,  nextTask: 'Data room access',    dueIn: 2,  dealType: 'ROE',   closeDate: 'Jun 2026', source: 'Inbound',   description: 'Advisory mandate on co-investment structures and LP reporting for Arclight Ventures.' },
    { id: 'd7', title: 'Carve-out workstream',             account: 'a7', contact: 'c7',  value: 650_000, stage: 'negotiation', owner: 'OA',  staleDays: 0,  nextTask: 'MSA redlines',        dueIn: 1,  dealType: 'ROI',   closeDate: 'May 2026', source: 'Inbound',   description: 'Legal and operational carve-out of Petra Holdings tech division, MSA in final review.' },
    { id: 'd8', title: 'Partner onboarding SaaS',          account: 'a1', contact: 'c9',  value: 85_000,  stage: 'won',         owner: 'MVG', staleDays: 0,  nextTask: 'Kick-off scheduling', dueIn: 6,  dealType: 'Other', closeDate: 'Jan 2026', source: 'Outbound',  description: 'SaaS platform licence for automated partner onboarding — closed and in kick-off.' },
    { id: 'd9', title: 'Family office governance',         account: 'a8', contact: 'c8',  value: 60_000,  stage: 'lost',        owner: 'MVG', staleDays: 14, nextTask: 'Archive',             dueIn: 30, dealType: 'ROE',   closeDate: 'Feb 2026', source: 'Referral',  description: 'Governance framework for Solvay Bauwens family office investment committee — lost.' },
    { id: 'd10',title: 'Managed alliance ops (renewal)',   account: 'a1', contact: 'c1',  value: 410_000, stage: 'lead',        owner: 'MVG', staleDays: 11, nextTask: 'Renewal frame memo',  dueIn: 5,  dealType: 'ROI',   closeDate: 'Jul 2026', source: 'Renewal',   description: 'Annual renewal of managed alliance operations framework with Orbital Systems.' },
    { id: 'd11',title: 'Operations due diligence',         account: 'a7', contact: 'c10', value: 120_000, stage: 'proposal',    owner: 'MVG', staleDays: 4,  nextTask: 'Scoping doc v2',      dueIn: 2,  dealType: 'GLINT', closeDate: 'Jun 2026', source: 'Inbound',   description: 'Operational DD for Petra Holdings mid-market acquisition target, scoping phase.' },
  ];

  const STAGES = [
    { id: 'lead',        label: 'Lead' },
    { id: 'qualified',   label: 'Qualified' },
    { id: 'proposal',    label: 'Proposal' },
    { id: 'negotiation', label: 'Negotiation' },
    { id: 'won',         label: 'Won' },
    { id: 'lost',        label: 'Lost' },
  ];

  // Comms feed — mixed inbound/outbound across channels
  const COMMS = [
    { id: 'm1',  channel: 'email',    dir: 'in',  from: 'c1',  account: 'a1', subject: 'Re: revised SOW — one question on MDF pool', preview: 'Anja — thanks for the draft. The marketing development fund pool looks fine but can we confirm the carve-out for Tier 2 partners? Also, legal wants a 30-day termination clause instead of 60…', unread: true,  ts: minus(0, 9, 12), deal: 'd1', hasAttach: true,  flagged: true },
    { id: 'm2',  channel: 'teams',    dir: 'in',  from: 'c4',  account: 'a4', subject: 'Quick sync before board',      preview: 'Can you join at 14:00 for 15 mins? Chair wants a view on the retainer structure before Thursday.', unread: true,  ts: minus(0, 8, 32), deal: 'd2' },
    { id: 'm3',  channel: 'whatsapp', dir: 'in',  from: 'c6',  account: 'a6', subject: '',                             preview: 'Landed. Will call after customs.', unread: true,  ts: minus(0, 7, 55), deal: 'd6' },
    { id: 'm4',  channel: 'email',    dir: 'out', from: 'MVG', account: 'a2', subject: 'Discovery workshop — agenda',   preview: 'Lars — proposing the below for Tuesday. Two hours, your team plus our procurement lead. Happy to adjust.', ts: minus(0, 7, 12), deal: 'd3' },
    { id: 'm5',  channel: 'linkedin', dir: 'in',  from: 'c3',  account: 'a3', subject: 'Connection + intro',           preview: 'Hi Michiel, connecting as suggested by Klaas. Would love to discuss the Benelux channel programme.', unread: false, ts: minus(1, 17, 40), deal: 'd4' },
    { id: 'm6',  channel: 'email',    dir: 'in',  from: 'c7',  account: 'a7', subject: 'MSA — redline batch 2',        preview: 'Please find attached the second pass. Key open items: 4.2 (liability cap), 7.1 (IP carve-out), 11 (governing law). Ines', unread: false, ts: minus(1, 14, 18), deal: 'd7', hasAttach: true },
    { id: 'm7',  channel: 'teams',    dir: 'out', from: 'MVG', account: 'a5', subject: 'Pricing revision posted',       preview: 'Shared in the channel — pinging so you see it. Assumes 18-month term.', ts: minus(1, 11, 2), deal: 'd5' },
    { id: 'm8',  channel: 'email',    dir: 'in',  from: 'c2',  account: 'a2', subject: 'Intro: Halden sourcing team',   preview: 'Michiel — introducing Paula (category lead) and Jens (finance). They run the RFP. Copying them.', unread: false, ts: minus(2, 10, 15), deal: 'd3' },
    { id: 'm9',  channel: 'email',    dir: 'in',  from: 'c9',  account: 'a1', subject: 'MDF pool — numbers',           preview: 'Marko here — Anja asked me to send the latest partner-tier splits. See deck p.6–9.', unread: false, ts: minus(2, 9, 44), deal: 'd1', hasAttach: true },
    { id: 'm10', channel: 'whatsapp', dir: 'in',  from: 'c8',  account: 'a8', subject: '',                             preview: 'Ping me when you have 5 min 🙏', unread: false, ts: minus(3, 16, 9) },
    { id: 'm11', channel: 'email',    dir: 'out', from: 'MVG', account: 'a6', subject: 'Data room — access + NDAs',    preview: 'Luc — access is live. Three NDAs attached for your co-investors.', ts: minus(3, 12, 28), deal: 'd6' },
    { id: 'm12', channel: 'email',    dir: 'in',  from: 'c10', account: 'a7', subject: 'Scoping doc — feedback',       preview: 'Clara — small edits inline. Can we get v2 by Thursday EOB? Petra ExCo Tuesday.', unread: false, ts: minus(4, 15, 50), deal: 'd11' },
  ];

  // Calendar — Mon–Fri work week. Events pinned inside a day; tasks float at top-of-day.
  const WEEK = [
    { id: 'ev1',  kind: 'meeting', day: 0, start: 9.0,  end: 10.0, title: 'Orbital · MDF walkthrough',  deal: 'd1', contact: 'c1', channel: 'teams', attendees: ['c1','c9'], owner: 'MVG' },
    { id: 'ev2',  kind: 'block',   day: 0, start: 10.5, end: 12.0, title: 'Deep work · Halden discovery prep', deal: 'd3', owner: 'MVG' },
    { id: 'ev3',  kind: 'meeting', day: 0, start: 14.0, end: 14.25, title: 'Kestrel · pre-board sync',   deal: 'd2', contact: 'c4', channel: 'teams', attendees: ['c4'], owner: 'MVG' },
    { id: 'ev4',  kind: 'meeting', day: 1, start: 10.0, end: 12.0, title: 'Halden · discovery workshop', deal: 'd3', contact: 'c2', channel: 'in-person', attendees: ['c2'], owner: 'MVG' },
    { id: 'ev5',  kind: 'block',   day: 1, start: 13.5, end: 14.5, title: 'Pipeline review (solo)',       owner: 'MVG' },
    { id: 'ev6',  kind: 'meeting', day: 1, start: 16.0, end: 17.0, title: 'Petra · MSA redlines review',  deal: 'd7', contact: 'c7', channel: 'teams', attendees: ['c7','c10'], owner: 'MVG' },
    { id: 'ev7',  kind: 'meeting', day: 2, start: 9.0,  end: 9.5,  title: 'Team standup',                 owner: 'MVG' },
    { id: 'ev8',  kind: 'meeting', day: 2, start: 11.0, end: 12.0, title: 'Arclight · data room debrief', deal: 'd6', contact: 'c6', channel: 'teams', attendees: ['c6'], owner: 'MVG' },
    { id: 'ev9',  kind: 'block',   day: 2, start: 14.0, end: 16.0, title: 'SOW v2 · Orbital',             deal: 'd1', owner: 'MVG' },
    { id: 'ev10', kind: 'meeting', day: 3, start: 9.5,  end: 10.5, title: 'Kestrel · retainer legal',     deal: 'd2', contact: 'c4', channel: 'teams', attendees: ['c4'], owner: 'MVG' },
    { id: 'ev11', kind: 'meeting', day: 3, start: 13.0, end: 14.0, title: 'Meridian · Benelux intro',     deal: 'd4', contact: 'c3', channel: 'teams', attendees: ['c3'], owner: 'OA' },
    { id: 'ev12', kind: 'block',   day: 3, start: 15.0, end: 17.0, title: 'Writing · proposal narrative', deal: 'd11', owner: 'MVG' },
    { id: 'ev13', kind: 'meeting', day: 4, start: 10.0, end: 11.0, title: 'Northwind · pricing decision', deal: 'd5', contact: 'c5', channel: 'teams', attendees: ['c5'], owner: 'YK' },
    { id: 'ev14', kind: 'block',   day: 4, start: 13.0, end: 15.0, title: 'Weekly review + planning',     owner: 'MVG' },
  ];

  // Top-of-day tasks (appointments without a timeslot)
  const TASKS = [
    { id: 't1', day: 0, title: 'Send revised SOW to Anja',        deal: 'd1', owner: 'MVG', done: false },
    { id: 't2', day: 0, title: 'Confirm Halden workshop agenda',  deal: 'd3', owner: 'MVG', done: true  },
    { id: 't3', day: 1, title: 'Circulate pricing v3 to YK',      deal: 'd5', owner: 'MVG', done: false },
    { id: 't4', day: 2, title: 'Draft carve-out memo',            deal: 'd7', owner: 'MVG', done: false },
    { id: 't5', day: 3, title: 'Respond to Meridian intro',       deal: 'd4', owner: 'OA',  done: false },
    { id: 't6', day: 4, title: 'Weekly forecast update',          owner: 'MVG', done: false },
  ];

  // Unscheduled / expected tasks
  const INBOX_TASKS = [
    { id: 'u1', title: 'Follow up with Geert — re-engage',   deal: null,  owner: 'MVG', account: 'a8' },
    { id: 'u2', title: 'Partner tier policy brief',          deal: 'd10', owner: 'MVG', account: 'a1' },
    { id: 'u3', title: 'LinkedIn reply — Pieter',            deal: 'd4',  owner: 'OA',  account: 'a3' },
    { id: 'u4', title: 'Renewal ping · Orbital alliance ops',deal: 'd10', owner: 'MVG', account: 'a1' },
    { id: 'u5', title: 'Archive Solvay file',                deal: 'd9',  owner: 'MVG', account: 'a8' },
  ];

  function minus(days, hour, minute) {
    // return a timestamp "hour:minute" X days ago; represented as an object for formatting
    return { days, hour, minute };
  }

  return {
    OWNERS, ACCOUNTS, CONTACTS, DEALS, STAGES, COMMS, WEEK, TASKS, INBOX_TASKS,
    byId: {
      account: (id) => ACCOUNTS.find(a => a.id === id),
      contact: (id) => CONTACTS.find(c => c.id === id),
      deal:    (id) => DEALS.find(d => d.id === id),
      owner:   (id) => OWNERS[id],
      comm:    (id) => COMMS.find(m => m.id === id),
    },
    forAccount: {
      contacts: (aid) => CONTACTS.filter(c => c.account === aid),
      deals:    (aid) => DEALS.filter(d => d.account === aid),
      comms:    (aid) => COMMS.filter(m => m.account === aid),
    }
  };
})();
