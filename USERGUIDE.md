<p><img src="logo_transparent.png" alt="YumboSQL" width="120" style="vertical-align: middle; margin-right: 12px;" /><strong style="font-size: 3em;">YumboSQL</strong></p>

## Felhasználói kézikönyv

> **YumboSQL** egy macOS-re készült PostgreSQL adminisztrációs asztali kliens.  
> Verzió: 0.1.0
> Technológia: Electron + React + pg

Szerző: nyiti2@gmail.com

---

## Tartalom

1. [Az alkalmazás indítása](#1-az-alkalmazás-indítása)
2. [Splash screen](#2-splash-screen)
3. [Kapcsolat létrehozása](#3-kapcsolat-létrehozása)
4. [Object Explorer](#4-object-explorer)
5. [SQL Editor](#5-sql-editor)
6. [Adatok listája (Data Grid)](#6-adatok-listája-data-grid)
7. [Új rekord felvitele](#7-új-rekord-felvitele)
8. [Rekord szerkesztése](#8-rekord-szerkesztése)
9. [Táblaszerkezet megtekintése](#9-táblaszerkezet-megtekintése)
10. [SQL sablonok](#10-sql-sablonok)
11. [Helyi menük (jobb klikk)](#11-helyi-menük-jobb-klikk)
12. [Lapfülek kezelése](#12-lapfülek-kezelése)
13. [Billentyűkombinációk](#13-billentyűkombinációk)

---

## 1. Az alkalmazás indítása

### Fejlesztői módban (terminálból)

```bash
cd /path/to/YumboSQL
bash start.sh
```

A `start.sh` szkript egyszerre indítja el a Vite dev szervert (renderer) és az Electron folyamatot.

### Splash screen kihagyása

Ha gyorsan be szeretnéd tölteni az alkalmazást a bevezető képernyő megjelenítése nélkül:

```bash
bash start.sh NoLogo
```

A `NoLogo` paraméter hatására az alkalmazás rögtön a fő ablakot nyitja meg.

---

## 2. Splash screen

Az alkalmazás indulásakor egy kis bevezető ablak jelenik meg:

- **YumboSQL** felirat és az alkalmazás logója
- *„PostgreSQL admin tool for MacOS"* alcím
- **→ Tovább** gomb

Kattints a **Tovább** gombra a fő ablakhoz való lépéshez. Az ablak bezárul és megnyílik a főablak.

---

## 3. Kapcsolat létrehozása

### Kapcsolat dialógusablak megnyitása

- Az alkalmazás első indításakor a kapcsolat dialógusablak automatikusan megjelenik.
- Posteriormente a **Titlebarban** a **＋ Kapcsolat** gombbal nyitható meg.

### Adatok kitöltése

| Mező | Leírás |
|------|--------|
| **Host** | PostgreSQL szerver IP-je vagy hosztneve (pl. `localhost`) |
| **Port** | Alapértelmezett: `5432` |
| **Database** | Csatlakozni kívánt adatbázis neve |
| **User** | Felhasználónév |
| **Password** | Jelszó (SSL: igen esetén kötelező, vagy Keychain-ből töltödik) |
| **SSL** | Checkbox – TLS titkosított kapcsolat engedélyezése |

### Kapcsolat mentése

A sikeres csatlakozás után az alkalmazás automatikusan elmenti a kapcsolati adatokat (jelszó nélkül) az előzmények listájába. A jelszó a macOS Keychain-ben kerül tárolásra.

### Korábbi kapcsolatok

A dialógusablak alján megjelenik a legutóbbi kapcsolatok listája. Kattintással újra betölthető egy korábbi konfiguráció.

Az **×** ikonra kattintva egy korábbi bejegyzés törölhető az előzmények listájából.

### Kapcsolat tesztelése

A **Kapcsolat tesztelése** gombbal ellenőrizhető, hogy a megadott adatokkal létre lehet-e hozni kapcsolatot, anélkül hogy bezárnád a dialógust.

---

## 4. Object Explorer

A bal oldali **Sidebar** tartalmazza az Object Explorert. Ez egy fa-struktúrájú nézetben mutatja meg az összes aktív kapcsolatot és az elérhető adatbázis-objektumokat.

### Hierarchia

```
🖥 user@host:port                ← HostNode
  👤 Roles                       ← Roles csoport
     ├── admin (superuser 🔐)
     └── readonly
  🛢 Databases                   ← Databases csoport
     └── 🗄 my_database          ← DatabaseNode (kattintásra sub-kapcsolat)
           🔌 Extensions
           🗂 Schemas
              └── 🗂 public
                    📁 Tables
                       └── 📋 users
                              📋 Columns
                              🔑 Indexes
                              🔒 Constraints
                              ⚡ Triggers
                    👁 Views
                    📊 Materialized Views
                    ⚙ Functions
                    🔢 Sequences
                    🏷 Types
```

### Navigáció

- **Kattintás** egy csomópontra: kibontja vagy becsukja az adott ágat.
- **Lazy loading**: az adatok csak akkor töltödnek be, amikor egy csomópont kibontásra kerül.
- **DatabaseNode**: az adatbázis nevére kattintva az alkalmazás automatikusan létrehoz egy sub-kapcsolatot az adott adatbázishoz.

### Sidebar átméretezése

A Sidebar és a főpanel közötti **húzható elválasztósávon** kattintva és húzva átméretezhető az Object Explorer. Minimális szélesség: 180px, maximum: 600px.

---

## 5. SQL Editor

### Az editor megnyitása

Minden kapcsolatnál az editor lapfül automatikusan rendelkezésre áll. Új SQL editor lapfület az **＋** gombbal nyithatsz.

### Lekérdezés futtatása

1. Írd be a SQL utasítást a szövegmezőbe.
2. **Cmd + Enter** – lekérdezés végrehajtása.
3. Az eredmény az editor alatti panelen jelenik meg táblázatos formában.
4. A végrehajtási idő az eredménypanel fejlécében látható.

### Több kapcsolat kezelése

Ha egyszerre több kapcsolat van nyitva, az editor fejlécében egy **legördülő menü** jelenik meg, amellyel kiválasztható, melyik kapcsolaton fusson a lekérdezés.

### SQL fájl mentése

- **Cmd + S** – megnyílik a macOS natív mentési dialógus, amellyel a szerkesztő tartalma `.sql` fájlba menthető.

### Editor és eredménypanel átméretezése

Az SQL editor és az alatta lévő eredménypanel közötti **vízszintes elválasztósávot** húzva átméretezhető a két terület aránya.

---

## 6. Adatok listája (Data Grid)

### Megnyitás

Az Object Explorerben jobb klikk egy táblán → **Adatok listája**.

### A nézet elemei

- **Táblázat fejlécek**: oszlopneveket mutat, rögzített (sticky) görgetésnél.
- **Lapozás**: az eredmény csoportokban (limit/offset) töltödik be. A lapozó gombokkal navigálható.
- **NULL értékek**: `NULL` szöveggel, szürke háttérrel jelölve.
- **JSON mezők**: formázott (pretty-printed) JSON megjelenítés.
- **Sorszámozás**: az első oszlop a sor sorszámát mutatja.

### Sor szerkesztése

Dupla kattintás bármely sorra → megnyílik a **Szerkesztés** lapfül az adott sor adataival előtöltve.

---

## 7. Új rekord felvitele

### Megnyitás

Jobb klikk egy táblán az Object Explorerben → **＋ Új rekord**.

### Az űrlap elemei

Az alkalmazás automatikusan lekéri a tábla oszlopait és azok típusait, majd minden oszlophoz megfelelő beviteli mezőt jelenít meg:

| Típus | Beviteli mező |
|-------|--------------|
| `boolean` | Legördülő: `(üres)` · `true` · `false` |
| `date` | Dátumválasztó (`date`) |
| `timestamp`, `timestamptz` | Dátum-idő választó (`datetime-local`) |
| `smallint`, `integer`, `bigint`, `numeric`, `float`, `double` | Szám mező (`number`) |
| `json`, `jsonb` | Többsoros szöveg (`textarea`) |
| minden más | Egysoros szöveg (`text`) |

### AUTO badge – automatikusan kitöltött mezők

Ha egy oszlop értékét az adatbázis automatikusan állítja be, a mező le van tiltva és **AUTO** felirat jelzi:
- `GENERATED ALWAYS AS IDENTITY`
- Bármely `GENERATED` oszlop
- `DEFAULT nextval('...')` (szekvenciából)

Ezeket a mezőket nem kell (és nem is lehet) kézzel kitölteni.

### Mentés

Kattints a **Mentés** gombra. Sikeres INSERT után az űrlap visszaáll üres állapotba.

Ha hiba történik (pl. NOT NULL violation, unique constraint), az alkalmazás piros szövegben jeleníti meg a PostgreSQL hibaüzenetet az űrlap alatt.

---

## 8. Rekord szerkesztése

### Megnyitás

Dupla kattintás egy sorra az **Adatok listája** nézetben (táblázat során).

### Az EditRecordView elemei

- A mező típusa alapján ugyanolyan beviteli mezők jelennek meg, mint az Új rekord esetén.
- A mezők **előre ki vannak töltve** a kiválasztott sor értékeivel.
- **PK badge** (kék): az elsődleges kulcs oszlopán jelzi, hogy az adott mező az UPDATE WHERE feltételét alkotja.

### Mentés

Kattints a **Mentés** gombra. Az alkalmazás `UPDATE ... WHERE pk_col = pk_value` paraméteres lekérdezést küld a szervernek.

> **Fontos**: Ha a táblának nincs elsődleges kulcsa, a mentés gomb le van tiltva és figyelmeztető üzenet jelenik meg.

### Hibaüzenetek

PostgreSQL szintű hibák (pl. foreign key violation, check constraint) piros szövegben jelennek meg a form alatt.

---

## 9. Táblaszerkezet megtekintése

### DDL nézet megnyitása

Jobb klikk a táblán → **Táblaszerkezet**.

A megnyíló lapfülön megjelenik a tábla teljes szerkezete:
- Oszlopok (típus, NOT NULL, alapértelmezett érték)
- Indexek (PK, unique, egyéb)
- Constraintek (primary key, foreign key, check, unique)
- Triggerek (timing, esemény)

### ALTER script generálás

Dupla kattintás bármelyik al-objektumra (oszlop, index, constraint, trigger) → egy szerkeszthető SQL script lapfüle nyílik meg az adott objektumhoz generált `ALTER TABLE ...` utasítással.

---

## 10. SQL sablonok

Az Object Explorerben jobb klikk egy táblán → **SQL** almenü.

Az elérhető sablonok:

| Sablon | Leírás |
|--------|--------|
| **SELECT** | `SELECT * FROM schema.table LIMIT 100` |
| **INSERT** | `INSERT INTO schema.table (...) VALUES (...)` – oszlopos |
| **UPDATE** | `UPDATE schema.table SET ... WHERE ...` |
| **ALTER TABLE** | `ALTER TABLE schema.table ADD COLUMN ...` |
| **CREATE TABLE** | Új tábla sablon |

A sablon kiválasztása után a generált SQL megnyílik egy új szerkeszthető lapfülön.

Egyéb objektumokhoz (indexek, constraintek, triggerek, oszlopok) dupla kattintásra is nyitható sablon lapfül.

---

## 11. Helyi menük (jobb klikk)

### Host szintű helyi menü

Jobb klikk a **HostNode** csomóponton (🖥 user@host:port):

- **Lekapcsolódás** – megszünteti a kapcsolatot és eltávolítja a HostNode-ot az Object Explorerből

### Roles és Databases csoportok

Jobb klikk a **👤 Roles** vagy **🛢 Databases** csoporton:

- **Frissítés** – újratölti a csoportot

### Database szintű helyi menü

Jobb klikk egy **DatabaseNode** csomóponton (🗄):

- **Frissítés** – újratölti az adatbázis tartalmát

### Séma szintű helyi menü

Jobb klikk egy objektum csoporton (pl. Tables, Views, Functions...):

- **Létrehozás** – megnyit egy CREATE sablon lapfület
- **Frissítés** – újratölti az adott csoportot

### Tábla szintű helyi menü

Jobb klikk egy táblán:

- **Adatok listája** – megnyitja a Data Grid nézetet
- **Táblaszerkezet** – megnyitja a DDL nézetet
- **＋ Új rekord** – megnyitja az Új rekord űrlapot
- **SQL** almenü → SELECT, INSERT, UPDATE, ALTER, CREATE sablonok
- **Frissítés** – újratölti a tábla al-objektumait

### Oszlop, index, constraint, trigger al-objektum helyi menü

Jobb klikk az al-objektum csoporton:

- **Létrehozás** – sablon script
- **Frissítés** – újratöltés

---

## 12. Lapfülek kezelése

### Lapfül típusok

| Típus | Leírás | Deduplikáció |
|-------|--------|--------------|
| `editor` | SQL szerkesztő | Egy per kapcsolat |
| `table` | Data Grid (Adatok listája) | Egy per schema.table |
| `structure` | Táblaszerkezet (DDL) | Egy per schema.table |
| `script` | SQL sablon / generált script | Mindig új lapfül |
| `newrecord` | Új rekord űrlap | Egy per schema.table |
| `editrecord` | Rekord szerkesztése | Mindig új lapfül |

### Lapfül bezárása

Minden lapfülön megjelenik az **× bezárás** gomb, amelyre kattintva a lapfül bezárul.

### Lapfül deduplikáció

Ha például az `Adatok listája` nézet már nyitva van egy táblához, jobb klikkre → Adatok listája hatására az alkalmazás az already existing lapfülre ugrik ahelyett, hogy újat nyitna.

Az `editrecord` lapfülök mindig új lapfülként nyílnak, hogy egyszerre több sor is szerkeszthető legyen.

---

## 13. Billentyűkombinációk

| Kombinació | Művelet |
|-----------|---------|
| **Cmd + Enter** | Lekérdezés futtatása |
| **Cmd + S** | SQL mentése fájlba |
| **Dupla kattintás** Data Grid sorra | Rekord szerkesztése |

---

*Utolsó frissítés: 2026. március 27.*
