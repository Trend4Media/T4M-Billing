# Trend4Media Billing System

Ein vollständiges Next.js 14 Abrechnungssystem für Creator-Management mit deterministischer Provisions-Engine, revisionssicherem Ledger und Payout-Workflow.

## Features

### 🎯 Rollen & Berechtigungen
- **Admin**: Vollzugriff auf alle Funktionen
- **Team Leader**: 35% Provisionen + Downline-Boni + Team-Bonus
- **Sales Rep (Live Manager)**: 30% Provisionen + Fixboni
- **Finance**: Auszahlungs-Management

### 📊 Provisions-Engine
- **Base & Activity Provisionen**: 30%/35% je nach Rolle
- **Fixboni (EUR)**: M0.5, M1, M1 Retention, M2
- **Downline-System**: Level A (10%), B (7.5%), C (5%)
- **Team-Bonus**: 10% auf Team-Revenue + Recruitment/Graduation-Boni
- **USD→EUR Konvertierung** mit fixierten Monatskursen

### 🔄 Excel-Import System
- **Fuzzy Column Matching** (case-insensitive)
- **Automatische Manager-Zuordnung**
- **Validierung & Warnungen**
- **Batch-Import mit Fehlerprotokoll**

### 📈 Dashboards
- **Manager Dashboard**: KPIs, Provisionsaufschlüsselung, Payout-Requests
- **Admin Dashboard**: Import-Management, Payout-Freigaben, Perioden-Verwaltung

### 🔒 Sicherheit & Audit
- **Row-Level Security**: Manager sehen nur eigene Daten
- **Revisionssicheres Ledger**: Jede Komponente einzeln protokolliert
- **Adjustment-System**: Korrekturen ohne Überschreibung
- **Genealogy-System**: Historisierte Downline-Strukturen

## Schnellstart (lokal)

### 1. Repository klonen
```bash
git clone https://github.com/Trend4Media/T4M-Billing.git
cd T4M-Billing
```

### 2. Datenbank starten
```bash
# Mit Docker (empfohlen)
docker-compose up -d

# Oder manuell PostgreSQL 16 installieren und DB 'trend4media' erstellen
```

### 3. Environment einrichten
```bash
cp .env.example .env
# .env anpassen falls nötig
```

### 4. Installation & Setup
```bash
# Dependencies installieren
pnpm install

# Datenbank migrieren
pnpm db:migrate

# Seed-Daten laden
pnpm db:seed

# Entwicklungsserver starten
pnpm dev
```

### 5. Anmeldung
Die Anwendung läuft auf http://localhost:3000

**Standard-Login-Daten:**
- **Admin**: admin@trend4media.local / password123
- **Team Leader**: teamleader@trend4media.local / password123
- **Live Manager**: livemanager@trend4media.local / password123

## Architektur

### Tech Stack
- **Frontend/Backend**: Next.js 14 (App Router)
- **Authentifizierung**: NextAuth.js (Credentials)
- **Datenbank**: PostgreSQL + Prisma ORM
- **UI**: Tailwind CSS + shadcn/ui
- **Excel-Verarbeitung**: xlsx
- **Typisierung**: TypeScript

### Datenmodell
```
User (Manager/Admin) → Creator → RevenueItem
                   ↓
Period → CommissionLedger → Payout
     ↓
RuleSet (Provisionsregeln)
     ↓
OrgEdge/OrgRelation (Genealogy)
```

### Berechnungslogik
1. **Excel-Import** → RevenueItems pro Creator/Periode
2. **Personal Revenue** = Sum(Base + Activity) pro Manager
3. **Provisionen** = PersonalRevenue × Rate (30%/35%)
4. **Fixboni** = Count(Milestones) × FixAmount (EUR)
5. **Downline** = DownlineRevenue × LevelRate (10%/7.5%/5%)
6. **Team-Bonus** = TeamRevenue × 10% (wenn Ziel erreicht)
7. **USD→EUR** mit fixiertem Monatskurs
8. **Ledger-Einträge** für jede Komponente einzeln

## Workflows

### Import-Prozess
1. Admin lädt Excel-Datei hoch
2. System validiert Spalten & Daten
3. Fuzzy-Matching für Manager-Zuordnung
4. RevenueItems werden erstellt
5. Warnungsreport bei Problemen

### Abrechnungs-Prozess
1. Admin startet Recalculate für Periode
2. Engine berechnet alle Provisionen
3. Ledger-Einträge werden erstellt
4. Optional: Periode sperren (Lock)

### Payout-Prozess
1. Manager beantragt Auszahlung
2. Admin genehmigt/lehnt ab
3. Status-Tracking: SUBMITTED → APPROVED → PAID
4. Audit-Trail mit Notizen

## Entwicklung

### Nützliche Commands
```bash
# Datenbank
pnpm db:migrate      # Migrationen ausführen
pnpm db:seed         # Seed-Daten laden
pnpm db:studio       # Prisma Studio öffnen

# Development
pnpm dev             # Dev-Server
pnpm build           # Production Build
pnpm start           # Production Server

# Testing
pnpm test            # Tests ausführen
pnpm test:watch      # Tests im Watch-Mode
```

### Ordnerstruktur
```
src/
├── app/                 # Next.js App Router
│   ├── admin/          # Admin-Dashboard
│   ├── dashboard/      # Manager-Dashboard
│   └── api/            # API Routes
├── components/         # React-Komponenten
│   └── ui/            # shadcn/ui Komponenten
└── lib/               # Utilities & Konfiguration

prisma/
├── schema.prisma      # Datenbankschema
└── seed.ts           # Seed-Daten
```

## Deployment

### Vercel (empfohlen)
1. Repository zu Vercel connecten
2. Environment-Variablen setzen
3. PostgreSQL-Datenbank (Neon, Supabase, etc.)
4. Automatisches Deployment bei Git-Push

### Docker (selbst gehostet)
```bash
# Production Build
docker build -t trend4media-billing .

# Mit docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## Roadmap

### Version 1.0 ✅
- [x] Grundlegendes System-Setup
- [x] Authentifizierung & Rollen
- [x] Datenbank-Schema
- [x] Basic UI-Framework

### Version 1.1 🚧
- [ ] Excel-Import-System
- [ ] Provisions-Engine
- [ ] Manager-Dashboard
- [ ] Admin-Dashboard

### Version 1.2 📋
- [ ] Payout-Workflow
- [ ] Export-System
- [ ] Genealogy-Management
- [ ] Tests

### Version 2.0 💡
- [ ] Manager-Email-Zuordnung
- [ ] 2FA-Authentifizierung
- [ ] API-Integration (TikTok)
- [ ] Advanced Analytics
- [ ] Mobile App

## Support

Bei Fragen oder Problemen:
- **Dokumentation**: Siehe README und Code-Kommentare
- **Issues**: GitHub Issues für Bug-Reports
- **Kontakt**: Trend4Media Development Team

---

**© 2024 Trend4Media - Internes Billing System**# Vercel deployment trigger
