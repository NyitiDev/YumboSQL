# YumboSQL – TODO lista

> A feladatok a [PLAN.md](PLAN.md) alapján kerültek összeállításra, fejlesztési fázisonként csoportosítva.
> Állapotok: `[ ]` = nyitott · `[~]` = folyamatban · `[x]` = kész

---

## Fázis 0 – Projekt előkészítés ✅

- [x] Technológiai stack véglegesítése → Electron + React + Vite + pg
- [x] Alapvető projekt struktúra felállítása (könyvtárszerkezet, modulok)
- [x] Függőségkezelő beállítása (npm)
- [ ] GitHub repository létrehozása
- [ ] Branch stratégia meghatározása (pl. `main`, `dev`, feature branchek)
- [ ] CI/CD pipeline beállítása (GitHub Actions)
- [ ] Coding style guide és linter konfiguráció (ESLint)


## Fázis 1 – MVP

### Kapcsolatkezelés ✅
- [x] Kapcsolati profil adatmodell definiálása (host, port, user, db, SSL)
- [x] Kapcsolatlétrehozó diálógusablak UI
- [x] PostgreSQL driver integrálása (pg.Pool, max: 5)
- [x] Kapcsolat tesztelése gomb és visszajelzés
- [x] SSL konfiguráció támogatása (checkbox)
- [x] Jelszavak tárolása macOS Keychain-ben (keytar)
- [x] Kapcsolat-előzmények mentése és betöltése (JSON, max 20)
- [x] Korábbi kapcsolatok listája a bejelentkező ablakban
- [x] Kapcsolati előzmény törlése (egyenként)
- [x] Kapcsolati információ a címsortban (user@host:port/database)
- [x] Új kapcsolat gomb / Lekapcsolás gomb a címsorban
- [ ] Kapcsolati profilok szerkesztése
- [ ] Kapcsolati profilok mentése (SQLite helyi adatbázis)

### Object Explorer ✅
- [x] Sidebar fa-struktúra UI komponens (lazy loading, TreeNode + LazyGroup)
- [x] Adatbázis szint: sémák listázása (`information_schema.schemata`)
- [x] Séma szint: táblák listázása (`information_schema.tables`)
- [x] Séma szint: nézetek listázása
- [x] Séma szint: materializált nézetek listázása
- [x] Séma szint: függvények / tárolt eljárások (argumentumok, return type)
- [x] Séma szint: szekvenciák listázása
- [x] Séma szint: típusok és enum-ok (kind badge)
- [x] Tábla szint: oszlopok (típus, NOT NULL badge)
- [x] Tábla szint: indexek (PK/UQ badge, definition tooltip)
- [x] Tábla szint: constraintek (típus badge, definition tooltip)
- [x] Tábla szint: triggerek (timing badge)
- [x] Top-level: Roles (superuser badge, can_login ikon)
- [x] Top-level: Extensions (verzió badge)
- [x] Lazy loading a fa csomópontokhoz
- [x] Frissítés gomb (globális ↑ gomb a sidebar fejlécben)
- [x] Átméretezhető sidebar (drag handle, min 180px, max 600px)
- [x] Jobb-klikk helyi menü táblákra (Adatok listája, Táblaszerkezet, SQL almenü, Frissítés)
- [x] SQL almenü: SELECT, INSERT, UPDATE, ALTER, CREATE sablonok
- [x] SQL sablonok idézőjelezett oszlopnevekkel (PostgreSQL kompatibilis)
- [x] Séma-szintű objektumcsoport helyi menü (Létrehozás + Frissítés)
- [x] Tábla al-objektum csoport helyi menü (Létrehozás + Frissítés) – oszlopok, indexek, constraintek, triggerek
- [x] Dupla-kattintás al-objektumokra → ALTER script új lapfülön (oszlop/index/constraint/trigger)
- [x] CREATE sablonok minden típusra: TABLE, VIEW, MATVIEW, FUNCTION, SEQUENCE, TYPE, INDEX, COLUMN, CONSTRAINT, TRIGGER

### SQL Editor ✅ (alapok + bővítések)
- [x] Szövegszerkesztő komponens integrálása (CodeMirror 6)
- [x] PostgreSQL szintaxis kiemelés (oneDark téma)
- [x] Lekérdezés futtatása (Cmd+Enter)
- [x] Eredmény megjelenítése táblázatban
- [x] Hibaüzenet megjelenítése végrehajtási hiba esetén
- [x] Végrehajtási idő mérése
- [x] Több lekérdezési lap (multi-tab rendszer: editor, table, structure, script)
- [x] SQL mentése fájlba (Cmd+S, natív fájlmentő dialógus)
- [x] Tab állapot megőrzése (display:none – CodeMirror nem veszíti el tartalmát)
- [x] Tab címkék: típus + séma.tábla + fúnkciónév (pl. "📝 public.USER INSERT")
- [x] Tab deduplikáció: table és structure tabok újrafelhasználása, script tabok mindig újak
- [x] Aktív sor kiemelése, kék kurzor, code folding, selection highlighting

