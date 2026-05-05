# Eclectik-CRM → Team-account migratie

Korte checklist om Claude Code te verplaatsen van een persoonlijk Max-account
naar de gedeelde **Eclectik Team** Anthropic-organisatie, zodat het werk aan
deze codebase kan doorgaan zonder afhankelijkheid van een individueel account.

## Voorbereiding (in de huidige sessie)

1. **Push alles wat nog ligt** → `git status` moet "nothing to commit" laten zien.
2. **Belangrijke discussies bewaren?** Conversation-history is account-gebonden.
   Als referenties uit oude chats nuttig zijn voor later, kopieer/screenshot ze
   nu. Codebase-geheugen via `MEMORY.md` (in `~/.claude/projects/.../memory/`)
   blijft wel staan — dat is een lokaal file.

## De switch zelf

1. In de terminal: `/logout` — uitloggen van het Max-account
2. `/login` — inloggen met de **Eclectik Team** credentials (aparte Anthropic org)
3. Verifieer met `/status` of `claude config` in een verse terminal: toont
   welke org actief is
4. Open Claude Code opnieuw in `~/Desktop/eclektik-crm/`

## Wat hetzelfde blijft — geen actie

| Onderdeel | Locatie | Waarom |
|---|---|---|
| Repo + alle code | `~/Desktop/eclektik-crm/` | machine-local |
| Git auth (`gh` CLI) | `~/.config/gh/` | machine-local |
| Vercel CLI auth | `~/.config/vercel/` | machine-local |
| Memory files | `~/.claude/projects/…/memory/` | machine-local |
| Skills (superpowers, ads, marketing) | `~/.claude/` | machine-local |
| MCP configs (`.claude/settings.json`, `launch.json`) | in de repo | komt mee bij clone |
| App-OAuth (Anthropic API, Supabase, MS Graph, Unipile) | Vercel env vars | totaal los van Claude Code |

## Wat opnieuw aangesloten moet worden

- **Chrome MCP** — bij eerste gebruik in de Team-sessie: open Chrome, klik het
  Claude-icoon in de toolbar, druk **Connect**. Eenmalig per machine.

## Wat verloren gaat

- **Conversation-history** van het Max-account is niet zichtbaar in Team.

## Sanity check na de switch

Open Claude Code in de repo en doe deze mini-test:

1. Sessie start zonder errors
2. Vraag iets simpels: *"lees CLAUDE.md en vat samen"*
3. Maak een trivial commit (bijv. typo-fix), push
4. Vercel deploy slaagt, productie nog steeds OK

Als alle vier groen zijn is de overstap geslaagd.

## Aandachtspunt: Team-plan quota

Anthropic Team-plan limieten kunnen anders zijn dan Max — gedeelde quota onder
org-members. Als meerdere mensen tegelijk Claude Code gebruiken op het
Team-account kan dat schuren. Houd het kort in de gaten en upgrade waar nodig.
