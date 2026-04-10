// ─── PALETTE ─────────────────────────────────────────────────────────────────
export const C = {
  lead:        { dot:"#378ADD", bg:"#E6F1FB", color:"#0C447C", border:"#85B7EB" },
  opportunity: { dot:"#EF9F27", bg:"#FAEEDA", color:"#633806", border:"#FAC775" },
  qualify:     { dot:"#7F77DD", bg:"#EEEDFE", color:"#3C3489", border:"#AFA9EC" },
  develop:     { dot:"#EF9F27", bg:"#FAEEDA", color:"#633806", border:"#FAC775" },
  proposal:    { dot:"#D4537E", bg:"#FBEAF0", color:"#72243E", border:"#ED93B1" },
  close:       { dot:"#1D9E75", bg:"#E1F5EE", color:"#085041", border:"#5DCAA5" },
  onboarding:  { dot:"#D85A30", bg:"#FAECE7", color:"#4A1B0C", border:"#F0997B" },
  active:      { dot:"#1D9E75", bg:"#E1F5EE", color:"#085041", border:"#5DCAA5" },
  inactive:    { dot:"#888780", bg:"#F1EFE8", color:"#444441", border:"#B4B2A9" },
  past:        { dot:"#5F5E5A", bg:"#F1EFE8", color:"#2C2C2A", border:"#D3D1C7" },
}
export const sc = (k) => C[k] || C.lead

export const COLS = [
  { key:"qualify",    label:"Qualify",    funnelStages:["lead","opportunity"],  subStatus:"qualify"  },
  { key:"develop",    label:"Develop",    funnelStages:["lead","opportunity"],  subStatus:"develop"  },
  { key:"proposal",   label:"Proposal",   funnelStages:["lead","opportunity"],  subStatus:"proposal" },
  { key:"close",      label:"Close",      funnelStages:["lead","opportunity"],  subStatus:"close"    },
  { key:"onboarding", label:"Onboarding", funnelStages:["onboarding"],          subStatus:null       },
  { key:"active",     label:"Active",     funnelStages:["active"],              subStatus:null       },
]

export const FUNNEL_STAGES = [
  { key:"lead",        label:"Leads"            },
  { key:"opportunity", label:"Opportunities"    },
  { key:"onboarding",  label:"Onboarding"       },
  { key:"active",      label:"Active clients"   },
  { key:"inactive",    label:"Inactive clients" },
  { key:"past",        label:"Past clients"     },
]

export const LEAD_SUB = ["qualify","develop","proposal","close"]

export const MS_STATUS_C = {
  done:    { bg:"#E1F5EE", color:"#085041", border:"#5DCAA5", label:"Done"    },
  active:  { bg:"#FAEEDA", color:"#633806", border:"#FAC775", label:"Active"  },
  pending: { bg:"#F1EFE8", color:"#5F5E5A", border:"#D3D1C7", label:"Pending" },
  delayed: { bg:"#FCEBEB", color:"#791F1F", border:"#F09595", label:"Delayed" },
}

export const pepC = {
  "do_now":   { bg:"#FCEBEB", color:"#791F1F", dot:"#E24B4A", label:"Do now"    },
  "do-now":   { bg:"#FCEBEB", color:"#791F1F", dot:"#E24B4A", label:"Do now"    },
  "schedule": { bg:"#FAEEDA", color:"#633806", dot:"#EF9F27", label:"Schedule"  },
  "scheduled":{ bg:"#E1F5EE", color:"#085041", dot:"#1D9E75", label:"Scheduled" },
  "done":     { bg:"#E1F5EE", color:"#085041", dot:"#1D9E75", label:"Done"      },
}

export const TEAM = {
  YK:  { name:"YK",  role:"Operations & Delivery",    initials:"YK", avatarBg:"#E6F1FB", avatarColor:"#0C447C" },
  OA:  { name:"OA",  role:"Support & Client Success",  initials:"OA", avatarBg:"#E1F5EE", avatarColor:"#085041" },
  MVG: { name:"MVG", role:"Business Development",      initials:"MV", avatarBg:"#FAEEDA", avatarColor:"#633806" },
}

export const typeColors = {
  Klant:      { bg:"#E1F5EE", color:"#085041" },
  Partner:    { bg:"#EEEDFE", color:"#3C3489" },
  "Big Four": { bg:"#FAEEDA", color:"#633806" },
}

export const docIcon = { pdf:"📄", doc:"📝", xls:"📊", ppt:"📑", email:"✉" }

export const fmt = (n) => n >= 1000 ? `€${(n/1000).toFixed(0)}k` : `€${n}`

// Country flag lookup
const FLAGS = {
  "Netherlands":"🇳🇱","France":"🇫🇷","Germany":"🇩🇪","Belgium":"🇧🇪",
  "Spain":"🇪🇸","Italy":"🇮🇹","UK":"🇬🇧","USA":"🇺🇸","Switzerland":"🇨🇭",
}
export const getFlag = (country) => FLAGS[country] || "🏳️"

// Deterministic avatar color from name
const AVATAR_COLORS = [
  { bg:"#E6F1FB", color:"#0C447C" },
  { bg:"#E1F5EE", color:"#085041" },
  { bg:"#FAEEDA", color:"#633806" },
  { bg:"#FBEAF0", color:"#72243E" },
  { bg:"#EEEDFE", color:"#3C3489" },
  { bg:"#FAECE7", color:"#712B13" },
]
export function avatarColorFromName(name) {
  if (!name) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function getInitials(name) {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].substring(0, 2).toUpperCase()
}
