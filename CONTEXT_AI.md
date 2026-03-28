# YumboSQL – AI Kontextus fájl

> Ez a fájl az AI asszisztens számára készült, hogy egy új beszélgetésben gyorsan folytathassa a munkát.  
> Utolsó frissítés: 2026. március 28.

---

## Projekt összefoglaló

**YumboSQL** egy natív macOS asztali PostgreSQL adminisztrációs eszköz (mint egy könnyű pgAdmin).  
Verzió: **0.1.0**

---

## Technológiai stack

| Réteg | Technológia |
|---|---|
| Desktop shell | Electron 33 |
| UI | React 19 + Vite 6.4 |
| SQL editor | CodeMirror 6 (PostgreSQL dialect, oneDark) |
| DB driver | pg 8.13 (Pool, max 5) |
| Jelszókezelés | keytar 7.9 (macOS Keychain) |
| Build | electron-builder 25 → DMG (arm64 + x64) |

---

## Projektstruktúra

```
YumboSQL/
├── package.json            # Root: electron, pg, keytar, electron-builder config
├── start.sh                # Dev indító script (NoLogo, DEVCONSOLE paraméterek)
├── PLAN.md                 # Részletes tervezési terv (fázisok, checklist)
├── TODO.md                 # Feladatlista fázisonként
├── USERGUIDE.md            # Felhasználói kézikönyv (magyar)
├── CONTEXT_AI.md           # ← Ez a fájl
├── logo_transparent.png    # App logó (dock ikon, splash, sidebar)
├── build/icon.icns         # macOS app ikon
├── release/                # Build output (DMG-k, .app)
└── src/
    ├── main/
    │   ├── main.js         # Electron main process + IPC handlerek
    │   ├── preload.js      # contextBridge → window.yumbosql API (~28 metódus)
    │   └── services/
    │       ├── database.js  # pg.Pool wrapper, összes DB lekérdezés
    │       └── keychain.js  # keytar macOS Keychain wrapper
    └── renderer/
        ├── package.json     # React, Vite, CodeMirror függőségek
        ├── vite.config.js   # base: './', port 3000
        ├── public/          # logo.png, logo_transparent.png (Vite másolja dist/-be)
        └── src/
            ├── App.jsx              # Fő app logika, tab kezelés, kapcsolat állapot
            ├── main.jsx             # React entry point
            ├── i18n/
            │   ├── I18nContext.jsx   # React i18n kontextus (magyar/angol)
            │   └── labels.json      # Fordítási kulcsok
            ├── components/
            │   ├── ConnectionDialog.jsx  # Bejelentkezés, connection history
            │   ├── SplashScreen.jsx      # Splash screen logóval
            │   ├── Titlebar.jsx          # macOS titlebar (kapcsolat info)
            │   ├── Sidebar.jsx           # Object Explorer (fa, helyi menük, SQL generátor)
            │   ├── MainPanel.jsx         # Multi-tab panel (SQL Editor, TableView, StructureView, ScriptView, NewRecordView, EditRecordView)
            │   ├── SqlEditor.jsx         # CodeMirror 6 wrapper (Cmd+Enter, Cmd+S)
            │   ├── DataGrid.jsx          # Táblázat (sticky header, NULL, JSON, lapozás)
            │   └── HelpModal.jsx         # Súgó ablak
            └── styles/
                ├── global.css            # CSS változók (dark theme)
                └── App.css
```

---

## Kész funkciók (Fázis 1 – MVP)

### Kapcsolatkezelés
- Kapcsolati profil (host, port, user, password, db, SSL)
- Kapcsolat tesztelése, Keychain jelszókezelés
- Kapcsolat-előzmények (JSON, max 20), törlés
- Több egyidejű kapcsolat (multi-host Object Explorer)
- Titlebar-ban kapcsolati info

### Object Explorer (Sidebar)
- Fa struktúra: Hosts → Databases → Schemas → objektumtípusok (lazy loading)
- Táblák, nézetek, materializált nézetek, függvények, szekvenciák, típusok
- Tábla al-objektumok: oszlopok, indexek, constraintek, triggerek
- Roles, Extensions
- Jobb-klikk helyi menük (Adatok listája, Táblaszerkezet, Új rekord, SQL almenü, Frissítés)
- SQL almenü: SELECT, INSERT, UPDATE, ALTER, CREATE sablonok
- **CREATE script**: teljes tábla-objektum összegyűjtés (sequences, constraints, indexes, triggers) → `getCompleteCreateScript` backend metódus
- CREATE sablonok minden típusra (10 db)
- Dupla-klikk al-objektumra → ALTER script
- Átméretezhető sidebar (180–600px)
- Sidebar tagline: "PostgreSQL Admin and SQL developer tool"

