# Warm vloerverwarming stap 1: uitlezen, bewaren en tonen

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De twee Honeywell-thermostaten beneden (Keuken en Zitkamer) worden door het NAS-programma via HomeKit uitgelezen, Warm bewaart de stand en een momentopname per 5 minuten, en de app toont ze op het hoofdscherm en op een nieuw scherm Vloerverwarming (onderdeel Nu).

**Architecture:** Het NAS-programma krijgt drie nieuwe bestanden naast `warm_energie.py`: versleuteling in gewone Python (`hap_crypto.py`), het HomeKit-protocol voor alleen lezen (`hap.py`) en de uitlezer met tellers (`warm_vloer.py`), die als eigen draad naast de energie-uitlezer draait. De uitlezer stuurt elke ronde naar een nieuwe ingang `POST /api/vloer/meting`; `GET /api/vloer` levert de stand aan de app. De HomeKit-sleutels reizen alleen van de proefmap op de Mac naar het NAS-pakket (`vloer.json`).

**Tech Stack:** Python 3.8+ met alleen de standaardbibliotheek (NAS), unittest; Node 24 Vercel-functies (ESM), Supabase Postgres, React 19 + Vite, Vitest.

**Spec:** `/Users/olivierarnolds/Desktop/eclektik-crm/docs/superpowers/specs/2026-11-03-warme-thuis-app-design.md`, hoofdstuk 13 (regels 423 tot en met 597). Dit plan dekt alleen punt 1 van "Volgorde". Buitentemperatuur, de grafiek van 24 uur, Per etmaal en Vergelijken komen in latere plannen.

**Repo:** `/Users/olivierarnolds/Desktop/warm-app`, rechtstreeks op `main`. Elke taak eigen commits.

## Global Constraints

- Alles in het Nederlands: namen, commentaar, UI-tekst, foutteksten, commits. Commentaar is kort en zegt waarom.
- Nooit een em-dash (U+2014), nergens: niet in code, tests, commentaar, UI-tekst of commits.
- Commits eindigen met de regel `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`. Niet pushen; dat doet de opdrachtgever.
- Geen nieuwe npm-pakketten. Geen versienummer ophogen.
- NAS-code: alleen de standaardbibliotheek van Python, moet werken op Python 3.8 (geen `match`, geen `X | Y` in type-aanduidingen, geen `removeprefix`). Controleer met `/usr/bin/python3` (3.9) en met `python3`.
- Alleen lezen. Geen enkele code in dit plan mag een instelling naar een thermostaat sturen. Het HomeKit-deel mag precies drie verzoeken doen: `POST /pair-verify`, `GET /accessories`, `GET /characteristics`. Elk ander verzoek wordt geweigerd voordat er een byte de deur uitgaat.
- Tests en controles praten nooit met de echte thermostaten (192.168.2.9 en 192.168.2.10). Tests gebruiken een nagebootste thermostaat in het geheugen of op 127.0.0.1.
- Geheimen: open of toon nooit `koppeling*.json`, `.env*`, `instellingen.json`, `vloer.json` of iets onder `nas-pakket/` of `.superpowers/proef-homekit/` behalve `venv/` en `nep_thermostaat.py`. HomeKit-sleutels, het Warm-geheim en tokens komen nooit in een logregel, foutmelding, testuitvoer of commit. Logregels noemen alleen de sleutelnaam van de thermostaat (`keuken`) en de naam van het fouttype (`type(fout).__name__`).
- De sleutels komen nooit in de database en nooit in Vercel.
- Tests draaien: `npx vitest run --maxWorkers=3` in de repo (dit draait ook de Python-tests via `tests/nas-script.test.js`). Python los: `python3 -m unittest discover -s nas -p 'test_*.py'`. Beoordeel de exitcode van het commando zelf.
- De volledige Python-testreeks blijft onder 20 seconden met `python3`.
- Nieuwe tabellen: `enable row level security` zonder policies; functies `revoke all ... from public, anon, authenticated` en `grant execute ... to service_role` (patroon van `supabase/migrations/0007_energie.sql`). De migratie wordt niet door de uitvoerder toegepast.
- Alle databasetoegang loopt via `api/_lib/opslag.js`. Elke handler roept eerst `geenCache(res)` aan en leest env-variabelen pas binnen de handler.

**Berichtvorm NAS naar Warm** (`POST /api/vloer/meting`, kop `Authorization: Bearer <ENERGIE_GEHEIM>`):

```json
{"thermostaten": [
  {"sleutel": "keuken", "gemeten": 20.0, "doel": 20.5, "stookt": true, "stand": 1, "gezien_s": 86400, "stook_s": 5400}
]}
```

Een thermostaat die deze ronde niet gelezen kon worden staat er niet in. Is er geen enkele gelezen, dan wordt er niets verstuurd.

**Vorm van `vloer.json`** (alleen in het NAS-pakket, rechten 0600):

```json
{"warm_url": "https://warm-app-flax.vercel.app/api/vloer/meting",
 "thermostaten": [
   {"sleutel": "keuken", "adres": "192.168.2.9", "poort": 80,
    "accessoire_id": "<17 tekens>", "accessoire_ltpk": "<64 hex>",
    "lezer_id": "<36 tekens>", "lezer_ltsk": "<64 hex>"}
 ]}
```

**HomeKit-feiten (gemeten op beide thermostaten, 2026-11-19):** poort 80; `aid` 1; thermostaatdienst type `4A`; kenmerken: `0F` stookt nu (0 rust, 1 verwarmt), `33` stand (0 uit, 1 verwarmen), `11` gemeten temperatuur, `35` doeltemperatuur. Types komen kort (`"4A"`) of lang (`"0000004A-0000-1000-8000-0026BB765291"`) en in hoofd- of kleine letters voor. Zoek de nummers (`iid`) altijd op via het type; reken niet op vaste nummers.

## Review Focus

1. De thermostaat valt weg of wisselt van wifi-punt midden in een sessie: de uitlezer verbindt opnieuw, de energie-uitlezer merkt er niets van, en een gat langer dan 90 seconden telt niet als gezien. (Taak 3)
2. Antwoorden komen in stukjes binnen (één byte per keer, een frame verdeeld over meerdere leesacties, `Transfer-Encoding: chunked`): de lezer zet ze goed in elkaar. (Taak 2)
3. De klok springt terug of het programma herstart: een teller loopt nooit terug en maakt geen sprong. (Taak 3)
4. `vloer.json` ontbreekt, is kapot of bevat een thermostaat met halve sleutels: de energiemetingen lopen door, er komt één logregel, en er staat geen sleutel in het logboek. (Taak 3)
5. De ingang krijgt een half geldig bericht (onbekende thermostaat, dubbele sleutel, tekst waar een getal hoort, `stookt` als getal): niets wordt bewaard en het antwoord is 400. Een stand ouder dan 5 minuten wordt niet als actuele temperatuur getoond. (Taak 5 en 6)

---

### Task 1: Versleuteling in gewone Python (`nas/hap_crypto.py`)

**Files:**
- Create: `nas/hap_crypto.py`
- Test: `nas/test_hap_crypto.py`, `nas/test_hap_crypto_kruis.py`

**Interfaces:**
- Produces (alle argumenten en resultaten zijn `bytes` tenzij anders vermeld):
  - `hkdf(ikm, salt, info, lengte=32, hashnaam="sha512") -> bytes` (RFC 5869)
  - `chacha20_poly1305_versleutel(sleutel, nonce, tekst, aad=b"") -> bytes` (cijfertekst + 16 bytes tag; `sleutel` 32 bytes, `nonce` 12 bytes; RFC 8439)
  - `chacha20_poly1305_ontsleutel(sleutel, nonce, data, aad=b"") -> bytes`; gooit `ValueError("tag klopt niet")` bij een verkeerde tag of minder dan 16 bytes; vergelijkt de tag met `hmac.compare_digest`
  - `x25519(geheim, punt) -> bytes` en `x25519_publiek(geheim) -> bytes` (RFC 7748; 32 bytes; gooit `ValueError` als het resultaat alleen nullen is)
  - `ed25519_publiek(seed) -> bytes`, `ed25519_teken(seed, bericht) -> bytes` (64 bytes), `ed25519_klopt(publiek, bericht, handtekening) -> bool` (RFC 8032; `seed` is 32 bytes; `ed25519_klopt` geeft `False` bij elke ongeldige invoer, ook bij verkeerde lengtes of een punt dat niet op de kromme ligt, en gooit nooit)