### Data Grid ✅ (csak olvasható)
- [x] Lapozható táblázat UI komponens (limit/offset)
- [x] Oszlopfejlécek automatikus generálása (sticky header)
- [x] NULL értékek vizuális jelölése
- [x] JSON mezők formázott megjelenítése
- [x] Sorszámozás
- [ ] Alap sor- és oszloprendezés

### Alapvető DDL ✅
- [x] SQL futtatása az editoron keresztül (CREATE TABLE, DROP TABLE, stb.)
- [x] Táblaszerkezet (DDL) megtekintése új lapfülön (ALTER sablonokkal)
- [x] ALTER script generálás: oszlopök, indexek, constraintek, triggerek
- [x] Generált script megnyitása szerkeszthető lapfülön
- [ ] Tábla törlése (DROP TABLE) – megerősítési dialógussal
- [ ] Nézet létrehozása (CREATE VIEW) – GUI

---

## Fázis 2 – Core Features

### SQL Editor (bővítés)
- [x] Több lekérdezési lap (multi-tab: editor, table, structure, script) ← Fázis 1-ben kész
- [x] SQL fájlba mentése (Cmd+S, natív dialógus) ← Fázis 1-ben kész
- [ ] Autocomplete – táblák és oszlopok (`information_schema` alapján)
- [ ] Autocomplete – PostgreSQL kulcsszavak és függvények
- [ ] EXPLAIN / EXPLAIN ANALYZE eredmény megjelenítése
- [ ] Vizuális lekérdezési terv (explain fa vagy Mermaid diagram)
- [ ] Lekérdezés-előzmény (history) panel
- [ ] Snippet könyvtár – mentés, keresés, betöltés
- [ ] Hibakiemelés inline (hibás sor jelölése)
- [ ] Billentyűkombinációk: Cmd+/ (komment), Cmd+Shift+F (formázás)

### Data Grid (szerkesztés)
- [ ] Cella inline szerkesztése
- [ ] Módosítás mentése (UPDATE) – megerősítéssel
- [ ] Új sor hozzáadása (INSERT)
- [ ] Sor törlése (DELETE) – megerősítéssel
- [ ] Oszlop alapú szűrés
- [ ] Exportálás CSV-be
- [ ] Exportálás JSON-be
- [ ] JSON / XML mezők speciális megjelenítője

### Séma szerkesztő GUI
- [ ] Tábla szerkesztő dialógus – oszlopok, típusok, alapértelmezett értékek
- [ ] Primary key beállítás GUI-n
- [ ] Foreign key kezelés (hozzáadás, törlés)
- [ ] Unique és Check constraint kezelés
- [ ] Index létrehozása / törlése GUI-n
- [ ] Séma átnevezés / áthelyezés

### Import / Export
- [ ] Tábla exportálása SQL dump formátumban (`pg_dump` integráció)
- [ ] `pg_restore` integráció
- [ ] CSV importálása táblába
- [ ] JSON importálása táblába
- [ ] COPY parancs GUI wrapper

---

## Fázis 3 – Advanced Features

### Object Explorer (bővítés) ✅ – Áthelyezve Fázis 1-be
- [x] Indexek listázása és megjelenítése
- [x] Constraints és triggerek megjelenítése
- [x] Szekvenciák (SEQUENCE) kezelése
- [x] Egyedi típusok és enum-ok listázása
- [x] Funkciók és tárolt eljárások listázása
- [x] Role-ok és jogosultságok megjelenítése
- [x] Helyi menük (tábla, csoport, al-objektum szinten)
- [x] CREATE sablonok (10 objektumtípus)
- [x] ALTER scriptek dupla-kattintásra

### Felhasználó- és jogosultságkezelés
- [ ] Role-ok listázása (`pg_roles`)
- [ ] Role létrehozása és törlése
- [ ] GRANT / REVOKE műveletek grafikus felületen
- [ ] Jelszó módosítás UI
- [ ] Séma- és tábla-szintű jogosultságok vizualizálása

