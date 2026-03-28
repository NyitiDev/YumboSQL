# YumboSQL – PostgreSQL Admin Tool – Tervezési Terv

## 1. Projekt áttekintés

**Cél:** Egy natív macOS asztali alkalmazás fejlesztése, amely teljes körű grafikus felületen keresztül kezeli a PostgreSQL adatbázisokat – hasonlóan a pgAdmin-hoz, de könnyebb, gyorsabb és macOS-natív élménnyel.

**Célközönség:** Fejlesztők, DBA-k, adatelemzők, akik napi szinten dolgoznak PostgreSQL-lel macOS-en.

---

## 2. Technológiai stack ✅ VÉGLEGESÍTVE ÉS IMPLEMENTÁLVA

### Frontend (UI)
| Technológia | Verzió | Állapot |
|---|---|---|
| **Electron** | 33 | ✅ Implementálva |
| **React** | 19 | ✅ Implementálva |
| **Vite** | 6.4.1 | ✅ Implementálva (HMR, port 3000) |
| **CodeMirror 6** | latest | ✅ Implementálva (PostgreSQL dialect, oneDark téma) |

### Backend / Adatkapcsolat
| Technológia | Verzió | Állapot |
|---|---|---|
| **Node.js (Electron main process)** | — | ✅ Implementálva (IPC, contextIsolation) |
| **pg csomag (Pool)** | 8.13+ | ✅ Implementálva (Pool, max: 5 concurrent) |

### Helyi adattárolás
- **JSON fájl** (`~/.yumbosql_connections.json`) – kapcsolati előzmények tárolása (max 20 bejegyzés, jelszó nélkül)
- *(SQLite tervben van lekérdezés-előzményekhez és beállításokhoz)*

### Biztonság
- **macOS Keychain (keytar 7.9)** – jelszavak biztonságos tárolása ✅ Implementálva
- **contextIsolation: true** – biztonságos IPC bridge (preload.js) ✅ Implementálva
- **SSH tunneling támogatás** – tervben

---

## 3. Főbb funkciók

### 3.1 Kapcsolatkezelés ✅
- [x] Kapcsolati profil létrehozása (host, port, user, password, database, SSL)
- [x] Kapcsolat tesztelése mentés előtt
- [x] Jelszavak tárolása macOS Keychain-ben (keytar)
- [x] Kapcsolat-előzmények mentése és betöltése (JSON fájl)
- [x] Korábbi kapcsolatok listája a bejelentkezési ablakban
- [x] SSL konfiguráció támogatása
- [x] Kapcsolat-előzmény törlése (egyenként)
- [x] Kapcsolati információ a Titlebar-ban
- [x] Több egyidejű kapcsolat kezelése – multi-host Object Explorer (HostNode tömbök)
- [x] Kapcsolatonkénti lekapcsolódás (Lekapcsolódás a Host helyi menüjéből)
- [ ] Kapcsolati profilok szerkesztése, törlése
- [ ] SSH tunnel konfiguráció

### 3.2 Adatbázis-böngésző (Object Explorer) ✅
- [x] Fa struktúrájú navigáció – **multi-host hierarchia**: Hosts → Databases → Schemas → objektumtípusok (lazy loading)
- [x] Host szint: 🖥 user@host:port csomópont, helyi menü (Frissítés + Lekapcsolódás)
- [x] Host szint: Roles (👤) és Databases (🛢) csoport – külön lazy betöltéssel, helyi menüvel
- [x] Database szint: 🗄 adatbázis csomópont (lazy sub-kapcsolat via `connectToDatabase`), helyi menü
- [x] Database szint: Extensions és Schemas alcsoportok
- [x] Schema szint: 🗂 séma csomópont, helyi menü (Frissítés)
- [x] Séma szint: táblák, nézetek, materializált nézetek, függvények, szekvenciák, típusok listázása
- [x] Tábla szint: oszlopok (típus, NOT NULL badge)
- [x] Tábla szint: indexek (PK/UQ badge, definition tooltip)
- [x] Tábla szint: constraintek (típus badge, definition tooltip)
- [x] Tábla szint: triggerek (timing badge)
- [x] Frissítés helyi menüben: Host, Roles csoport, Databases csoport, Database, Séma szinten
- [x] Átméretezhető sidebar (drag handle, 180–600px)
- [x] Jobb-klikk helyi menü táblákra (Adatok listája, Táblaszerkezet, **Új rekord**, SQL almenü, Frissítés)
- [x] SQL almenü: SELECT, INSERT, UPDATE, ALTER, CREATE sablonok (idézőjelezett oszlopnevekkel)
- [x] Séma-szintű objektumcsoport helyi menü (Létrehozás + Frissítés) – minden típusra
- [x] Tábla al-objektum csoport helyi menü (Létrehozás + Frissítés)
- [x] Dupla-kattintás tábla al-objektumokra → ALTER script új lapfülön
- [x] CREATE sablonok: TABLE, VIEW, MATVIEW, FUNCTION, SEQUENCE, TYPE, INDEX, COLUMN, CONSTRAINT, TRIGGER