- Verkeerde lengtes van sleutels of nonces geven `ValueError` (behalve in `ed25519_klopt`).

- [ ] **Step 1: Schrijf de tests met de officiële testwaarden**

In `nas/test_hap_crypto.py` (unittest). Neem de waarden letterlijk over uit de RFC-teksten (haal ze op van `https://www.rfc-editor.org/rfc/rfcNNNN.txt`; typ ze niet uit het hoofd):
- RFC 8439 paragraaf 2.8.2 (AEAD: sleutel, nonce, AAD, klare tekst, cijfertekst en tag): versleutelen geeft precies cijfertekst + tag, ontsleutelen geeft de klare tekst terug.
- RFC 8439 bijlage A.5 (ontsleutelen van een tweede bericht).
- Eén gewijzigde byte in de cijfertekst, in de tag en in de AAD geeft elk `ValueError`.
- RFC 5869 bijlage A.1 (test case 1) met `hashnaam="sha256"`, lengte 42.
- RFC 7748 paragraaf 5.2: de twee losse vectoren en de eerste iteratie (1 keer) van de herhaalde test; paragraaf 6.1: publieke sleutels van Alice en Bob en het gedeelde geheim in beide richtingen.
- RFC 8032 paragraaf 7.1: TEST 1, TEST 2, TEST 3 en TEST 1024 (publieke sleutel uit de seed, handtekening, en `ed25519_klopt` is `True`).
- `ed25519_klopt` is `False` bij: een gewijzigd bericht, een gewijzigde handtekening, een handtekening van 63 bytes, een publieke sleutel van 31 bytes, en `S` groter of gelijk aan de groepsorde.
- Lege klare tekst en een klare tekst van 1, 63, 64, 65 en 1024 bytes gaan heen en terug goed.

In `nas/test_hap_crypto_kruis.py`: een klasse met `@unittest.skipUnless(importlib.util.find_spec("cryptography"), ...)` die voor 25 willekeurige invoeren (vaste `random.Random(13)`) elke functie vergelijkt met de bibliotheek `cryptography` (X25519, Ed25519 tekenen en controleren in beide richtingen, ChaCha20Poly1305 met AAD, HKDF met SHA-512 en de vaste teksten `Pair-Verify-Encrypt-Salt` / `Pair-Verify-Encrypt-Info`).

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `python3 -m unittest discover -s nas -p 'test_hap_crypto*.py'`
Expected: FAIL (module `hap_crypto` bestaat niet).

- [ ] **Step 3: Schrijf `nas/hap_crypto.py`**

Alleen `hashlib`, `hmac` en `struct` uit de standaardbibliotheek. Bovenaan een commentaar dat zegt waarom dit met de hand is geschreven (de NAS heeft geen `cryptography`) en dat de functies niet tegen tijdmetingen zijn gehard, wat hier niet erg is: het programma praat alleen binnen het thuisnetwerk en doet per sessie één handtekening. Ed25519 met uitgebreide coördinaten, zodat een handtekening op een trage NAS ruim binnen een seconde klaar is.

- [ ] **Step 4: Draai de tests op alle drie de Pythons**

Run: `python3 -m unittest discover -s nas -p 'test_hap_crypto*.py'`
Run: `/usr/bin/python3 -m unittest discover -s nas -p 'test_hap_crypto*.py'`
Run: `/Users/olivierarnolds/Desktop/warm-app/.superpowers/proef-homekit/venv/bin/python -m unittest discover -s nas -p 'test_hap_crypto*.py'`
Expected: alle drie OK; alleen bij de derde draait de kruistest mee (niet overgeslagen). Meld in het rapport hoeveel tests er liepen, hoeveel er werden overgeslagen en hoe lang de reeks duurde.

- [ ] **Step 5: Commit**

```bash
git add nas/hap_crypto.py nas/test_hap_crypto.py nas/test_hap_crypto_kruis.py
git commit -m "NAS: versleuteling voor HomeKit in gewone Python, getest tegen de RFC-waarden"
```

---

### Task 2: HomeKit lezen (`nas/hap.py`)

**Files:**
- Create: `nas/hap.py`, `nas/dev/nep_thermostaat.py`
- Test: `nas/test_hap.py`, `nas/test_hap_echt.py`

**Interfaces:**
- Consumes: alle functies uit Task 1.
- Produces:
  - `TOEGESTAAN = (("POST", "/pair-verify"), ("GET", "/accessories"), ("GET", "/characteristics"))`
  - `class HapFout(Exception)`: verbinding of protocol ging mis. `class HapGeweigerd(HapFout)`: het apparaat herkent onze sleutels niet, of is een ander apparaat dan verwacht.
  - `tlv_maak(paren) -> bytes` (`paren` is een lijst van `(type: int, waarde: bytes)`; waarden boven 255 bytes in opeenvolgende stukken van hetzelfde type) en `tlv_lees(data) -> dict` (`{type: bytes}`; opeenvolgende stukken van hetzelfde type aan elkaar; afgebroken data geeft `HapFout`)
  - `class HapSessie` met `__init__(self, adres, poort, sleutels, tijd=5.0, verbind=socket.create_connection, willekeur=os.urandom)`, `open(self) -> None`, `haal(self, pad) -> tuple` (`(status: int, inhoud)`; `pad` mag een query hebben; `inhoud` is de ontlede JSON), `sluit(self) -> None` (mag altijd, ook twee keer). `sleutels` is een dict `{"accessoire_id": str, "accessoire_ltpk": bytes, "lezer_id": str, "lezer_ltsk": bytes}`.
  - `vind_kenmerken(accessoires) -> dict`: uit het antwoord van `/accessories` de dict `{"aid": int, "stookt": int, "stand": int, "gemeten": int, "doel": int}` (de `iid` per kenmerk); `HapFout` als de dienst `4A` of een van de vier kenmerken ontbreekt.
  - `lees_waarden(sessie, kenmerken) -> dict`: `{"gemeten": float, "doel": float, "stookt": bool, "stand": int}` via één `GET /characteristics?id=<aid>.<iid>,...`; `stookt` is `True` als de waarde van `0F` gelijk is aan 1; `HapFout` bij een status anders dan 200 of 207, een ontbrekende waarde, een item met een `status` ongelijk aan 0, of een waarde die geen getal is.

**Protocol (exacte waarden):**
- Het eerste verzoek gaat onversleuteld als gewone HTTP/1.1: `POST /pair-verify`, koppen `Host`, `Content-Type: application/pairing+tlv8`, `Content-Length`. Het antwoord heeft een `Content-Length`.
- TLV-types: `0x01` Identifier, `0x03` PublicKey, `0x05` EncryptedData, `0x06` State, `0x07` Error, `0x0A` Signature.
- M1 (wij): State `01`, PublicKey = onze tijdelijke X25519-publieke sleutel (geheim uit `willekeur(32)`).
- M2 (apparaat): State `02`, PublicKey, EncryptedData. Bevat het antwoord een Error, of is de State anders: `HapGeweigerd`.
- Gedeeld geheim = `x25519(ons geheim, PublicKey van het apparaat)`. Sleutel = `hkdf(gedeeld, b"Pair-Verify-Encrypt-Salt", b"Pair-Verify-Encrypt-Info")`.
- EncryptedData van M2 ontsleutelen met nonce `b"\x00\x00\x00\x00PV-Msg02"`, zonder AAD. Daarin een TLV met Identifier en Signature. De Identifier moet gelijk zijn aan `accessoire_id` (als UTF-8) en `ed25519_klopt(accessoire_ltpk, apparaat_publiek + accessoire_id + ons_publiek, Signature)` moet `True` zijn; anders `HapGeweigerd`. Een verkeerde tag is ook `HapGeweigerd`.
- M3 (wij): TLV met Identifier = `lezer_id` (UTF-8) en Signature = `ed25519_teken(lezer_ltsk, ons_publiek + lezer_id + apparaat_publiek)`, versleuteld met nonce `b"\x00\x00\x00\x00PV-Msg03"`; verstuur State `03` en EncryptedData.
- M4 (apparaat): State `04` zonder Error; anders `HapGeweigerd`.
- Sessiesleutels: van ons naar het apparaat `hkdf(gedeeld, b"Control-Salt", b"Control-Write-Encryption-Key")`; terug `hkdf(gedeeld, b"Control-Salt", b"Control-Read-Encryption-Key")`.
- Daarna gaat alles in frames: 2 bytes lengte (little-endian, hooguit 1024, tevens de AAD), cijfertekst, 16 bytes tag. Nonce: 4 nulbytes + teller van 8 bytes little-endian; elke richting een eigen teller vanaf 0, plus één per frame.
- Binnen de frames gewone HTTP/1.1: `GET <pad>` met kop `Host`. Antwoorden hebben `Content-Length` of `Transfer-Encoding: chunked`.
- `lezer_ltsk` van 64 bytes: gebruik de eerste 32 als seed.

