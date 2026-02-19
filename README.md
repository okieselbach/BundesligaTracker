# Bundesliga Tracker

Ein persoenlicher Tracker fuer die deutsche Fussball-Bundesliga.

## Features

- **1. Bundesliga, 2. Bundesliga, 3. Liga** mit allen echten Clubs der Saison 2025/26
- **DFB-Pokal** mit 64 Teams und K.O.-Runden (inkl. Elfmeterschiessen)
- **Tabelle** mit Auf-/Abstiegsmarkierungen im bundesliga.com-Stil
- **Spieltage** mit Ergebnis-Eingabe - zufaellig generiert oder manuell zusammengestellt
- **Club-Verwaltung** mit Auf-/Abstieg zwischen Ligen
- **Saison-Management** - mehrere Saisons anlegen, Clubs uebernehmen
- **Export/Import** - Daten als JSON sichern und wiederherstellen
- **Offline-faehig** - alle Daten lokal im Browser (IndexedDB)
- **Mobile-optimiert** - funktioniert auf iPhone/iPad

## Tech-Stack

- [Next.js](https://nextjs.org) (Static Export fuer GitHub Pages)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Dexie.js](https://dexie.org) (IndexedDB Wrapper)
- Club-Logos via Wikipedia/Wikimedia Commons

## Entwicklung

```bash
npm install
npm run dev
```

Oeffne [http://localhost:3000](http://localhost:3000) im Browser.

## Deployment

Automatisch via GitHub Actions auf GitHub Pages bei jedem Push auf `main`.

## Lizenz

Privates Projekt - Built with Love by Oliver for Phil.