### 3.3 SQL Editor ✅
- [x] Szintaxis kiemelés (PostgreSQL dialect, oneDark téma)
- [x] Billentyűkombinációk (Cmd+Enter = futtatás, Cmd+S = mentés fájlba)
- [x] Hibaüzenet megjelenítése végrehajtási hiba esetén
- [x] Végrehajtási idő mérése és megjelenítése
- [x] Több lekérdezési lap (tabs) – multi-tab rendszer (editor, table, structure, script)
- [x] SQL mentése fájlba (natív fájlmentő dialógus, .sql szűrő)
- [x] Aktív sor kiemelése, kék kurzor
- [x] Code folding, selection highlighting
- [x] Tab állapot megőrzése (display:none megközelítés – CodeMirror nem veszíti el a tartalmat)
- [ ] Automatikus kiegészítés (táblák, oszlopok, függvények)
- [ ] Lekérdezés-előzmény (history)
- [ ] EXPLAIN / EXPLAIN ANALYZE megjelenítés
- [ ] Hibakiemelés inline
- [ ] Snippet könyvtár
- [ ] Cmd+/ (komment), Cmd+Shift+F (formázás)

### 3.4 Táblázatos adatnézet (Data Grid)
- [x] Lapozható táblázatos adat-megjelenítés (limit/offset)
- [x] Oszlopfejlécek automatikus generálása
- [x] NULL értékek vizuális jelölése
- [x] JSON mezők formázott megjelenítése
- [x] Sticky fejléc és sorszámozás
- [x] **Új rekord hozzáadása** (NewRecordView lapfül) – típusos beviteli mezők, AUTO badge auto-fill mezőkre
- [x] **Rekord szerkesztése** (EditRecordView lapfül) – dupla kattintás sorra, PK alapú UPDATE
- [ ] Sorok törlése (DELETE) – megerősítési dialógussal
- [ ] Inline cella szerkesztés
- [ ] Szűrés és rendezés az oszlopokon
- [ ] Exportálás: CSV, JSON

### 3.5 Séma kezelés (DDL műveletek GUI-n)
- [ ] Tábla létrehozása / szerkesztése / törlése – grafikus szerkesztővel
- [ ] Oszlop hozzáadása, típus módosítása, alapértelmezett érték beállítása
- [ ] Primary key, foreign key, unique, check constraint kezelés
- [ ] Index létrehozása / törlése
- [ ] Nézet (VIEW) és materializált nézet kezelése
- [ ] Függvény / tárolt eljárás szerkesztő
- [ ] Trigger kezelés
- [ ] Sorozat (SEQUENCE) kezelés
- [ ] Séma átnevezés / áthelyezés

### 3.6 Import / Export
- [ ] Táblák exportálása: SQL dump, CSV, JSON
- [ ] `pg_dump` / `pg_restore` integráció
- [ ] CSV / JSON importálás táblába
- [ ] COPY parancs GUI wrapper

### 3.7 Felhasználó- és jogosultságkezelés
- [ ] Role-ok listázása és kezelése
- [ ] GRANT / REVOKE műveletek grafikus felületen
- [ ] Jelszó módosítás
- [ ] Séma- és tábla-szintű jogosultságok vizualizálása

### 3.8 Monitoring és statisztikák
- [ ] Aktív kapcsolatok (pg_stat_activity) megjelenítése
- [ ] Futó lekérdezések listája és leállítási lehetőség (`pg_terminate_backend`)
- [ ] Tábla- és index-statisztikák (pg_stat_user_tables)
- [ ] Adatbázis mérete, táblaméretek
- [ ] Lock-ok vizualizálása
- [ ] Alap teljesítmény-metrikák dashboard