**Regels:**
- Eén functie verstuurt verzoeken en controleert daar als eerste `(methode, pad zonder query)` tegen `TOEGESTAAN`; anders `ValueError` zonder dat er iets verstuurd is. `HapSessie` heeft geen methode om te schrijven.
- Elke fout uit de socket (`OSError`, time-out), een dichte verbinding midden in een antwoord, een verkeerde tag in een frame, een antwoord groter dan 256 kB en kapotte JSON worden `HapFout`. Na elke fout is de sessie dicht.
- `haal` voor `open` geeft `HapFout`.
- Geen sleutel, gedeeld geheim of ruwe inhoud in een foutmelding.

- [ ] **Step 1: Schrijf de nagebootste thermostaat voor in het geheugen en de falende tests**

In `nas/test_hap.py` een klasse `NepAccessoire` die de apparaatkant speelt met de functies uit Task 1 en zich voordoet als socket (`sendall`, `recv`, `settimeout`, `close`). Instelbaar: antwoord in stukjes van 1 byte, frames van hooguit 100 bytes, `chunked`, een verkeerde handtekening, een andere Identifier, een Error in M2 of M4, een kapotte tag in het derde frame, de verbinding dicht na N bytes. Hij houdt bij welke verzoeken hij kreeg. Zijn `/accessories` geeft één accessoire met de dienst `4A` en de kenmerken `0F`, `33`, `11`, `35`, `36`, `23` op de iid's 275 tot en met 280.

Tests (namen in het Nederlands), elk met een eigen bewering:
- `tlv_maak`/`tlv_lees`: heen en terug, een waarde van 300 bytes wordt 255 + 45, afgebroken data geeft `HapFout`.
- `open` slaagt; daarna geeft `haal("/accessories")` status 200 en de verwachte dict.
- `vind_kenmerken` vindt `{"aid": 1, "stookt": 275, "stand": 276, "gemeten": 277, "doel": 278}`, met korte types, met lange types en met kleine letters.
- `lees_waarden` geeft `{"gemeten": 19.5, "doel": 20.0, "stookt": True, "stand": 1}` en vraagt precies `/characteristics?id=1.275,1.276,1.277,1.278` op.
- Hetzelfde resultaat bij: 1 byte per keer, kleine frames, `chunked`, status 207.
- `HapGeweigerd` bij: verkeerde handtekening, andere Identifier, Error in M2, Error in M4.
- `HapFout` (en niet `HapGeweigerd`) bij: verbinding dicht halverwege, kapotte tag in een frame, `verbind` gooit `OSError`, time-out, kapotte JSON, een item met `status` -70402.
- Na een `HapFout` geeft een volgende `haal` weer `HapFout` en is de nep-socket gesloten.
- Een verzoek buiten de lijst wordt geweigerd: roep de interne verzendfunctie aan met `("PUT", "/characteristics")` en met `("GET", "/pair-setup")`; verwacht `ValueError` en dat `NepAccessoire` geen byte heeft ontvangen.
- `dir(hap.HapSessie)` bevat geen naam met `zet`, `put`, `schrijf` of `stuur_waarde`.
- Een test die het logboek en de tekst van elke gegooide fout doorzoekt op de hex van `lezer_ltsk`, van `accessoire_ltpk` en van het gedeelde geheim: geen treffer.

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `python3 -m unittest nas/test_hap.py` (vanuit de repo: `python3 -m unittest discover -s nas -p 'test_hap.py'`)
Expected: FAIL (module `hap` bestaat niet).

- [ ] **Step 3: Schrijf `nas/hap.py`**

Bovenaan in commentaar: dit bestand leest alleen, en de regel van de drie verzoeken. Imports: `json`, `os`, `socket`, `struct` en `hap_crypto`.

- [ ] **Step 4: Draai de tests**

Run: `python3 -m unittest discover -s nas -p 'test_hap*.py'` en dezelfde opdracht met `/usr/bin/python3`.
Expected: OK.

- [ ] **Step 5: Test tegen een echte HomeKit-implementatie op 127.0.0.1**

`nas/dev/nep_thermostaat.py` (draait alleen met een Python waarin `pyhap` zit): aanroep `nep_thermostaat.py <map> <poort> <lezer_id> <lezer_seed_hex>`. Hij maakt een thermostaat met HAP-python (kijk af bij `/Users/olivierarnolds/Desktop/warm-app/.superpowers/proef-homekit/nep_thermostaat.py`: `CurrentTemperature` 19.5, `TargetTemperature` 20.0, `CurrentHeatingCoolingState` 1, `TargetHeatingCoolingState` 1, en bij elke poging tot instellen de regel `GESCHREVEN:` op de uitvoer), registreert de lezer vooraf als gekoppeld met `driver.state.add_paired_client(lezer_id_bytes, publieke_sleutel_bytes, HAP_PERMISSIONS.ADMIN)` (de publieke sleutel rekent hij uit met de bibliotheek `cryptography`, niet met onze code), schrijft `<map>/nep.json` met `{"accessoire_id": driver.state.mac, "accessoire_ltpk": <hex van de publieke sleutel van de driver>}` en drukt `NEP KLAAR` af. De test-seed en test-id zijn vaste nepwaarden in de test, geen echte sleutels.

`nas/test_hap_echt.py`: overgeslagen als `pyhap` niet te importeren is. Start `nep_thermostaat.py` als subproces met `sys.executable` op een vrije poort in een tijdelijke map, wacht hooguit 20 seconden op `NEP KLAAR`, en test dan met `HapSessie("127.0.0.1", poort, sleutels)`:
- `open`, `vind_kenmerken(haal("/accessories")[1])` en `lees_waarden` geven gemeten 19.5, doel 20.0, stookt `True`, stand 1;
- twee keer achter elkaar lezen over dezelfde sessie werkt;
- met een verkeerde `lezer_ltsk` (andere seed) geeft `open` een `HapGeweigerd`;
- met een verkeerde `accessoire_ltpk` geeft `open` een `HapGeweigerd`;
- na afloop staat `GESCHREVEN:` nergens in de uitvoer van het subproces.
Het subproces wordt altijd gestopt (`addCleanup`).

Run: `/Users/olivierarnolds/Desktop/warm-app/.superpowers/proef-homekit/venv/bin/python -m unittest discover -s nas -p 'test_hap*.py'`
Expected: OK, en `test_hap_echt` is niet overgeslagen. Zet in het rapport de uitvoerregel waaruit dat blijkt.

- [ ] **Step 6: Commit**

```bash
git add nas/hap.py nas/test_hap.py nas/test_hap_echt.py nas/dev/nep_thermostaat.py
git commit -m "NAS: HomeKit-thermostaat uitlezen, alleen lezen, getest tegen een nagebootste thermostaat"
```

---

### Task 3: De uitlezer met tellers (`nas/warm_vloer.py`)

**Files:**
- Create: `nas/warm_vloer.py`
- Modify: `nas/warm_energie.py` (alleen `main()`, plus een kleine functie `start_vloer`)
- Test: `nas/test_warm_vloer.py`, en een paar tests erbij in `nas/test_warm_energie.py`

