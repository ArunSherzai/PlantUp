# PlantUp

Smart-Gardening-App, die Pflanzenpflege mit IoT-Sensoren, Gamification und einer Community verbindet. Sensoren im Topf messen Bodenfeuchte, Temperatur und Licht, die App gibt daraus Pflegeempfehlungen und belohnt regelmäßige Pflege mit XP, Missionen und Streaks.

Diplomarbeit an der HTL Donaustadt (Abteilung Informatik), 2025/26.

> Dieses Repository enthält den App-Teil des Projekts mit seiner vollständigen Commit-History. Hardware (ESP32), Middleware und Diplomarbeitsdokumente liegen im privaten Team-Repository.

## Features

- **Pflanzen & Sensoren** – Pflanzen anlegen, Live-Sensordaten, Trend-Diagramme und Pflegetipps
- **Gamification** – XP und Level, tägliche Missionen, Daily Streaks mit Freeze-Item, XP-Booster, Belohnungen
- **Maskottchen „Sprig“** – animierter Begleiter mit verschiedenen Zuständen
- **Community** – Feed mit Beiträgen, Kommentare, Direktnachrichten, Folgen
- **Mentor** – erfahrene Nutzer helfen Einsteigern
- **Benachrichtigungen** – Push-Benachrichtigungen, Pflege-Erinnerungen, eigene Sounds
- **3D-Vorschau** – Pflanzen und Töpfe als 3D-Modelle

## Tech-Stack

| Bereich | Technologie |
| --- | --- |
| App | React Native, Expo, TypeScript |
| State | Zustand |
| Animationen & Grafik | Reanimated, Skia, React Three Fiber |
| Diagramme | Victory Native, Gifted Charts |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Benachrichtigungen | Notifee, Expo Notifications |
| Tests | Jest, Maestro (End-to-End) |

## Starten

```bash
npm install
# .env mit EXPO_PUBLIC_SUPABASE_URL und EXPO_PUBLIC_SUPABASE_ANON_KEY anlegen
npx expo start
```

## Team

| Name | GitHub |
| --- | --- |
| Abd-Ulrahman Behari | [@Proweeb](https://github.com/Proweeb) |
| Arun Sherzai | [@ArunSherzai](https://github.com/ArunSherzai) |
| Dennis Frenzel | [@DennisFrenzel](https://github.com/DennisFrenzel) |
| Richard Onu | [@RichardOnu](https://github.com/RichardOnu) |

### Mein Anteil (Arun)

Frontend und Animationen eines großen Teils der App:

- Missionen-Screen, Daily Streak, XP-Booster, Freeze-Item, Belohnungs- und XP-Animationen
- Maskottchen-Animationen und animierte Rahmen
- Beiträge erstellen, Feed-Karten, Direktnachrichten, Follow-Benachrichtigungen
- Push-Benachrichtigungen, Einstellungen, Profil und Tutorial
- Überarbeitung der Pflanzen-Statistik mit Trend-Diagrammen

Außerhalb dieses Repos: C#-MQTT-Middleware und eine Video-Upload-API (ASP.NET).