### 3.9 Egyéb
- [x] Dark Mode (sötét téma, #0d1117 bg, #58a6ff accent) ✅
- [x] macOS natív ablakkezelés (hiddenInset titlebar) ✅
- [x] **Splash screen** – logóval, alcímmel, „Tovább" gombbal; `NoLogo` indítási paraméter kihagyja ✅
- [x] **macOS főmenü neve** → YumboSQL (`app.setName`) ✅
- [x] **Húzható vízszintes elválasztó** az SQL editor és az eredménypanel között ✅
- [ ] Light Mode támogatás
- [ ] macOS natív billentyűkombinációk (bővítés)
- [ ] Drag & drop táblák között
- [ ] Automatikus frissítés mechanizmus

---

## 4. Alkalmazás-architektúra (Implementált)

```
┌──────────────────────────────────────────────────────────┐
│              Electron 33 – macOS Desktop App              │
│  titleBarStyle: hiddenInset, contextIsolation: true       │
│                                                           │
│  ┌────────── Renderer Process (React 19 + Vite 6) ─────┐ │
│  │                                                       │ │
│  │  ┌──────────────┐  ┌─────────────────────────────┐   │ │
│  │  │  Sidebar      │  │   MainPanel (Multi-Tab)     │   │ │
│  │  │  Object       │  │  ┌───┬───┬───┬───────────┐  │   │ │
│  │  │  Explorer     │  │  │SQL│TBL│DDL│Script tabs │  │   │ │
│  │  │  (lazy tree)  │  │  ├───┴───┴───┴───────────┤  │   │ │
│  │  │              │  │  │ SqlEditor (CM6)        │  │   │ │
│  │  │  Resizable   │  │  │ oneDark, PostgreSQL    │  │   │ │
│  │  │  (drag, 180- │  │  │ Cmd+Enter, Cmd+S      │  │   │ │
│  │  │   600px)     │  │  ├────────────────────────┤  │   │ │
│  │  │              │  │  │ DataGrid / Results     │  │   │ │
│  │  │  • Roles     │  │  │ sticky header, NULL    │  │   │ │
│  │  │  • Extensions│  │  │ JSON format, paging    │  │   │ │
│  │  │  • Schemas   │  │  └────────────────────────┘  │   │ │
│  │  │    └ Tables  │  └─────────────────────────────┘   │ │
│  │  │      └ Cols  │                                     │ │
│  │  │      └ Idx   │  Context Menus:                     │ │
│  │  │      └ Cons  │  • Tábla: Adatok/DDL/SQL/Frissítés  │ │
│  │  │      └ Trg   │  • Csoport: Létrehozás/Frissítés    │ │
│  │  │    └ Views   │  • Al-objektum: dupla-klikk→ALTER    │ │
│  │  │    └ Funcs   │                                     │ │
│  │  │    └ Seqs    │  ┌─────────────────────────────┐   │ │
│  │  │    └ Types   │  │ ConnectionDialog            │   │ │
│  │  │    └ MatViews│  │ (history list, test, SSL)   │   │ │
│  │  └──────────────┘  └─────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────┘ │
│                          │ IPC (contextBridge)             │
│  ┌────────── Main Process ─────────────────────────────┐  │
│  │  preload.js ──► window.yumbosql API (~26 metódus)   │  │
│  │                                                      │  │
│  │  services/database.js  ──► pg.Pool (max: 5)         │  │
│  │  services/keychain.js  ──► keytar (macOS Keychain)  │  │
│  │  ~/.yumbosql_connections.json (connection history)   │  │
│  │  file:save-sql ──► natív fájlmentő dialógus         │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────┘
                             │
                ┌────────────▼────────────┐
                │   PostgreSQL Server     │
                │  (local / remote / SSL) │
                └─────────────────────────┘
```

---

## 5. Fejlesztési fázisok

### Fázis 1 – MVP (Minimum Viable Product)
**Időkeret:** ~2-3 hónap

- Kapcsolat létrehozása és kezelése (helyi + remote, SSL)
- Object Explorer – adatbázisok, sémák, táblák listázása
- SQL Editor alapok – futtatás, eredmény megjelenítése
- Data Grid – csak olvasható adatmegjelenítés
- Alapvető DDL: tábla és nézet létrehozás/törlés

### Fázis 2 – Core Features
**Időkeret:** ~2-3 hónap

- SQL Editor – autocomplete, explain plan
- Data Grid – szerkesztés, sor hozzáadás/törlés
- Séma szerkesztő – oszlopok, constraintek, indexek GUI-n
- Import/Export (CSV, SQL dump)
- Lekérdezés-előzmény és snippet könyvtár

### Fázis 3 – Advanced Features
**Időkeret:** ~2-3 hónap

- Felhasználó- és jogosultságkezelés
- Monitoring dashboard
- SSH tunnel teljes támogatás
- Függvény / trigger szerkesztő
- Több kapcsolat egyidejű kezelése

### Fázis 4 – Polish & Distribution
**Időkeret:** ~1-2 hónap

- Dark/Light mode finomhangolás
- Teljesítmény optimalizálás
- macOS App Store felkészítés (sandboxing)
- Automatikus frissítés (Sparkle framework)
- Dokumentáció és onboarding

---

## 6. Adatbiztonság és best practices

- Jelszavak **soha** nem tárolódnak plain text-ben – kizárólag macOS Keychain
- SSL kapcsolatok preferáltak, figyelmeztetés nem-SSL kapcsolatnál
- SQL injection-védelmet nem a tool biztosít (a user saját SQL-t futtat), de a belső lekérdezések **parameterized queries**-t használnak
- Destruktív műveletek előtt (DROP, DELETE) megerősítési dialógus
- Automatikus kapcsolat-timeout kezelés
- SSH tunnel kulcsok biztonságos kezelése

---

## 7. Használt könyvtárak és eszközök

| Kategória | Eszköz | Állapot |
|---|---|---|
| Desktop shell | Electron 33 | ✅ |
| UI keretrendszer | React 19 | ✅ |
| Build eszköz | Vite 6.4.1 | ✅ |
| SQL szerkesztő | CodeMirror 6 (@codemirror/lang-sql, theme-one-dark) | ✅ |
| PostgreSQL driver | pg 8.13 (Pool) | ✅ |
| Jelszókezelés | keytar 7.9 (macOS Keychain) | ✅ |
| Párhuzamos indítás | concurrently + wait-on | ✅ |
| Build / terjesztés | electron-builder 25 | Konfigurálva |
| SSH tunnel | ssh2 (Node.js) | Tervben |
| Tesztelés | Jest / Vitest | Tervben |
| Kód stílus | ESLint | Tervben |

---

## 8. Azonosított kockázatok

| Kockázat | Valószínűség | Hatás | Megoldás |
|---|---|---|---|
| PostgreSQL verziók közötti eltérések | Közepes | Közepes | Verzió detektálás, kompatibilitási réteg |
| macOS App Store Sandboxing korlátai | Magas | Magas | Network entitlement, SSH alternatívák |
| Nagy adathalmazok lassú megjelenítése | Közepes | Magas | Virtuális scrolling, lapozás |
| SSL / tanúsítvány problémák | Közepes | Közepes | Részletes hibakezelés és naplózás |
| Autocomplete pontatlanság | Alacsony | Alacsony | Fallback az `information_schema`-ra |

---

## 9. Aktuális állapot és következő lépések

### ✅ Elkészült (MVP+)
1. Teljes projekt struktúra (Electron 33 + React 19 + Vite 6)
2. Kapcsolódás PostgreSQL-hez (Pool, SSL, Keychain)
3. Kapcsolat-előzmények (JSON fájl, UI lista, törlés)
4. **Multi-host Object Explorer** – Hosts → Databases → Schemas → fa (lazy loading, sub-kapcsolatok per DB)
5. SQL Editor (CodeMirror 6, PostgreSQL szintaxis, Cmd+Enter, Cmd+S, húzható elválasztó)
6. Data Grid (lapozás, NULL jelölés, JSON formázás, dupla kattintás szerkesztéshez)
7. **Új rekord felvitel** (NewRecordView) – típusos mezők, auto-fill felismerés
8. **Rekord szerkesztés** (EditRecordView) – előtöltött mezők, PK alapú UPDATE
9. **Helyi menük** – tábla, séma, host, roles, databases, database szinteken
10. **Splash screen** (logo + „Tovább"), `NoLogo` parancssori paraméter
11. Sötét téma (dark mode, CSS variables)
12. Átméretezhető sidebar (drag handle)
13. macOS főmenü neve: YumboSQL

### 🔲 Következő lépések (prioritás sorrendben)
1. **Sor törlése** a Data Gridből (DELETE + megerősítési dialógus)
2. **SQL Editor autocomplete** – táblák, oszlopok, kulcsszavak
3. **EXPLAIN / EXPLAIN ANALYZE** vizualizáció
4. **Export** – CSV, JSON, SQL dump
5. **Kapcsolati profil szerkesztése / törlése** a history listából
6. **Light mode** támogatás
7. **Monitoring dashboard** – aktív kapcsolatok, futó lekérdezések, tábla méret
8. **SSH tunnel** integráció

---

*Dokumentum létrehozva: 2026. március 25.*  
*Utolsó frissítés: 2026. március 27.*