**Interfaces:**
- Consumes: `hap.HapSessie`, `hap.vind_kenmerken`, `hap.lees_waarden`, `hap.HapFout`, `hap.HapGeweigerd`; uit `warm_energie.py`: `stuur_naar_warm(url, geheim, meting)` (geeft de HTTP-status), `MAP`, `log`.
- Produces:
  - `VLOER_NAAM = "vloer.json"`, `TOESTAND_NAAM = "vloer_toestand.json"`, `GAT_MAX = 90`, `BEWAAR_PAUZE = 300`, `LOG_PAUZE = 60`
  - `lees_vloer_instellingen(pad) -> dict` of `None` als het bestand er niet is; `ValueError` met een Nederlandse tekst bij een ongeldige inhoud (de tekst noemt het veld, nooit de waarde). Resultaat: `{"warm_url": str, "thermostaten": [{"sleutel", "adres", "poort", "sleutels": {...zoals HapSessie verwacht, hex al omgezet naar bytes}}]}`. Eisen: `warm_url` begint met `https://`; 1 tot 8 thermostaten; `sleutel` past op `^[a-z0-9_]{1,32}$` en is uniek; `poort` 1 tot 65535 (standaard 80); `accessoire_ltpk` 64 hex; `lezer_ltsk` 64 of 128 hex; `accessoire_id` en `lezer_id` niet leeg.
  - `werk_teller_bij(stand, nu, stookt) -> None`: werkt de dict `stand` bij met de sleutels `gezien_s`, `stook_s` (getallen, beginnen op 0) en `laatst_op`, `laatst_stookt` (alleen in het geheugen).
  - `class VloerLezer` met `__init__(self, inst, geheim, map_pad, verstuur, sessie_maker=hap.HapSessie, klok=time.time, zoek=None)`, `ronde(self) -> None`, `bewaar(self, altijd=False) -> None`, `sluit(self) -> None`
  - `start(map_pad, geheim, stop, verstuur, interval=30, netwerk=None) -> threading.Thread` of `None` (geen `vloer.json`)
  - `main(argv=None) -> int` met de optie `--proef`
- De parameter `zoek` en het argument `netwerk` worden in Task 4 ingevuld; in deze taak worden ze alleen doorgegeven en bewaard.

**Regels voor de tellers** (`werk_teller_bij`):
- Is er een vorige geslaagde lezing en is `0 < nu - laatst_op <= GAT_MAX`: `gezien_s` stijgt met het verschil, en `stook_s` ook als `laatst_stookt` waar was (de tussentijd telt bij de stand aan het begin van die tussentijd).
- Is het verschil nul, negatief of groter dan `GAT_MAX`: de tellers blijven staan.
- Daarna altijd `laatst_op = nu` en `laatst_stookt = stookt`.

**Regels voor `VloerLezer`:**
- `ronde` leest de thermostaten een voor een. Per thermostaat één open sessie die tussen rondes open blijft, met de gevonden kenmerken erbij. Mislukt het lezen over een bestaande sessie met `HapFout`, dan één keer opnieuw met een verse sessie in dezelfde ronde. Mislukt het daarna nog, dan doet deze thermostaat deze ronde niet mee; de andere wel.
- Het bericht heeft precies de berichtvorm uit Global Constraints; `gezien_s` en `stook_s` als gehele getallen (naar beneden afgerond), `gemeten` en `doel` als getal.
- Versturen: `verstuur(inst["warm_url"], geheim, bericht)`. Elke fout bij het versturen (`Exception`) wordt gelogd en gooit niet door; de tellers zijn dan al bijgewerkt.
- `vloer_toestand.json`: `{"keuken": {"gezien_s": ..., "stook_s": ...}, ...}`, atomair geschreven met rechten 0600 (zelfde werkwijze als `_bewaar` in `warm_energie.py`). `bewaar()` schrijft hooguit eens per `BEWAAR_PAUZE` seconden; `bewaar(altijd=True)` schrijft meteen. Een onleesbaar toestandsbestand geeft een waarschuwing en begint op nul. Tellers van een thermostaat die niet meer in de instellingen staat blijven in het bestand staan.
- Logboek: `logging.getLogger("warm_energie.vloer")`. Dezelfde melding hooguit eens per `LOG_PAUZE` seconden per (thermostaat, soort fout). Een `HapGeweigerd` krijgt de tekst `Thermostaat <sleutel>: de koppeling wordt geweigerd. Koppel opnieuw op de Mac.` Andere fouten: `Thermostaat <sleutel> niet bereikbaar (<fouttype>).` De eerste geslaagde lezing na een fout geeft één regel op INFO: `Thermostaat <sleutel> weer bereikbaar.`
- `start`: leest `os.path.join(map_pad, VLOER_NAAM)`. Geen bestand: één INFO-regel `Geen vloer.json: de thermostaten worden niet uitgelezen.` en `None`. Ongeldig bestand: één ERROR-regel met de tekst van de `ValueError` en `None`. Anders een draad (`daemon=True`, naam `vloer`) die tot `stop` gezet is elke `interval` seconden `ronde()` en `bewaar()` doet, elke onverwachte fout in een ronde logt (alleen het fouttype) en doorgaat, en bij het stoppen `bewaar(altijd=True)` en `sluit()` aanroept.
- `main(["--proef"])`: leest `vloer.json` uit de map van het script, leest elke thermostaat één keer, drukt per thermostaat een regel af zoals `keuken: gemeten 20.0, doel 20.0, stookt nee, stand 1` (of `keuken: niet gelukt (<fouttype>)`), verstuurt niets, schrijft geen toestand, en geeft 0 als alle gelukt zijn, anders 1. Zonder `--proef` drukt het een korte uitleg af en geeft 2.
- In `warm_energie.py`: `start_vloer(inst, stop)` doet `import warm_vloer` binnen een `try` en roept `warm_vloer.start(MAP, inst["geheim"], stop, stuur_naar_warm, inst.get("interval_seconden", 30), netwerk=(eigen_adres, subnet_adressen, poort_open))` aan; elke `Exception` (ook een ontbrekend bestand `warm_vloer.py`, `hap.py` of `hap_crypto.py`) geeft één ERROR-regel met alleen het fouttype en `None`. `main()` roept `start_vloer` aan na het maken van de `Uitlezer` en voor `draai`, en wacht na `draai` hooguit 10 seconden op de draad (`join`). Het gedrag van de energie-uitlezer verandert verder niet.

- [ ] **Step 1: Schrijf de falende tests**

In `nas/test_warm_vloer.py`, met een nep-sessie (klasse met `open`, `haal`, `sluit` die antwoorden uit een lijst geeft of fouten gooit en bijhoudt hoe vaak hij is gemaakt), een instelbare klok en een `verstuur` die opvangt wat er verstuurd wordt:
- `werk_teller_bij`: eerste lezing telt niets; 30 seconden later met vorige `stookt=True` geeft `gezien_s == 30` en `stook_s == 30`; met vorige `stookt=False` blijft `stook_s` 0; een gat van 91 seconden telt niets en van precies 90 wel; een klok die 100 seconden terugspringt verandert de tellers niet en de lezing daarna telt weer gewoon.
- Een ronde met twee thermostaten verstuurt één bericht naar `warm_url` met het geheim en precies de velden uit de berichtvorm, tellers als `int`.
- De ene thermostaat gooit `HapFout`: het bericht bevat alleen de andere; geen uitzondering.
- Beide mislukken: er wordt niets verstuurd.
- Een bestaande sessie die `HapFout` geeft wordt in dezelfde ronde één keer vervangen door een verse en de lezing slaagt (tel het aantal gemaakte sessies).
- De sessie blijft open tussen twee geslaagde rondes (één keer gemaakt, `vind_kenmerken` één keer nodig).
- `verstuur` gooit `OSError`: geen uitzondering uit `ronde`, de tellers zijn bijgewerkt.
- Tellers overleven een herstart: na `bewaar(altijd=True)` begint een nieuwe `VloerLezer` in dezelfde map met dezelfde waarden; het bestand heeft rechten 0600.
- `bewaar()` schrijft niet opnieuw binnen 300 seconden en wel daarna.
- Onleesbaar toestandsbestand: waarschuwing in het logboek en tellers op 0.
- `lees_vloer_instellingen`: geen bestand geeft `None`; geldig voorbeeld geeft bytes van de juiste lengte; elk van deze fouten geeft `ValueError`: geen JSON, `warm_url` met `http://`, lege lijst, 9 thermostaten, dubbele `sleutel`, `sleutel` met een hoofdletter, `accessoire_ltpk` van 62 tekens, `lezer_ltsk` geen hex, ontbrekende `lezer_id`. De tekst van de fout bevat de waarde van `lezer_ltsk` niet.
- `start` zonder `vloer.json` geeft `None` en precies één INFO-regel; met een kapot bestand `None` en één ERROR-regel.
- `start` met een geldig bestand en een nep-sessie: de draad doet minstens één ronde, stopt binnen 2 seconden nadat `stop` gezet is, en heeft de toestand bewaard.
- Meldingen: tien mislukte rondes binnen een minuut geven één waarschuwing per thermostaat; `HapGeweigerd` geeft de tekst over opnieuw koppelen; na herstel één regel `weer bereikbaar`.
- Geheimen: draai rondes met mislukkingen en doorzoek alle logregels op de hex van `lezer_ltsk`, `accessoire_ltpk` en op het geheim: geen treffer.
- `main(["--proef"])` met een nep-sessie (via een parameter of `unittest.mock.patch`) drukt de regel per thermostaat af, verstuurt niets, schrijft geen `vloer_toestand.json`, en geeft 0; met een mislukte thermostaat 1.

