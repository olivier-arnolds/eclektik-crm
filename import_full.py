#!/usr/bin/env python3
"""
Eclectik CRM — Full Dynamics Import (upsert on dynamics_id)
Imports: Accounts → Companies, Contacts, Opportunities, Leads, Activities
"""
import pandas as pd
import requests
import sys
from datetime import datetime

SUPABASE_URL = "https://jdzaypckluncdwsoxurs.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkemF5cGNrbHVuY2R3c294dXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Njg5MTEsImV4cCI6MjA5MTE0NDkxMX0.XffGi1MOfrS_YFkTY-K7ECDFWmQvEbeRIDCl6Bi-dzg"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates",
}

FILES = {
    "accounts": "All Accounts_Dynamics_Clean.xlsx",
    "contacts": "All Contacts_Dynamics_Clean.xlsx",
    "opportunities": "All Opportunities_Dynamics_Clean.xlsx",
    "activities": "All Activities_Dynamics_Clean.xlsx",
    "leads": "All Leads_Dynamics_Clean.xlsx",
}

def clean(val):
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    if s.lower() in ('nan', 'nat', 'none', ''):
        return None
    return s

def to_date(val):
    v = clean(val)
    if not v:
        return None
    try:
        ts = pd.to_datetime(v, errors='coerce')
        if pd.isna(ts):
            return None
        return ts.isoformat()
    except:
        return None

def to_num(val):
    v = clean(val)
    if not v:
        return None
    try:
        return float(v)
    except:
        return None

def upsert(table, rows, conflict_col="dynamics_id"):
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={conflict_col}"
    ok, err = 0, 0
    # Batch in groups of 50
    for i in range(0, len(rows), 50):
        batch = rows[i:i+50]
        resp = requests.post(url, json=batch, headers=HEADERS)
        if resp.status_code in (200, 201):
            ok += len(batch)
        else:
            # Try one by one
            for row in batch:
                r = requests.post(url, json=[row], headers=HEADERS)
                if r.status_code in (200, 201):
                    ok += 1
                else:
                    err += 1
                    if err <= 3:
                        print(f"  Error: {r.status_code} {r.text[:200]}")
    return ok, err

def import_accounts():
    print("\n" + "="*50)
    print("STEP 1: Accounts → companies")
    print("="*50)
    df = pd.read_excel(FILES["accounts"])
    rows = []
    for _, r in df.iterrows():
        name = clean(r.get("Company_Account Name"))
        if not name:
            continue
        rows.append({
            "dynamics_id": clean(r.get("(Do Not Modify) Account")),
            "name": name,
            "phone": clean(r.get("Company_Main Phone")),
            "primary_contact": clean(r.get("Company_Primary Contact")),
            "stage": clean(r.get("Company_Status")) or "Active",
            "type": clean(r.get("Company_Type")) or "Customer",
            "address": clean(r.get("Company_Address_Street_1")),
            "postal_code": clean(r.get("Company_Address_Postal Code")),
            "city": clean(r.get("Company_Address_City")),
            "country": clean(r.get("Company_Adress_ Country")),
            "employee_count": clean(r.get("Company_Number of Employees")),
            "annual_revenue": clean(r.get("Company_Annual Revenue")),
            "website": clean(r.get("Company_Website")),
            "owner": clean(r.get("Company_Owner")),
            "created_on": to_date(r.get("Company_Created On")),
            "currency": clean(r.get("Company_Currency")),
            "description": clean(r.get("Company_Description")),
            "email": clean(r.get("Company_Email")),
            "parent_account": clean(r.get("Company_Parent Account")),
        })
    ok, err = upsert("companies", rows)
    print(f"  ✓ {ok} companies imported, ✗ {err} errors")

def get_company_map():
    """Build a map of company name → id"""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/companies?select=id,name,dynamics_id&limit=1000",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    companies = resp.json() if resp.status_code == 200 else []
    name_map = {}
    did_map = {}
    for c in companies:
        if c.get("name"):
            name_map[c["name"].lower()] = c["id"]
        if c.get("dynamics_id"):
            did_map[c["dynamics_id"]] = c["id"]
    return name_map, did_map

