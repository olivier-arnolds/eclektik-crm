#!/usr/bin/env python3
"""
Safe import from Dynamics Final exports.
- INSERT-only: adds new records (matched on dynamics_id), never overwrites
- Name mapping: * Eclectik→Eclectik, P2P | X→X (type=Partner)
- Reuses existing BD accounts where possible
- Outputs a dry-run report first; pass --apply to actually commit
"""
import pandas as pd
import requests
import sys
import warnings
warnings.filterwarnings('ignore')

SUPABASE_URL = "https://jdzaypckluncdwsoxurs.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkemF5cGNrbHVuY2R3c294dXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Njg5MTEsImV4cCI6MjA5MTE0NDkxMX0.XffGi1MOfrS_YFkTY-K7ECDFWmQvEbeRIDCl6Bi-dzg"
H_READ = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
H_WRITE = {**H_READ, "Content-Type": "application/json", "Prefer": "return=representation"}

APPLY = '--apply' in sys.argv

FILES = {
    'accounts':      'All Accounts_Dynamics_final.xlsx',
    'contacts':      'All Contacts_Dynamics_Final.xlsx',
    'opportunities': 'All Opportunities_Dynamics_Final.xlsx',
    'leads':         'All Leads_Dynamics_Final.xlsx',
}

def clean(v):
    if pd.isna(v) or v is None: return None
    s = str(v).strip()
    return s if s and s.lower() not in ('nan', 'nat', 'none') else None

def to_date(v):
    c = clean(v)
    if not c: return None
    try:
        ts = pd.to_datetime(c, errors='coerce')
        return None if pd.isna(ts) else ts.isoformat()
    except: return None

def to_num(v):
    c = clean(v)
    if not c: return None
    try: return float(c)
    except: return None

# --------- Name mapping (Dynamics name → BD canonical name) ---------
# Strip "* " and "P2P | " prefixes. "P2P |" also means type=Partner.
def canonical_name(name):
    """Returns (canonical_name, is_partner_prefix)."""
    if not name: return (None, False)
    n = name.strip()
    is_partner = False
    if n.startswith('* '):
        n = n[2:].strip()
    elif n.startswith('P2P |') or n.startswith('P2P|'):
        # e.g. "P2P | Macaw", "P2P | Accenture"
        n = n.split('|', 1)[1].strip()
        is_partner = True
    return (n, is_partner)

# --------- Fetch existing BD data ---------
def fetch_all(table, select='*', extra=''):
    all_rows = []
    offset = 0
    while True:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?select={select}&limit=1000&offset={offset}{extra}", headers=H_READ)
        rows = r.json()
        if not rows: break
        all_rows.extend(rows)
        if len(rows) < 1000: break
        offset += 1000
    return all_rows

print("=" * 60)
print(f"  Dynamics import — {'LIVE APPLY' if APPLY else 'DRY RUN (use --apply to commit)'}")
print("=" * 60)

# Load Dynamics data
print("\nLoading Dynamics exports…")
df_a = pd.read_excel(FILES['accounts'])
df_c = pd.read_excel(FILES['contacts'])
df_o = pd.read_excel(FILES['opportunities'])
df_l = pd.read_excel(FILES['leads'])

# Load current BD state
print("Loading Supabase state…")
bd_companies = fetch_all('companies', 'id,name,dynamics_id,type,stage')
bd_contacts = fetch_all('contacts', 'id,full_name,dynamics_id,company_id')

# Index by dynamics_id and by lowercased name
bd_comp_by_did = {r['dynamics_id']: r for r in bd_companies if r.get('dynamics_id')}
bd_comp_by_name_lower = {}
for r in bd_companies:
    if r.get('name'):
        bd_comp_by_name_lower.setdefault(r['name'].lower().strip(), []).append(r)
bd_contact_by_did = {r['dynamics_id']: r for r in bd_contacts if r.get('dynamics_id')}

# ============ ACCOUNTS ============
print("\n" + "=" * 60)
print("  ACCOUNTS")
print("=" * 60)

account_actions = []  # list of (action, excel_row, bd_id_or_new)
account_id_by_dynid = dict(bd_comp_by_did)  # start with what we have