In `nas/test_warm_energie.py`:
- `start_vloer` vangt een `ImportError` af (patch `builtins.__import__` of zet een kapotte module in `sys.modules`) en geeft `None` met één ERROR-regel.
- `main()` loopt nog steeds als `start_vloer` `None` geeft, en roept `start_vloer` aan voor `draai` (bestaande tests van `main` blijven slagen).

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `python3 -m unittest discover -s nas -p 'test_warm_*.py'`
Expected: FAIL (module `warm_vloer` bestaat niet, `start_vloer` bestaat niet).

- [ ] **Step 3: Schrijf `nas/warm_vloer.py` en pas `main()` in `nas/warm_energie.py` aan**

`warm_vloer.py` importeert niets uit `warm_energie.py` (dat bestand draait als `__main__`); wat het nodig heeft krijgt het via `start(...)`. Voor `--proef` is niets uit `warm_energie.py` nodig.

- [ ] **Step 4: Draai alle Python-tests op beide Pythons**

Run: `python3 -m unittest discover -s nas -p 'test_*.py'`
Run: `/usr/bin/python3 -m unittest discover -s nas -p 'test_*.py'`
Expected: OK. Meld de duur van de hele reeks.

- [ ] **Step 5: Commit**

```bash
git add nas/warm_vloer.py nas/test_warm_vloer.py nas/warm_energie.py nas/test_warm_energie.py
git commit -m "NAS: thermostaten elke ronde uitlezen, tellers bijhouden en naar Warm sturen"
```

---

### Task 4: Thermostaat terugvinden na een ander adres

**Files:**
- Modify: `nas/warm_vloer.py`, `nas/warm_energie.py` (alleen `poort_open`)
- Test: `nas/test_warm_vloer.py`, `nas/test_warm_energie.py`

**Interfaces:**
- Consumes: `VloerLezer` uit Task 3 (de parameter `zoek` en het argument `netwerk` van `start`); uit `warm_energie.py`: `eigen_adres() -> str`, `subnet_adressen(eigen_adres) -> list` (253 adressen), `poort_open(adres, tijd=0.4) -> bool` (nu vast op poort 443).
- Produces:
  - `poort_open(adres, tijd=0.4, poort=443) -> bool` in `warm_energie.py` (bestaande aanroepen blijven werken)
  - `ZOEK_PAUZE = 600`, `ZOEK_NA_MISLUKT = 3`
  - `maak_zoeker(netwerk, sessie_maker=hap.HapSessie, werkers=16) -> callable`: geeft een functie `zoek(thermostaat) -> str` of `None` die het adres teruggeeft waarop deze thermostaat antwoordt.

**Regels:**
- Een thermostaat wordt gezocht nadat hij `ZOEK_NA_MISLUKT` rondes achter elkaar niet te lezen was (verbinding mislukt of geweigerd), en daarna hooguit eens per `ZOEK_PAUZE` seconden per thermostaat.
- Zoeken: alle adressen van het eigen /24-netwerk waarop de poort van de thermostaat open staat (met `poort_open(adres, poort=...)`, hooguit `werkers` tegelijk), het eigen adres en het laatst bekende adres overslaan is niet nodig. Op elk open adres een voor een `HapSessie(adres, poort, sleutels).open()` proberen, altijd gevolgd door `sluit()`. Het eerste adres waar `open` slaagt is de thermostaat: alleen het apparaat met de juiste sleutel komt door de controle van de handtekening.
- Bij een treffer: het nieuwe adres gebruiken, het bewaren in `vloer_toestand.json` onder de thermostaat als `adres` (en meteen schrijven), en één INFO-regel `Thermostaat <sleutel> gevonden op een nieuw adres.` (het adres zelf mag in de regel staan). Bij het opstarten gaat een bewaard `adres` voor op dat uit `vloer.json`.
- Geen treffer: één waarschuwing `Thermostaat <sleutel> niet gevonden in het netwerk.` en over `ZOEK_PAUZE` seconden opnieuw.
- Een fout in het zoeken zelf (bijvoorbeeld `eigen_adres` gooit `OSError`) wordt gelogd met het fouttype en stopt de ronde niet.
- Zonder `netwerk` (waarde `None`) wordt er nooit gezocht.
- Het zoeken stuurt alleen het verzoek `POST /pair-verify` (dat zit al in de lijst van Task 2). Geen ander verzoek, geen `/pair-setup`.

- [ ] **Step 1: Schrijf de falende tests**

- `poort_open("127.0.0.1", poort=<een luisterende testpoort>)` is `True`, op een dichte poort `False`; de bestaande tests van `poort_open` slagen ongewijzigd.
- `maak_zoeker` met een nep-netwerk (`eigen_adres` geeft `10.0.0.5`, `poort_open` is alleen `True` voor `10.0.0.7` en `10.0.0.9`) en een nep-sessie die alleen op `10.0.0.9` slaagt en op `10.0.0.7` een `HapFout` geeft: resultaat `10.0.0.9`; elke gemaakte sessie is gesloten; `poort_open` kreeg de poort van de thermostaat mee.
- Niemand antwoordt goed: `None`.
- Twee mislukte rondes: er wordt niet gezocht. De derde: wel, precies één keer.
- Na een treffer gebruikt de volgende ronde het nieuwe adres, staat `adres` in `vloer_toestand.json`, en begint een nieuwe `VloerLezer` in dezelfde map op het bewaarde adres.
- Binnen 600 seconden na een zoektocht zonder treffer wordt niet opnieuw gezocht; daarna wel.
- `zoek` gooit `OSError`: `ronde` gooit niet en de andere thermostaat staat in het bericht.
- Met `netwerk=None` wordt er nooit gezocht, ook niet na tien mislukte rondes.

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `python3 -m unittest discover -s nas -p 'test_warm_*.py'`
Expected: FAIL (`maak_zoeker` bestaat niet; `poort_open` kent `poort` niet).

- [ ] **Step 3: Bouw het zoeken**

`start` maakt de zoeker met `maak_zoeker(netwerk)` als `netwerk` is meegegeven en geeft hem aan `VloerLezer`.

- [ ] **Step 4: Draai alle Python-tests op beide Pythons**

Run: `python3 -m unittest discover -s nas -p 'test_*.py'`
Run: `/usr/bin/python3 -m unittest discover -s nas -p 'test_*.py'`
Expected: OK.

- [ ] **Step 5: Commit**

```bash
git add nas/warm_vloer.py nas/test_warm_vloer.py nas/warm_energie.py nas/test_warm_energie.py
git commit -m "NAS: thermostaat terugvinden als hij een ander adres heeft gekregen"
```

---

### Task 5: Database en de twee ingangen