def import_contacts():
    print("\n" + "="*50)
    print("STEP 2: Contacts → contacts")
    print("="*50)
    df = pd.read_excel(FILES["contacts"])
    name_map, did_map = get_company_map()
    rows = []
    for _, r in df.iterrows():
        full_name = clean(r.get("Contact_Full Name"))
        if not full_name:
            continue
        company_name = clean(r.get("Contact_Company Name"))
        company_id = name_map.get((company_name or "").lower()) if company_name else None
        rows.append({
            "dynamics_id": clean(r.get("(Do Not Modify) Contact")),
            "full_name": full_name,
            "first_name": clean(r.get("Contact_First Name")),
            "last_name": clean(r.get("Contact_Last Name")),
            "email": clean(r.get("Contact_Email")),
            "phone": clean(r.get("Contact_Business Phone")),
            "mobile": clean(r.get("Contact_Mobile Phone")),
            "stage": clean(r.get("Contact_Status")) or "Active",
            "owner": clean(r.get("Contact_Owner")),
            "gender": clean(r.get("Contact_Gender")),
            "title": clean(r.get("Contact_Job Title")),
            "managing_partner": clean(r.get("Contact_Managing Partner")),
            "company_name": company_name,
            "company_id": company_id,
            "source": "Dynamics",
            "modified_on": to_date(r.get("(Do Not Modify) Modified On")),
        })
    ok, err = upsert("contacts", rows)
    print(f"  ✓ {ok} contacts imported, ✗ {err} errors")

def get_contact_map():
    """Build a map of contact name → id"""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/contacts?select=id,full_name,dynamics_id&limit=2000",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    contacts = resp.json() if resp.status_code == 200 else []
    name_map = {}
    for c in contacts:
        if c.get("full_name"):
            name_map[c["full_name"].lower()] = c["id"]
    return name_map

def import_opportunities():
    print("\n" + "="*50)
    print("STEP 3: Opportunities → opportunities")
    print("="*50)
    df = pd.read_excel(FILES["opportunities"])
    name_map, did_map = get_company_map()
    contact_map = get_contact_map()
    rows = []
    for _, r in df.iterrows():
        topic = clean(r.get("Opportunity_Topic"))
        if not topic:
            continue
        company_name = clean(r.get("Opportunity_Company")) or clean(r.get("Opportunity_Account"))
        company_id = name_map.get((company_name or "").lower()) if company_name else None
        contact_name = clean(r.get("Opportunity_Contact"))
        contact_id = contact_map.get((contact_name or "").lower()) if contact_name else None

        status = clean(r.get("Opportunity_Status")) or "Open"
        sales_stage = clean(r.get("Opportunity_Sales Stage")) or ""

        # Determine stage and sub_status
        if status == "Won":
            stage, sub_status = "active", "close"
        elif status == "Lost":
            stage, sub_status = "past", "close"
        else:
            stage = "opportunity"
            sub_status_map = {"Close": "close", "Propose": "proposal", "Develop": "develop", "Qualify": "qualify"}
            sub_status = sub_status_map.get(sales_stage, "qualify")

        # Determine probability
        prob_map = {"Close": 90, "Propose": 60, "Develop": 40, "Qualify": 20}
        probability = to_num(r.get("Opportunity_Probability")) or prob_map.get(sales_stage, 20)

        rows.append({
            "dynamics_id": clean(r.get("(Do Not Modify) Opportunity")),
            "topic": topic,
            "company_id": company_id,
            "company_name": company_name,
            "contact_id": contact_id,
            "contact_name": contact_name,
            "status": status,
            "status_reason": clean(r.get("Opportunity_Status Reason")),
            "stage": stage,
            "sub_status": sub_status,
            "sales_stage": sales_stage,
            "pipeline_phase": clean(r.get("Opportunity_Pipeline Phase")),
            "rating": clean(r.get("Opportunity_Rating")),
            "est_revenue": to_num(r.get("Opportunity_Est. revenue")),
            "actual_revenue": to_num(r.get("Opportunity_Actual Revenue")),
            "probability": probability,
            "est_close_date": to_date(r.get("Opportunity_Est. close date")),
            "actual_close_date": to_date(r.get("Opportunity_Actual Close Date")),
            "close_date": to_date(r.get("Opportunity_Actual Close Date")) or to_date(r.get("Opportunity_Est. close date")),
            "budget_amount": to_num(r.get("Opportunity_Budget amount")),
            "currency": clean(r.get("Opportunity_Currency")),
            "current_situation": clean(r.get("Opportunity_Current Situation")),
            "customer_need": clean(r.get("Opportunity_Customer Need")),
            "customer_pain_points": clean(r.get("Opportunity_Customer Pain Points")),
            "description": clean(r.get("Opportunity_Description")),
            "final_decision_date": to_date(r.get("Opportunity_Final Decision Date")),
            "product_need": clean(r.get("Opportunity_Product Need")),
            "product_line": clean(r.get("Opportunity_Product Need")),
            "proposed_solution": clean(r.get("Opportunity_Proposed Solution")),
            "purchase_process": clean(r.get("Opportunity_Purchase Process")),
            "purchase_timeframe": clean(r.get("Opportunity_Purchase Timeframe")),
            "owner": clean(r.get("Opportunity_Created By")),
            "created_on": to_date(r.get("Opportunity_Created On")),
            "modified_on": to_date(r.get("(Do Not Modify) Modified On")),
        })
    ok, err = upsert("opportunities", rows)
    print(f"  ✓ {ok} opportunities imported, ✗ {err} errors")