### Monitoring dashboard
- [ ] Aktív kapcsolatok panel (`pg_stat_activity`)
- [ ] Futó lekérdezések listája
- [ ] Lekérdezés leállítása (`pg_terminate_backend`) – megerősítéssel
- [ ] Lock-ok listázása és vizualizálása
- [ ] Tábla- és index-statisztikák (`pg_stat_user_tables`)
- [ ] Adatbázis és tábla méret kijelzése
- [ ] Alap teljesítmény-metrikák dashboard (cache hit ratio, seq scan stb.)

### SSH tunnel
- [ ] SSH tunnel konfiguráció UI (host, port, user, kulcsfájl)
- [ ] SSH kulcs kezelése (Keychain integráció)
- [ ] Automatikus tunnel újracsatlakozás
- [ ] Tunnel állapot jelzése a UI-ban

### Haladó szerkesztők
- [ ] Függvény / tárolt eljárás szerkesztő (PL/pgSQL szintaxis kiemelés)
- [ ] Trigger szerkesztő
- [ ] Materializált nézet kezelése (REFRESH gombbal)
- [ ] Szekvencia szerkesztő (start, increment, min, max)

### Több kapcsolat kezelése
- [ ] Párhuzamos kapcsolatok különböző szerverekhez
- [ ] Tabbed interface kapcsolatonként
- [ ] Kapcsolatok közötti váltás gyorsbillentyűvel

---

## Fázis 4 – Polish & Distribution

### UI / UX finomhangolás
- [x] Dark Mode teljes támogatása (sötét téma, CSS variables)
- [x] macOS natív ablakkezelés (hiddenInset titlebar)
- [x] Átméretezhető sidebar (drag handle, 180–600px)
- [x] Multi-tab rendszer (editor, table, structure, script lapfülek)
- [x] Tab állapot megőrzése (display:none – editor tartalom nem veszik el)
- [ ] Light Mode támogatás
- [ ] macOS rendszer témájához igazodás
- [ ] Drag & drop táblák az Object Explorerben
- [ ] Responsive layout különböző ablakméretekhez
- [ ] Onboarding képernyő első indításkor
- [ ] Hibaüzenetek és empty state képernyők finomítása

### Teljesítmény
- [ ] Virtuális scrolling nagy adathalmazokhoz
- [x] Lazy loading az Object Explorerben
- [ ] Lekérdezési eredmény stream-elése (nagy eredményhalmazokhoz)
- [x] Kapcsolat pooling (pg.Pool, max: 5)

### Terjesztés
- [ ] macOS App Store Sandboxing beállítása (Network entitlement)
- [ ] App Store leírás és screenshotok elkészítése
- [ ] Automatikus frissítés (Sparkle framework)
- [ ] Code signing és notarizáció
- [ ] DMG / pkg telepítő az App Store-on kívüli terjesztéshez

### Dokumentáció
- [ ] README.md elkészítése
- [ ] Felhasználói kézikönyv (alapvető műveletek)
- [ ] Fejlesztői dokumentáció (architektúra, build lépések)
- [ ] CHANGELOG.md karbantartása

---

## Backlog (nem ütemezett)

- [ ] Excel (.xlsx) exportálás
- [ ] Sötét témájú SQL editor (pl. Dracula, Solarized Dark)
- [ ] Adatbázis diagram (ER diagram generálás)
- [ ] Scheduled query futtatás
- [ ] Lokalizáció (i18n) – angol / magyar
- [ ] Plugin / extension rendszer

---

*Utolsó frissítés: 2026. március 25.*

---

### Projekt struktúra (referencia)

```
YumboSQL/
├── package.json              # Root: electron, pg, keytar, concurrently
├── PLAN.md
├── TODO.md
└── src/
    ├── main/
    │   ├── main.js              # Electron main process + IPC handlers
    │   ├── preload.js           # contextBridge → window.yumbosql API
    │   └── services/
    │       ├── database.js      # pg.Pool wrapper, all DB queries
    │       └── keychain.js      # keytar macOS Keychain wrapper
    └── renderer/
        ├── package.json         # React, Vite, CodeMirror
        ├── vite.config.js
        ├── index.html
        └── src/
            ├── main.jsx
            ├── App.jsx
            ├── styles/global.css    # CSS variables, dark theme
            └── components/
                ├── Titlebar.jsx/.css
                ├── ConnectionDialog.jsx/.css
                ├── Sidebar.jsx/.css     # Object Explorer (full tree)
                ├── MainPanel.jsx/.css
                ├── SqlEditor.jsx/.css   # CodeMirror 6
                └── DataGrid.jsx/.css
```