**Files:**
- Create: `supabase/migrations/0012_vloer.sql`, `api/_lib/vloer.js`, `api/vloer/meting.js`, `api/vloer/index.js`
- Modify: `api/_lib/opslag.js`
- Test: `tests/vloer-api.test.js`, `tests/vloer.test.js`

**Interfaces:**
- Consumes: uit `api/_lib/cron.js` `bearerKlopt(req, geheim)`; uit `api/_lib/guard.js` `geenCache(res)`, `requireUser(req, res)`, `FOUT_STORING`; in `opslag.js` de eigen hulpjes `db()`, `check(resultaat, wat)`, `getalOfNull`, `isoOfNull`.
- Produces:
  - `valideerVloerMeting(body) -> { ok: false }` of `{ ok: true, thermostaten: [{ sleutel, gemeten, doel, stookt, stand, gezienS, stookS }] }` (in `api/_lib/vloer.js`)
  - `VERS_MS = 5 * 60 * 1000` en `maakVloerNu(rijen, nu) -> [{ sleutel, naam, gemeten, doel, stookt, stand, bijgewerkt, vers }]` (in `api/_lib/vloer.js`; `nu` is een `Date`)
  - `bewaarVloerMeting(thermostaten) -> number` (aantal bewaarde thermostaten) en `leesVloer() -> [{ sleutel, naam, gemeten, doel, stookt, stand, ontvangenOp }]` op volgorde (in `api/_lib/opslag.js`; velden zonder stand zijn `null`, `ontvangenOp` is een ISO-tekst of `null`)
  - `POST /api/vloer/meting` en `GET /api/vloer`

**Database (`0012_vloer.sql`):**
- `vloer_thermostaten (sleutel text primary key check (sleutel ~ '^[a-z0-9_]{1,32}$'), naam text not null, volgorde smallint not null)` met de rijen `('keuken', 'Keuken', 1)` en `('zitkamer', 'Zitkamer', 2)`.
- `vloer_stand (sleutel text primary key references vloer_thermostaten on delete cascade, ontvangen_op timestamptz not null, gemeten numeric(4,1) not null, doel numeric(4,1) not null, stookt boolean not null, stand smallint, gezien_s bigint not null, stook_s bigint not null)`.
- `vloer_metingen (sleutel text not null references vloer_thermostaten on delete cascade, tijd timestamptz not null, gemeten numeric(4,1) not null, doel numeric(4,1) not null, stookt boolean not null, gezien_s bigint not null, stook_s bigint not null, primary key (sleutel, tijd))`.
- RLS aan op alle drie, geen policies.
- `bewaar_vloermeting(p_thermostaten jsonb) returns integer`, `language plpgsql security invoker set search_path = public`: voor elk element waarvan de `sleutel` in `vloer_thermostaten` staat: de stand vervangen (upsert met `ontvangen_op = now()`), en een momentopname in het vak van 5 minuten (`to_timestamp(floor(extract(epoch from now()) / 300) * 300)`) met `on conflict (sleutel, tijd) do nothing` (de eerste van het vak blijft staan, zoals bij de energiemetingen). Onbekende sleutels worden overgeslagen. Geeft het aantal bewaarde thermostaten. De elementen hebben de veldnamen `sleutel`, `gemeten`, `doel`, `stookt`, `stand`, `gezien_s`, `stook_s`.
- `revoke all on function public.bewaar_vloermeting(jsonb) from public, anon, authenticated;` en `grant execute on function public.bewaar_vloermeting(jsonb) to service_role;`
- Bovenaan een commentaar dat zegt wat de tabellen zijn en dat hier nooit HomeKit-sleutels in komen.

**Regels voor `valideerVloerMeting`:**
- `body` is een object met `thermostaten`: een lijst van 1 tot 8 objecten. Anders `{ ok: false }`.
- Per thermostaat: `sleutel` tekst die past op `^[a-z0-9_]{1,32}$`; `gemeten` eindig getal van -30 tot en met 70; `doel` eindig getal van 0 tot en met 50 (beide afgerond op één decimaal); `stookt` precies `true` of `false`; `stand` ontbreekt, is `null`, of een geheel getal van 0 tot en met 3; `gezien_s` en `stook_s` eindige getallen van 0 tot en met 10000000000 (afgerond naar beneden op een geheel getal).
- Dezelfde `sleutel` twee keer: `{ ok: false }`. Eén ongeldige thermostaat maakt het hele bericht ongeldig.

**Regels voor `maakVloerNu`:**
- Een rij zonder stand: `gemeten`, `doel`, `stookt`, `stand` en `bijgewerkt` zijn `null`, `vers` is `false`.
- Een stand ouder dan `VERS_MS`: `bijgewerkt` blijft staan, `vers` is `false`, en `gemeten`, `doel`, `stookt` en `stand` zijn `null` (een oude temperatuur wordt niet als actueel getoond).
- Anders de waarden en `vers: true`.

**Regels voor de handlers:**
- `POST /api/vloer/meting`: zelfde opbouw als `api/energie/meting.js` (lees dat bestand): `geenCache`, 405 met kop `Allow: POST` voor een andere methode, 401 als `bearerKlopt(req, process.env.ENERGIE_GEHEIM)` niet klopt, 413 boven 4096 bytes `content-length`, 400 bij een ongeldig bericht, 500 als bewaren mislukt. Antwoorden `{ ok: false }` of `{ ok: true, bewaard: <aantal> }`. Een geldig bericht met alleen onbekende thermostaten geeft 200 met `bewaard: 0`.
- `GET /api/vloer`: `geenCache`, `requireUser` (iedereen die is ingelogd), 405 met `{ error: 'Methode niet toegestaan' }` voor een andere methode, 500 met `{ error: FOUT_STORING }` bij een storing. Antwoord: `{ thermostaten: maakVloerNu(await leesVloer(), new Date()) }`.

- [ ] **Step 1: Schrijf de falende tests**

`tests/vloer.test.js` (pure functies):
- Het voorbeeld uit de berichtvorm is geldig en geeft `{ sleutel: 'keuken', gemeten: 20, doel: 20.5, stookt: true, stand: 1, gezienS: 86400, stookS: 5400 }`.
- `gemeten: 20.04` wordt 20; `gezien_s: 12.9` wordt 12; `stand` weggelaten wordt `null`.
- Ongeldig (elk een eigen geval, bij voorkeur `it.each`): geen object, `thermostaten` geen lijst, lege lijst, 9 stuks, `sleutel` `'Keuken'`, `sleutel` ontbreekt, `gemeten` als tekst `'20'`, `gemeten` 71, `gemeten` `NaN`, `doel` -1, `stookt` als 1, `stookt` als `'true'`, `stand` 4, `stand` 1.5, `gezien_s` -1, `stook_s` ontbreekt, twee keer `keuken`, een geldige plus een ongeldige thermostaat.
- `maakVloerNu`: zonder stand; met een stand van 4 minuten oud (waarden en `vers: true`); met een stand van 6 minuten oud (waarden `null`, `bijgewerkt` gevuld, `vers: false`); de volgorde van de invoer blijft behouden.

`tests/vloer-api.test.js` (volg het patroon van `tests/energie-api.test.js`: alleen `opslag.js` gemockt, de echte guard, `fakeRes()`, handlers dynamisch geïmporteerd):
- POST zonder kop, met een verkeerd geheim en met een leeg `ENERGIE_GEHEIM` in de omgeving: 401 en `bewaarVloerMeting` is niet aangeroepen.
- GET op de meetingang: 405 met `Allow: POST`.
- `content-length` 5000: 413.
- Ongeldig bericht: 400, niets bewaard.
- Geldig bericht: 200 `{ ok: true, bewaard: 2 }` en `bewaarVloerMeting` kreeg de gevalideerde lijst.
- `bewaarVloerMeting` gooit: 500 `{ ok: false }`, en de foutmelding in het antwoord bevat het geheim niet.
- GET `/api/vloer` zonder cookie: 401. Met een ingelogd toestel: 200 met `thermostaten` in de vorm van `maakVloerNu`. POST: 405. `leesVloer` gooit: 500 met `FOUT_STORING`.
- Elk antwoord heeft de kop die `geenCache` zet.

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `npx vitest run tests/vloer.test.js tests/vloer-api.test.js --maxWorkers=3`
Expected: FAIL (de modules bestaan niet).

