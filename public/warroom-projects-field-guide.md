# War room — Projects: field guide for Yarmilla

The **War room → Projects** tab shows every running Glint delivery project. It is
fed from your **Master Project Overview** sheet (synced into the CRM). This guide
explains each field, how to fill it, and how the war room uses it — including how
to mark a project **finished**.

> One row = one project (one client engagement / cycle). Keep one row per project.

---

## The fields

| Field (sheet column) | What it is | How to fill it |
|---|---|---|
| **Client name** | The client. | Use the client's normal name (e.g. `IMC Trading`, `Sage`). This is matched to the CRM account by name, so keep it consistent. |
| **Project name** | The specific engagement. | Free text, e.g. `IMC Trading-Q1-Q2-2026`, `Almirall-360-Q1-Q2-2026`. |
| **Service type** | What we deliver. | e.g. `CS`, `PS`, `CS and PS Support`, `360`, `Insight review` (combine as needed). |
| **Region** | Where the client sits. | e.g. `US`, `EU`, `UK`, `Switzerland`. |
| **CS owner** + **Hours** | The Customer Success person and their allocated hours. | Name of the Eclectik/associate person + number of hours. Leave `N/A` / blank if none. |
| **PS owner** + **Hours** | The People Science person and their allocated hours. | Same. |
| **Other contractors / support** + **Hours** | Anyone else and their hours. | Same. |
| **KO date** | Kick-off date. | A date (any clear format). |
| **Survey date** | When the survey goes live / closes. | A date. **Important** — see "milestones" below. |
| **Insight review date** | When the insight review / readout happens. | A date. |
| **Expected delivery start** | When delivery work begins. | A date. |
| **Expected delivery end** | When the project wraps. | A date. |
| **Project status** | Where the project stands. | One of **`Not started`**, **`In progress`**, **`Completed`** (see below). |
| **Priority** | How important / at-risk. | `Low`, `Medium`, `High`. |
| **Key notes / dependencies** | The operational detail. | Free text — this is the **Details** column in the war room. Put the things that matter here: "Survey live 27 Aug, closes ~13 Sep", "Data slipped a week", "Avneeta delivering as new partner", etc. |
| **Follow-up needed** | An action flag. | Short text if something needs chasing (e.g. "Meeting with Marco"). Leave blank if not. |

---

## How the war room uses these

**Status drives the row.**
- `Not started` → shown **red** and pinned near the top (it's something to start/chase).
- `In progress` → the normal running state.
- **`Completed` → this is how you mark a project finished.** Set Project status to
  `Completed` and it drops to a "done" state (greyed, sorted to the bottom). That's
  the only thing you need to do to retire a project from the active view.

**Health (the colour dot) is automatic.** You don't set it. The war room works it
out from: status (`Not started` → red), blocked/slipped wording in your notes,
`High` priority, the follow-up flag, and how close the next milestone is. So if you
write "data slipped" in the notes or set priority High, the row turns amber/red on
its own.

**Timeline column.** The war room shows a Timeline column with the **KO date** and the
**delivery start → end** window, taken straight from the sheet.

**Next milestone is automatic.** The war room shows the **soonest upcoming** of
Survey date / Insight review date / Expected delivery end — labelled so you know
which one. So keep those three dates current and the "what's next" column takes care
of itself.

**Hours.** The column headers total the allocated hours (CS / PS / Support), and a
small bar under each name shows used vs remaining once the *used-hours* source is
connected (today it shows all-remaining — that's expected until we wire it).

**Deal value** after the project name comes from the CRM (the client's running deal),
not the sheet — so you don't fill that.

---

## Quick rules of thumb
- One row per project; keep **Client name** spelled consistently so it links to the CRM.
- To **finish** a project: set **Project status = `Completed`**.
- Put the real story in **Key notes** — that's what people read at a glance.
- Keep **Survey / Insight review / Delivery end** dates current — they drive "next milestone" and the health colour.
- Use **Priority** + **Follow-up needed** to make something jump out (turns it amber/red).
