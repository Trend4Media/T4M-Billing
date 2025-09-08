# Trend4Media Logo Integration

## Aktueller Status
Das System verwendet aktuell ein **generisches Logo** mit dem Trend4Media-Branding.

## Echtes Logo hinzufügen

### Schritt 1: Logo-Datei beschaffen
1. Gehen Sie zu https://trend4media.de
2. Rechtsklick auf das Logo → "Bild speichern unter"
3. Speichern als `logo.png` oder `logo.svg`

### Schritt 2: Logo ins Projekt einbinden
1. Logo-Datei in `/public/logo.png` speichern
2. Oder für bessere Qualität: `/public/logo.svg`

### Schritt 3: Logo-Komponente anpassen
In `src/components/ui/logo.tsx`:

```typescript
// Ersetzen Sie die LogoImage-Komponente:
export function LogoImage({ className = '', alt = 'Trend4Media Logo' }: { className?: string, alt?: string }) {
  return (
    <img
      src="/logo.svg" // Oder /logo.png
      alt={alt}
      className={className}
    />
  )
}
```

### Schritt 4: Logo in Komponenten verwenden
Das Logo ist bereits integriert in:
- ✅ Login-Seite
- ✅ Manager Dashboard
- ✅ Admin Dashboard

## Logo-Varianten verfügbar

### Full Logo (Standard)
```tsx
<Logo size="md" variant="full" />
```

### Nur Icon
```tsx
<Logo size="sm" variant="icon" />
```

### Nur Text
```tsx
<Logo size="lg" variant="text" />
```

### Echtes Logo-Bild
```tsx
<LogoImage className="h-8 w-auto" />
```

## Anpassungen

### Farben anpassen
In `src/components/ui/logo.tsx` können Sie die Farben ändern:
- `text-blue-600` → Ihre Markenfarbe
- `bg-blue-600` → Ihre Markenfarbe
- `from-blue-500 to-blue-700` → Ihr Farbverlauf

### Größen anpassen
Verfügbare Größen: `sm`, `md`, `lg`, `xl`

## Deployment
Nach dem Hinzufügen der Logo-Datei:
1. `git add public/logo.png`
2. `git commit -m "Add Trend4Media logo"`
3. `git push origin main`
4. Railway deployed automatisch

Das Logo wird dann auf allen Seiten angezeigt!