for _, r in df_a.iterrows():
    did = clean(r.get('(Do Not Modify) Account'))
    dyn_name = clean(r.get('Account Name'))
    if not did or not dyn_name:
        continue
    canon, is_partner = canonical_name(dyn_name)
    if did in bd_comp_by_did:
        continue  # already imported; skip
    # Not in BD by dynamics_id. Check canonical name match to an existing BD account.
    matches = bd_comp_by_name_lower.get(canon.lower(), []) if canon else []
    existing = next((m for m in matches if not m.get('dynamics_id')), None)

    if existing:
        # Attach dynamics_id to existing BD account + optionally set type=Partner
        updates = {'dynamics_id': did}
        if is_partner:
            updates['type'] = 'Partner'
        account_actions.append(('LINK', dyn_name, canon, existing['id'], updates))
    else:
        # New account. If canonical name differs from dynamics name, use canonical.
        row = {
            'dynamics_id': did,
            'name': canon,
            'type': 'Partner' if is_partner else (clean(r.get('Status')) or 'Prospect'),
            'stage': 'Active',
            'phone': clean(r.get('Main Phone')),
            'primary_contact': clean(r.get('Primary Contact')),
            'website': clean(r.get('Website')),
            'industry': clean(r.get('Industry')),
            'city': clean(r.get('Address 1: City')),
            'postal_code': clean(r.get('Address 1: ZIP/Postal Code')),
            'address': clean(r.get('Address 1: Street 1')),
            'employee_count': clean(r.get('Number of Employees')),
            'annual_revenue': clean(r.get('Annual Revenue')),
            'owner': clean(r.get('Owner')),
            'email': clean(r.get('Email')),
            'parent_account': clean(r.get('Parent Account')),
            'description': clean(r.get('Description')),
        }
        account_actions.append(('INSERT', dyn_name, canon, None, row))

print(f"\nSummary: {len([a for a in account_actions if a[0] == 'LINK'])} LINK, "
      f"{len([a for a in account_actions if a[0] == 'INSERT'])} INSERT\n")
for act in account_actions:
    action, dyn, canon, bd_id, payload = act
    if action == 'LINK':
        print(f"  LINK    '{dyn}' → existing BD '{canon}' (id {bd_id[:8]}...) | set type={payload.get('type', 'unchanged')}")
    else:
        print(f"  INSERT  '{dyn}' → new BD '{canon}' type={payload['type']}")

# Execute accounts
if APPLY:
    for action, dyn, canon, bd_id, payload in account_actions:
        if action == 'LINK':
            r = requests.patch(f"{SUPABASE_URL}/rest/v1/companies?id=eq.{bd_id}", json=payload, headers=H_WRITE)
            if r.status_code in (200, 204):
                data = r.json() if r.text else []
                if data:
                    account_id_by_dynid[payload['dynamics_id']] = data[0]
            else:
                print(f"    ! LINK failed: {r.status_code} {r.text[:200]}")
        else:
            r = requests.post(f"{SUPABASE_URL}/rest/v1/companies", json=payload, headers=H_WRITE)
            if r.status_code in (200, 201):
                data = r.json()
                if data:
                    account_id_by_dynid[payload['dynamics_id']] = data[0]
            else:
                print(f"    ! INSERT failed: {r.status_code} {r.text[:200]}")

# Refresh after account changes — need up-to-date map for contacts/opps
if APPLY:
    bd_companies = fetch_all('companies', 'id,name,dynamics_id')
    account_id_by_dynid = {r['dynamics_id']: r for r in bd_companies if r.get('dynamics_id')}
name_to_id = {r['name'].lower().strip(): r['id'] for r in bd_companies if r.get('name')}

# ============ CONTACTS ============
print("\n" + "=" * 60)
print("  CONTACTS")
print("=" * 60)

new_contacts = []
for _, r in df_c.iterrows():
    did = clean(r.get('(Do Not Modify) Contact'))
    if not did or did in bd_contact_by_did:
        continue
    full_name = clean(r.get(' Full Name')) or f"{clean(r.get('First Name')) or ''} {clean(r.get('Last Name')) or ''}".strip()
    if not full_name:
        continue
    comp_name_raw = clean(r.get('Company Name'))
    canon_comp, _ = canonical_name(comp_name_raw) if comp_name_raw else (None, False)
    comp_id = name_to_id.get(canon_comp.lower()) if canon_comp else None
    new_contacts.append({
        'dynamics_id': did,
        'full_name': full_name,
        'first_name': clean(r.get('First Name')),
        'last_name': clean(r.get('Last Name')),
        'email': clean(r.get('Email')),
        'phone': clean(r.get('Business Phone')),
        'mobile': clean(r.get('Mobile Phone')),
        'stage': clean(r.get('Status')) or 'Active',
        'owner': clean(r.get('Owner')),
        'title': clean(r.get('Job Title')),
        'company_name': canon_comp or comp_name_raw,
        'company_id': comp_id,
        'source': 'Dynamics',
    })

print(f"\n{len(new_contacts)} contacts to INSERT")
for c in new_contacts[:10]:
    print(f"  - {c['full_name']} @ {c['company_name']} (company_id: {c['company_id'][:8] + '…' if c['company_id'] else 'NULL'})")
if len(new_contacts) > 10:
    print(f"  … and {len(new_contacts) - 10} more")

if APPLY:
    # Batch insert, 50 at a time
    for i in range(0, len(new_contacts), 50):
        batch = new_contacts[i:i+50]
        r = requests.post(f"{SUPABASE_URL}/rest/v1/contacts", json=batch, headers=H_WRITE)
        if r.status_code not in (200, 201):
            print(f"  ! batch insert failed: {r.status_code} {r.text[:300]}")