- [ ] **Step 3: Schrijf de migratie, `api/_lib/vloer.js`, de twee functies in `opslag.js` en de twee handlers**

`bewaarVloerMeting` roept `db().rpc('bewaar_vloermeting', { p_thermostaten: [...] })` aan met de veldnamen uit de database (`gezien_s`, `stook_s`) en geeft het getal terug. `leesVloer` haalt `vloer_thermostaten` (op `volgorde`) en `vloer_stand` op en voegt ze samen; `numeric`-kolommen komen als tekst binnen, dus via `getalOfNull`.

- [ ] **Step 4: Draai de hele testreeks**

Run: `npx vitest run --maxWorkers=3`
Expected: alles slaagt, ook `tests/laden.test.js` (die laadt de nieuwe handlers zonder omgevingsvariabelen).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0012_vloer.sql api/_lib/vloer.js api/_lib/opslag.js api/vloer tests/vloer.test.js tests/vloer-api.test.js
git commit -m "Vloerverwarming: tabellen, ingang voor de NAS en de stand voor de app"
```

---

### Task 6: De regel Beneden en het scherm Vloerverwarming

**Files:**
- Create: `src/components/Beneden.jsx`, `src/components/Vloer.jsx`, `src/lib/vloer.js`
- Modify: `src/components/RoomList.jsx`, `src/App.jsx`, `src/index.css`, en waar nodig `tests/roomlist.test.jsx` en `tests/app.test.jsx`
- Test: `tests/beneden.test.jsx`, `tests/vloer-scherm.test.jsx`, `tests/vloer-lib.test.js`

**Interfaces:**
- Consumes: `GET /api/vloer` geeft `{ thermostaten: [{ sleutel, naam, gemeten, doel, stookt, stand, bijgewerkt, vers }] }` (waarden `null` als er geen verse stand is; `bijgewerkt` een ISO-tekst of `null`). `apiFetch` uit `src/lib/apiFetch.js`; `formatTemp` uit `src/components/TempPaneel.jsx` (20 wordt `20°`, 20.5 wordt `20,5°`); `tijdTekst(iso)` uit `src/lib/energie.js`; `IconTerug` uit `src/components/Iconen.jsx`.
- Produces:
  - `Beneden({ ververs, onOpen, onStap })`: `ververs` is een getal; als het verandert haalt de regel opnieuw op.
  - `Vloer({ onTerug, onStap })`
  - In `src/lib/vloer.js`: `toestandTekst(thermostaat) -> string` en `heeftGegevens(thermostaten) -> boolean`
  - In `App.jsx` de schermnaam `'vloer'`; `RoomList` krijgt de prop `onVloer`.

**Exacte teksten:**
- Regel op het hoofdscherm: het woord `Beneden`, daarna per thermostaat de naam en de temperatuur (`Keuken 20°`). Zonder verse stand staat er `-` in plaats van de temperatuur. Stookt hij, dan een stipje met de verborgen tekst `stookt` (voor schermlezers; gebruik een bestaande klasse voor verborgen tekst of maak `.alleen-schermlezer`).
- De hele regel is één knop met `aria-label` `Vloerverwarming beneden openen`.
- Scherm: kop `Vloerverwarming`, knop `Terug` zoals in `Energie.jsx`, onderdeel met de kop `Nu`.
- Per thermostaat een vakje: naam, groot de gemeten temperatuur, daaronder `ingesteld op 20° · stookt`. Het laatste deel komt uit `toestandTekst`: `stookt` als `stookt` waar is, anders `staat uit` als `stand === 0`, anders `in rust`.
- Zonder verse stand maar met `bijgewerkt`: in het vakje `-` als temperatuur en de tekst `Geen gegevens sinds <tijdTekst(bijgewerkt)>.`
- Nog nooit iets ontvangen (`bijgewerkt === null` bij alle): in plaats van de vakjes één regel `Nog geen gegevens ontvangen.`
- Laden mislukt: de melding en de knop `Opnieuw proberen` zoals `Energie.jsx` die heeft (zelfde klassen en opbouw).
- Onder de vakjes, gedempt: `Alleen kijken. Instellen doe je op de thermostaat of in de Resideo-app.`

**Regels:**
- `heeftGegevens(thermostaten)` is waar als minstens één thermostaat een `bijgewerkt` heeft. Is het onwaar, of mislukt het ophalen, of is het antwoord geen lijst: `Beneden` toont niets (geen lege regel, geen foutmelding op het hoofdscherm).
- `Beneden` haalt op bij het verschijnen, als `ververs` verandert, en als het scherm weer zichtbaar wordt (`visibilitychange`). Geen eigen interval. Een 401 met een `stap` roept `onStap(stap)` aan (zelfde afhandeling als elders; kijk hoe `Energie.jsx` dat doet). Een antwoord dat binnenkomt nadat het onderdeel is verdwenen wordt genegeerd.
- `RoomList` toont `<Beneden>` als laatste `<li>` in `ul.room-list`, na de kamers, en geeft een teller door die ophoogt bij de knop Vernieuwen (en bij elke andere plek waar `RoomList` zelf opnieuw laadt). De bestaande aanvragen van `RoomList` veranderen niet.
- `Vloer` ververst elke 30 seconden zolang het scherm zichtbaar is, en bij `visibilitychange`; een oudere aanvraag mag een nieuwere niet overschrijven; time-out 15 seconden (zelfde aanpak als `Energie.jsx`).
- Het hoofdscherm moet op één telefoonscherm blijven passen: de regel is één regel hoog (geen omloop bij 360 px breed; kort desnoods de tussenruimte in, niet de tekst).
- Kleuren: geen lichte of pastelkleurige tekst op een lichte achtergrond. Het stipje krijgt als achtergrond `var(--energie-import)`; tekst gebruikt de bestaande tekstkleuren. Het moet er goed uitzien in licht en donker (de variabelen hebben al beide waarden).
- Hergebruik bestaande klassen waar het kan (`room-card`, `energie-raster`, `energie-vakje`, `energie-gedempt`, `energie-kop`, `icoon-knop`); nieuwe klassen beginnen met `beneden-` of `vloer-`.
- De testhulpen in `tests/roomlist.test.jsx` (`mockApi`) en `tests/app.test.jsx` (`mockIk`) gooien bij een onbekend pad. Geef ze een tak voor `/api/vloer` die standaard `{ thermostaten: [] }` teruggeeft, en pas tellingen van `apiFetch`-aanroepen aan zodat ze alleen de aanvragen tellen waar de test over gaat (filter op pad). Verander verder niets aan wat die tests beweren.

- [ ] **Step 1: Schrijf de falende tests**

`tests/vloer-lib.test.js`: `toestandTekst` voor stookt, in rust, staat uit (stand 0 en `stookt` onwaar), en `stookt` waar met stand 0 geeft `stookt`; `heeftGegevens` voor een lege lijst, alleen `null`, en één gevulde.

`tests/beneden.test.jsx` (jsdom, `apiFetch` gemockt zoals in `tests/energie-scherm.test.jsx`):
- Twee verse thermostaten, Keuken stookt: de tekst `Beneden`, `Keuken`, `20°`, `Zitkamer`, `20,5°`, precies één element met de verborgen tekst `stookt`, en een knop met de naam `Vloerverwarming beneden openen`.
- Een klik roept `onOpen` aan.
- Eén thermostaat zonder verse stand maar met `bijgewerkt`: `-` bij die thermostaat, de regel staat er.
- Alles `bijgewerkt: null`: het onderdeel toont niets (`container` is leeg).
- Antwoord 500, een afgewezen aanvraag en een antwoord zonder lijst: het onderdeel toont niets en gooit niet.
- 401 met `{ stap: 'persoon' }` roept `onStap('persoon')` aan.
- `ververs` van 0 naar 1: er is een tweede aanvraag naar `/api/vloer`.

`tests/vloer-scherm.test.jsx`:
- Vers en stokend: kop `Vloerverwarming`, `Nu`, per thermostaat naam en temperatuur, `ingesteld op 20° · stookt` en `ingesteld op 19,5° · in rust`.
- Stand 0: `ingesteld op 5° · staat uit`.
- Verouderd: `Geen gegevens sinds 14:05.` (zet de tijd vast op een ISO-tijd die in Amsterdam 14:05 is) en `-` als temperatuur.
- Nooit ontvangen: `Nog geen gegevens ontvangen.`
- Fout bij laden: de melding met `Opnieuw proberen`; een klik haalt opnieuw op en toont daarna de gegevens.
- `Terug` roept `onTerug` aan.
- Na 30 seconden (nep-timers) is er een tweede aanvraag.
- De tekst `Alleen kijken. Instellen doe je op de thermostaat of in de Resideo-app.` staat er.
- Het scherm bevat geen `input`, geen schuif (`role="slider"`) en geen knop behalve `Terug` (en `Opnieuw proberen` bij een fout).

In `tests/roomlist.test.jsx`: één test erbij dat de regel Beneden na de kamers staat als `/api/vloer` gegevens geeft, en dat de knop Vernieuwen ook `/api/vloer` opnieuw ophaalt. In `tests/app.test.jsx`: één test dat een klik op de regel het scherm Vloerverwarming opent en `Terug` weer naar de kamers gaat.

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `npx vitest run tests/vloer-lib.test.js tests/beneden.test.jsx tests/vloer-scherm.test.jsx --maxWorkers=3`
Expected: FAIL (de bestanden bestaan niet).

- [ ] **Step 3: Bouw de regel, het scherm en de aansluiting in `RoomList.jsx` en `App.jsx`**

- [ ] **Step 4: Draai de hele testreeks en de build**

Run: `npx vitest run --maxWorkers=3`
Run: `npx vite build --outDir "dist_v$(date +%s)"` en daarna `rm -rf dist_v*`
Expected: alle tests slagen; de build eindigt met `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "Vloerverwarming: regel Beneden op het hoofdscherm en het scherm met de stand van nu"
```

---

### Task 7: Het NAS-pakket neemt de thermostaten mee

**Files:**
- Modify: `scripts/maak-nas-pakket.mjs`, `nas/LEESMIJ.txt`, `tests/nas-script.test.js`

**Interfaces:**
- Consumes: de vorm van `vloer.json` uit Global Constraints; `lees_vloer_instellingen` uit Task 3 leest dat bestand op de NAS.
- Produces: `maakPakket({ root, zonderVercel, schrijf, vercelStap, koppelingPad })`; het resultaat krijgt er het veld `thermostaten` bij (aantal, 0 als er geen koppeling is).

**Regels:**
- `BESTANDEN` wordt `['warm_energie.py', 'warm_vloer.py', 'hap.py', 'hap_crypto.py', 'homewizard-ca.pem', 'LEESMIJ.txt']`. Geen testbestanden en niets uit `nas/dev/` in het pakket.
- `koppelingPad` is standaard `<root>/.superpowers/proef-homekit/koppeling.json`. Dat bestand is een object `{ "<alias>": { "AccessoryPairingID", "AccessoryLTPK", "iOSPairingId", "iOSDeviceLTSK", "AccessoryIP", "AccessoryPort", ... } }`.
- Vaste koppeling van alias naar thermostaat: `const VLOER_NAMEN = { vloer: 'keuken', vloer2: 'zitkamer' }`. Een alias die daar niet in staat wordt overgeslagen met een waarschuwing die alleen de alias noemt.
- Per thermostaat gaan alleen deze velden mee: `sleutel`, `adres` (`AccessoryIP`), `poort` (`AccessoryPort`, standaard 80), `accessoire_id`, `accessoire_ltpk`, `lezer_id`, `lezer_ltsk`. Niets anders uit de koppeling.
- `vloer.json` wordt atomair geschreven met rechten 0600, met `warm_url` `'https://warm-app-flax.vercel.app/api/vloer/meting'`, op volgorde keuken, zitkamer.
- Bestaat de koppeling niet: geen `vloer.json`, het pakket wordt verder gewoon gemaakt, en er komt één regel `Geen HomeKit-koppeling gevonden: het pakket leest de thermostaten niet uit.`
- Is de koppeling geen geldige JSON, of mist een thermostaat een van de vier sleutelvelden, of is `AccessoryLTPK` of `iOSDeviceLTSK` geen hex van 64 tekens: geen `vloer.json`, een waarschuwing die het veld noemt (nooit de waarde), en `process.exitCode = 1` zoals bij de mislukte Vercel-stap.
- De uitvoer noemt alleen het aantal thermostaten en hun namen (`keuken, zitkamer`). Nooit een sleutel, id of deel daarvan.
- `nas/LEESMIJ.txt` krijgt een korte alinea in gewone taal: het pakket leest nu ook de twee thermostaten uit, alleen lezen; `vloer.json` bevat de sleutels en hoort alleen op de NAS; controleren kan met `python3 warm_vloer.py --proef`; na "Reset HomeKit" op een thermostaat moet er opnieuw gekoppeld worden op de Mac en een nieuw pakket gemaakt.

- [ ] **Step 1: Pas de tests aan en schrijf de nieuwe**

In `tests/nas-script.test.js`:
- De exacte lijst van het pakket wordt, zonder koppeling: `['LEESMIJ.txt', 'hap.py', 'hap_crypto.py', 'homewizard-ca.pem', 'instellingen.json', 'warm_energie.py', 'warm_vloer.py']`; met koppeling komt `vloer.json` erbij.
- Met een nagemaakte koppeling (twee aliassen `vloer` en `vloer2`, verzonnen waarden van de juiste lengte, plus een extra veld `iOSDeviceLTPK`): `vloer.json` heeft rechten 0600, de `warm_url` van de vloer-ingang, twee thermostaten op volgorde keuken, zitkamer met precies de zeven velden, en bevat de waarde van `iOSDeviceLTPK` niet.
- De opgevangen uitvoer (`schrijf`) bevat geen van de verzonnen sleutels of id's, wel `keuken, zitkamer`.
- Een onbekende alias `vloer3` wordt overgeslagen met een waarschuwing.
- Koppeling met een `AccessoryLTPK` van 10 tekens: geen `vloer.json`, waarschuwing noemt `AccessoryLTPK`, `process.exitCode` is 1 (zet het na de test terug).
- Koppeling is geen JSON: geen `vloer.json`, het pakket bevat de andere bestanden wel.
- `instellingen.json` is ongewijzigd ten opzichte van nu (de bestaande beweringen over `apparaten` blijven staan).
- Het gemaakte `vloer.json` wordt geaccepteerd door de NAS-code: draai `python3 -c "import sys, json; sys.path.insert(0, 'nas'); import warm_vloer; r = warm_vloer.lees_vloer_instellingen(sys.argv[1]); print(len(r['thermostaten']))" <pad>` vanuit de repo en verwacht `2` (overslaan als `python3` ontbreekt, zoals de bestaande test).

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `npx vitest run tests/nas-script.test.js --maxWorkers=3`
Expected: FAIL (lijst van het pakket klopt niet, `vloer.json` wordt niet gemaakt).

- [ ] **Step 3: Pas `scripts/maak-nas-pakket.mjs` en `nas/LEESMIJ.txt` aan**

- [ ] **Step 4: Draai de hele testreeks**

Run: `npx vitest run --maxWorkers=3`
Expected: alles slaagt.

- [ ] **Step 5: Commit**

```bash
git add scripts/maak-nas-pakket.mjs nas/LEESMIJ.txt tests/nas-script.test.js
git commit -m "NAS-pakket: de thermostaten en hun koppeling gaan mee"
```

---

## Na de taken (door de opdrachtgever, niet door een uitvoerder)

1. Migratie `0012_vloer.sql` toepassen op het Supabase-project en de tabellen controleren.
2. Pushen naar `main` en de deploy controleren.
3. Het pakket maken en `python3 nas-pakket/warm_vloer.py --proef` op de Mac draaien tegen de echte thermostaten (alleen lezen).
4. Olivier zet het pakket op de NAS; daarna in de database controleren of er rijen binnenkomen, of `stookt` omslaat en of de tellers oplopen.