### SQL Editor & Multi-tab
- CodeMirror 6 (PostgreSQL, oneDark, Cmd+Enter, Cmd+S)
- Multi-tab rendszer: editor, table, structure, script, newrecord, editrecord
- Tab állapot megőrzése (display:none)
- **Húzható vízszintes elválasztó** minden editor fülön (`useSplitPane` hook a MainPanel.jsx tetején)
- **Görgethető lapfül sáv** ← › nyilakkal (auto-scroll aktív fülre)
- SQL mentése fájlba (natív dialógus)

### Data Grid
- Lapozható táblázat (limit/offset)
- Sticky fejléc, sorszám, NULL jelölés, JSON formázás
- Új rekord felvitele (NewRecordView – típusos inputok, auto-fill badge)
- Rekord szerkesztése (EditRecordView – dupla kattintás sorra, PK alapú UPDATE)

### UI/UX
- Dark Mode (#0d1117 bg, #58a6ff accent, CSS variables)
- macOS hiddenInset titlebar
- Splash screen (logóval, kihagyható `NoLogo` paraméterrel)
- macOS dock ikon (`logo_transparent.png` via `extraResources`)
- i18n (magyar/angol)

---

## Fontos technikai részletek

### Indítás fejlesztői módban
```bash
bash start.sh              # normál
bash start.sh NoLogo       # splash kihagyása
bash start.sh DEVCONSOLE   # DevTools megnyitása (csak a főképernyőn, splash után)
```

### Build
```bash
npm run build              # renderer build + electron-builder → release/
```
- DMG kimenetek: `release/YumboSQL-0.1.0-arm64.dmg`, `release/YumboSQL-0.1.0.dmg`
- x64 DMG build néha `/Volumes/YumboSQL` permission error-t dob macOS-en (arm64 gépen)

### Verziószám
- Gyökér `package.json` (`"version": "0.1.0"`) – ez a fő, az electron-builder ezt használja
- `src/renderer/package.json` is tartalmazza – szinkronban kell tartani

### IPC architektúra
- `contextIsolation: true`, `nodeIntegration: false`
- `preload.js` expozálja a `window.yumbosql` API-t (~28 metódus)
- Minden IPC handler a `main.js`-ben, a DB logika `services/database.js`-ben

### Logó kezelése
- `logo_transparent.png` a gyökérben – az `extraResources`-ban van konfigurálva, NEM az `files`-ban (natív API-k nem tudnak asar-ból olvasni)
- A renderer oldali logó a `src/renderer/public/logo_transparent.png`-ből jön (Vite másolja → `dist/`)
- Dock ikon: `process.resourcesPath` (prod) / relatív path (dev) – `main.js` 43-49. sor

### useSplitPane hook
- A `MainPanel.jsx` tetején definiált egyedi hook
- Minden editor típusú komponens (SQL Editor panel, StructureView, ScriptView) saját példányt használ
- Fraction: 0.1–0.85 tartomány, alapértelmezés: 0.4

---

## Nyitott feladatok (következő lépések)

A teljes lista a `TODO.md`-ben és `PLAN.md`-ben van. Prioritásos elemek:

1. **Autocomplete** – táblák, oszlopok, PostgreSQL kulcsszavak
2. **Sor törlése (DELETE)** – megerősítési dialógussal
3. **Oszlop szűrés és rendezés** a Data Gridben
4. **Exportálás** – CSV, JSON
5. **EXPLAIN / EXPLAIN ANALYZE** megjelenítés
6. **Light Mode** támogatás
7. **SSH tunnel** konfiguráció
8. **Monitoring dashboard** (pg_stat_activity)

---

## Ismert problémák / figyelmeztetések

- x64 DMG build arm64 macOS-en néha `permission denied` hibát dob (`/Volumes/YumboSQL`)
- Code signing nincs konfigurálva (skipped macOS application code signing)
- `ScriptView`-nak közvetlenül kell `useI18n()` hookot hívnia (korábbi bug javítva)
- Preload változtatás után az Electron-t újra kell indítani (Vite HMR nem tölti újra)
