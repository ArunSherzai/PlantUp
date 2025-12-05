# PlantUp Tip System Documentation

## Overview
The Tip System in PlantUp provides users with real-time feedback on their plants' health and general gardening advice. It operates through a combination of automatic polling, manual triggers via a sprite interaction, and a fallback to general tips.

## Core Components

### 1. `usePlantTipSystem` Hook
**Location:** `src/hooks/usePlantTipSystem.ts`

This is the central logic hub for the tip system. It handles:
- **State Management:** Tracks the currently active tip (`activePlantTip`).
- **Polling:** Checks plant health every minute.
- **General Tips:** Cycles through general advice every 5 minutes if no specific issues are found.
- **Manual Trigger:** Allows the user to request a tip immediately.

### 2. `TipNotification` Component
**Location:** `src/components/TipNotification.tsx`

This component is responsible for displaying the tip to the user.
- **UI:** A slide-down notification banner at the top of the screen.
- **Animation:** Uses `Animated.spring` for entry and exit.
- **Interaction:** Can be dismissed by swiping up/horizontal or waiting 20 seconds (auto-dismiss).
- **Visuals:** Displays a dynamic GIF based on tip severity:
    - **Critical:** `assets/animations/running.gif` (Urgent issues like extreme drought)
    - **Warning:** `assets/animations/peeking.gif` (Moderate issues)
    - **Info/General:** `assets/animations/tips.gif` (General advice)

### 3. `SpriteComponent`
**Location:** `src/components/SpriteComponent.tsx`

The interactive element on the screen (the "Sprig" character).
- **Interaction:** Tapping the sprite triggers `triggerManualTip` from the hook.
- **Visuals:** Renders `assets/images/sprig_idle.png`.

### 4. `tipResolver` Utility
**Location:** `src/utils/tipResolver.ts`

Contains the business logic for determining *which* tip to show.
- **Input:** Takes `PlantDataInput` (current sensor readings) and `PlantThresholds` (ideal conditions).
- **Output:** Returns a `TipObject` containing:
    - `message`: The text to display.
    - `severity`: 'critical', 'warning', or 'info'.
- **Logic:** Compares current values (Moisture, Light, Temp, EC) against thresholds, adjusting for Season (Summer/Winter).

---

## Logic Flow

### A. Automatic Polling (Health Check)
1.  **Interval:** Every 60 seconds.
2.  **Process:**
    -   Fetches the user's plants from Supabase.
    -   For each plant, fetches the latest sensor data (`Controllers` table).
    -   Retrieves the specific thresholds for that plant type.
    -   Calls `getTriggeredTip` to see if any value is out of range.
3.  **Outcome:**
    -   If a health issue is found (e.g., "Soil moisture < min"), that specific tip is displayed immediately.
    -   If no issues are found, the active tip is cleared.

### B. General Tips Timer
1.  **Interval:** Every 5 minutes.
2.  **Condition:** Only runs if `activePlantTip` is currently null (i.e., no urgent health warnings).
3.  **Outcome:** Displays a random general gardening tip (e.g., "Rotate your plants occasionally").

### C. Manual Trigger (Sprite Tap)
1.  **Action:** User taps the Sprig sprite.
2.  **Process:**
    -   Uses the *latest cached* plant data and thresholds (from the last poll).
    -   Checks `getTriggeredTip` again.
3.  **Outcome:**
    -   **Priority:** If a health issue exists, it shows that specific warning.
    -   **Fallback:** If the plant is healthy, it shows a random general tip.

---

## Threshold Logic Details
The `tipResolver` adjusts expectations based on the season (Summer vs. Winter).

**Season Detection:**
-   **Summer:** Months 5-9 (May to September).
-   **Winter:** All other months.

**Checks Performed:**
1.  **Soil Moisture:** Checks if too dry (< min) or too wet (> max).
2.  **Light Level:** Checks if too dark or too bright.
3.  **Temperature:** Checks if too cold or too hot.
4.  **Electrical Conductivity (EC):** Checks nutrient levels (Low/High).

**Example Tip:**
> "Your Monstera is too dry (25%). Target: >40%."

---

## Adding New Tips

### General Tips
To add more general advice, edit `GENERAL_TIPS` in `src/utils/tipResolver.ts`:
```typescript
export const GENERAL_TIPS = [
    "Existing tip...",
    "New tip here!",
];
```

### Health Triggers
To add new health checks, modify `getTriggeredTip` in `src/utils/tipResolver.ts`. You can add new conditions before the final `return null`.