def import_leads():
    print("\n" + "="*50)
    print("STEP 4: Leads → leads")
    print("="*50)
    df = pd.read_excel(FILES["leads"])
    name_map, _ = get_company_map()
    rows = []
    for _, r in df.iterrows():
        full_name = clean(r.get("Leads_ Full_Name"))
        topic = clean(r.get("Leads_Topic"))
        if not full_name and not topic:
            continue
        company_name = clean(r.get("Leads_Company Name"))
        company_id = name_map.get((company_name or "").lower()) if company_name else None

        status = clean(r.get("Leads_Status Reason")) or "New"
        sub_status_map = {"New": "qualify", "Contacted": "develop", "Qualified": "proposal"}
        sub_status = sub_status_map.get(status, "qualify")

        rows.append({
            "dynamics_id": clean(r.get("(Do Not Modify) Lead")),
            "full_name": full_name or topic,
            "first_name": clean(r.get("Leads_First Name")),
            "last_name": clean(r.get("Leads_Last Name")),
            "email": clean(r.get("Leads_Email")),
            "title": clean(r.get("Leads_Job Title")),
            "company_name": company_name,
            "company_id": company_id,
            "topic": topic,
            "description": clean(r.get("Leads_Description")),
            "owner": clean(r.get("Leads_Owner")),
            "status": status,
            "sub_status": sub_status,
            "source": "Dynamics",
            "website": clean(r.get("Leads_Website")),
            "created_on": to_date(r.get("Leads_Created On")),
            "modified_on": to_date(r.get("(Do Not Modify) Modified On")),
        })
    ok, err = upsert("leads", rows)
    print(f"  ✓ {ok} leads imported, ✗ {err} errors")

def import_activities():
    print("\n" + "="*50)
    print("STEP 5: Activities → activity")
    print("="*50)
    df = pd.read_excel(FILES["activities"])
    contact_map = get_contact_map()
    rows = []
    for _, r in df.iterrows():
        subject = clean(r.get("Subject"))
        if not subject:
            continue
        regarding = clean(r.get("Regarding"))
        contact_id = contact_map.get((regarding or "").lower()) if regarding else None

        rows.append({
            "dynamics_id": clean(r.get("(Do Not Modify) Activity")),
            "note": subject,
            "type": clean(r.get("Activity Type")) or "Note",
            "source": "Dynamics",
            "contact_id": contact_id,
            "date": to_date(r.get("Start Date")) or to_date(r.get("Date Created")),
        })
    # Activity table may not have dynamics_id unique constraint
    # Insert without upsert
    url = f"{SUPABASE_URL}/rest/v1/activity"
    ok, err = 0, 0
    for i in range(0, len(rows), 50):
        batch = rows[i:i+50]
        resp = requests.post(url, json=batch, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        })
        if resp.status_code in (200, 201):
            ok += len(batch)
        else:
            for row in batch:
                r2 = requests.post(url, json=[row], headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation",
                })
                if r2.status_code in (200, 201):
                    ok += 1
                else:
                    err += 1
    print(f"  ✓ {ok} activities imported, ✗ {err} errors")

if __name__ == "__main__":
    print("="*50)
    print(f"  Eclectik CRM — Full Dynamics Import")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*50)

    import_accounts()
    import_contacts()
    import_opportunities()
    import_leads()
    import_activities()

    print("\n" + "="*50)
    print("  IMPORT COMPLETE")
    print("="*50)