# ============ OPPORTUNITIES ============
print("\n" + "=" * 60)
print("  OPPORTUNITIES")
print("=" * 60)

bd_opps = fetch_all('opportunities', 'dynamics_id')
bd_opp_dids = {r['dynamics_id'] for r in bd_opps if r.get('dynamics_id')}
new_opps = []
for _, r in df_o.iterrows():
    did = clean(r.get('(Do Not Modify) Opportunity'))
    if not did or did in bd_opp_dids:
        continue
    topic = clean(r.get('Topic'))
    if not topic: continue
    comp_name_raw = clean(r.get('Potential Customer'))
    canon_comp, _ = canonical_name(comp_name_raw) if comp_name_raw else (None, False)
    comp_id = name_to_id.get(canon_comp.lower()) if canon_comp else None
    status = clean(r.get('Status')) or 'Open'
    stage = 'opportunity'
    sub_status = 'qualify'
    if status == 'Won':
        stage, sub_status = 'active', 'close'
    elif status == 'Lost':
        stage, sub_status = 'past', 'close'
    new_opps.append({
        'dynamics_id': did,
        'topic': topic,
        'company_id': comp_id,
        'company_name': canon_comp or comp_name_raw,
        'contact_name': clean(r.get('Contact')),
        'status': status,
        'stage': stage,
        'sub_status': sub_status,
        'est_revenue': to_num(r.get('Est. revenue')),
        'actual_revenue': to_num(r.get('Actual Revenue')),
        'probability': to_num(r.get('Probability')) or 20,
        'est_close_date': to_date(r.get('Est. close date')),
        'actual_close_date': to_date(r.get('Actual Close Date')),
        'close_date': to_date(r.get('Actual Close Date')) or to_date(r.get('Est. close date')),
        'rating': clean(r.get('Rating')),
        'owner': clean(r.get('Owner')),
    })

print(f"\n{len(new_opps)} opportunities to INSERT")
for o in new_opps:
    print(f"  - {o['topic']} @ {o['company_name']} ({o['status']})")

if APPLY:
    for i in range(0, len(new_opps), 50):
        batch = new_opps[i:i+50]
        r = requests.post(f"{SUPABASE_URL}/rest/v1/opportunities", json=batch, headers=H_WRITE)
        if r.status_code not in (200, 201):
            print(f"  ! failed: {r.status_code} {r.text[:300]}")

# ============ LEADS ============
print("\n" + "=" * 60)
print("  LEADS")
print("=" * 60)

bd_leads = fetch_all('leads', 'dynamics_id')
bd_lead_dids = {r['dynamics_id'] for r in bd_leads if r.get('dynamics_id')}
new_leads = []
for _, r in df_l.iterrows():
    did = clean(r.get('(Do Not Modify) Lead'))
    if not did or did in bd_lead_dids:
        continue
    full_name = clean(r.get(' Name')) or f"{clean(r.get('First Name')) or ''} {clean(r.get('Last Name')) or ''}".strip()
    topic = clean(r.get('Topic'))
    if not full_name and not topic:
        continue
    comp_name_raw = clean(r.get('Company Name'))
    canon_comp, _ = canonical_name(comp_name_raw) if comp_name_raw else (None, False)
    comp_id = name_to_id.get(canon_comp.lower()) if canon_comp else None
    status = clean(r.get('Status Reason')) or 'New'
    sub_status = {'New': 'qualify', 'Contacted': 'develop', 'Qualified': 'proposal'}.get(status, 'qualify')
    new_leads.append({
        'dynamics_id': did,
        'full_name': full_name or topic,
        'first_name': clean(r.get('First Name')),
        'last_name': clean(r.get('Last Name')),
        'email': clean(r.get('Email')),
        'title': clean(r.get('Job Title')),
        'company_name': canon_comp or comp_name_raw,
        'company_id': comp_id,
        'topic': topic,
        'description': clean(r.get('Description')),
        'owner': clean(r.get('Owner')),
        'status': status,
        'sub_status': sub_status,
        'source': 'Dynamics',
        'created_on': to_date(r.get('Created On')),
    })

print(f"\n{len(new_leads)} leads to INSERT")
for l in new_leads:
    print(f"  - {l['topic'] or l['full_name']} @ {l['company_name']} ({l['status']})")

if APPLY:
    for i in range(0, len(new_leads), 50):
        batch = new_leads[i:i+50]
        r = requests.post(f"{SUPABASE_URL}/rest/v1/leads", json=batch, headers=H_WRITE)
        if r.status_code not in (200, 201):
            print(f"  ! failed: {r.status_code} {r.text[:300]}")

print("\n" + "=" * 60)
print(f"  {'IMPORT COMPLETE — COMMITTED' if APPLY else 'DRY RUN COMPLETE — use --apply to commit'}")
print("=" * 60)
