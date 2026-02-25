# PlantUp – Internal Engineering Documentation

## 1. Project Overview
**PlantUp** is a feature-rich mobile application for plant enthusiasts, offering gamification, social features (feed, DMs, missions), 3D plant rendering, and plant tracking (catalogs, stats).

- **Supported Platforms:** iOS, Android (via React Native and Expo).
- **Tech Stack Summary:**
  - **Framework:** React Native (0.76.9), Expo SDK (~52), `newArchEnabled` is `true`.
  - **State Management:** Zustand (v4.x).
  - **Navigation:** React Navigation v7 (Stack, BottomTabs).
  - **Backend / Database:** Supabase (`@supabase/supabase-js`), providing Auth, Database (PostgreSQL with multiple namespaces), and Realtime features.
  - **Styling / Theming:** `react-native-unistyles` for performant dark/light theme tracking.
  - **Media / 3D Graphics:** `@react-three/fiber` & `@react-three/drei` for 3D plants, `expo-video` for media playback, and `@shopify/react-native-skia` for high-performance 2D drawing.
  - **Animations & Gestures:** `react-native-reanimated` (v3) and `react-native-gesture-handler`.
  - **Bottom Sheets:** `@gorhom/bottom-sheet`.

### Overall System Architecture
The application runs on a multi-tier serverless topology:

1. **Client App Layer (IoT & UI):** React Native (Expo) app handling 3D rendering (`@react-three/fiber`), real-time sensor dashboards, camera/media features, and complex gesture UIs (BottomSheets).
2. **Central Backend Layer (Supabase):** 
   - **Database:** PostgreSQL handling core relations separated by domains into specific schemas.
   - **Realtime / WebSockets:** Broadcasts chat messages and gamification hooks via `supabase.realtime`.
   - **Auth:** Supabase Auth for JWT issuance linked to Row Level Security (RLS).
3. **AI Integration & Edge Layer (Deno Deploy & OpenAI):** Supabase Edge Functions manage secure, hidden workflows. The `mentor_daily` function abstracts OpenAI API calls (`gpt-5-mini`), processing deterministic hardware data to fetch LLM advice.
4. **Hardware/IoT Layer:** Connected microcontrollers (assumed ESP32s or equivalents) write telemetry (temperature, humidity, moisture, light, EC) straight to the `microcontroller_schema` table (`Controllers`) via REST/MQTT adapters bridging to Supabase.

**High-level Architecture Diagram:**
```text
+-------------------------------------------------------------+
|               PlantUp Mobile App (Expo/RN)                  |
|                                                             |
|  +--------------------+   +------------------------------+  |
|  |     UI Layer       |   |       State Layer            |  |
|  | (React Nav,        |---| (Zustand: UserStore,         |  |
|  |  Unistyles,        |   | DMStore, PostStore, TipStore)|  |
|  |  React Three Fiber)|   +------------------------------+  |
|  +--------------------+                 |                   |
|           |                             |                   |
|           +-----------+-----------------+                   |
|                       |                                     |
|           +---------------------------+                     |
|           |    API & Auth Layer       |                     |
|           | (src/utils/supabase.ts)   |                     |
|           +---------------------------+                     |
+-------------------------|-----------------------------------+
                          v
         +---------------------------------------+
         |            SUPABASE                   |
         | - Auth                                |
         | - Realtime Subscriptions              |
         | - Storage                             |
         | - PostgreSQL DB                       |
         |   (public, micro, user, social,       |
         |    webshop, gamification schemas)     |
         +---------------------------------------+
```

## 2. Getting Started (Engineers)

### Prerequisites
- **Node.js**: v18+ recommended.
- **Package Manager**: npm (v9+ minimum, `package-lock.json` is used).
- **Expo CLI**: Automatically managed through `npx expo`.
- **iOS Development**: Xcode (Mac only) and CocoaPods.
- **Android Development**: Android Studio and ADB.

### Install Steps
1. Clone the repository.
2. Run `npm install` inside the root directory.
3. Create a `.env` file in the root based on correct Supabase Keys:
   ```env
   EXPO_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL"
   EXPO_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
   ```

### Running the App
- **iOS**: `npm run ios` (or `npx expo run:ios`)
- **Android**: `npm run android` (or `npx expo run:android`)
- **Expo Go / Metro**: `npm start` (or `npx expo start`)

### Common Scripts
- `npm run lint`: Runs ESLint on standard files.
- `npm run format`: Runs ESLint with `--fix` and Prettier to format the codebase.
- `npm run web`: Starts web server (Expo web). Note: Web support may not be fully optimized due to native-only plugins.

### Troubleshooting
- **Metro Bundler Caching Issues**: Start with `npm start -- -c`.
- **New Architecture / Pods**: Expo auto-handles pods in managed workflows based on `app.json` plugins. If building locally, cd to `ios` and run `pod install`.
- **Supabase Realtime not connecting?**: Make sure `SESSION` has an access token and `EXPO_PUBLIC_` env vars were loaded. Check Terminal for `[Supabase] Setting realtime auth token from state change` logs.

## 3. Repo Structure

```text
PlantUp/
├── .expo/                   # Expo local generated configs
├── android/                 # Auto-generated Native Android project (prebuild)
├── ios/                     # Auto-generated Native iOS project (prebuild)
├── assets/                  # Local static assets (images, fonts, 3d models)
├── docs/                    # MD docs space (including THIS file)
├── src/                     # Core App logic
│   ├── app/                 # Entry level abstractions (App.tsx)
│   ├── components/          # Reusable UI components (Modals, Headers, Grids)
│   ├── features/            # Business domains (Auth, Social, PlantStats, etc.)
│   ├── hooks/               # Custom React Hooks
│   ├── lib/                 # Third-party wrappers/adapters
│   ├── navigation/          # React Navigation stacks & configs
│   ├── screens/             # Top-level screen components mapped to Routers
│   ├── stores/              # Zustand global state (User, DM, Posts)
│   ├── types/               # TypeScript global/types interfaces
│   └── utils/               # App utilities (Supabase, SoundManager, rng, leveling)
├── app.json                 # Expo configurations
├── babel.config.js          # Babel
├── index.js                 # RN entry point
├── package.json             # NPM dependencies
├── theme.ts                 # Unistyles Light/Dark colors & tokens
└── unistyles.ts             # Unistyles runtime registration
```

**Conventions**:
- Files that are React Components use `PascalCase.tsx` (generally), although some folders in `screens`/`features` use `camelCase`.
- Barrels (`index.ts`) are used occasionally.
- Absolute imports are supported via `tsconfig.json` paths (`~/*` mapping to `src/*`).

## 4. App Startup Flow

1. **`index.js`**: Resolves `src/app/App.tsx` via `registerRootComponent(App)`.
2. **`App.tsx` Initialization Sequence**:
   - Executes initialization side-effects: `SoundManager.initialize()`. Wait for cleanup on unmount.
   - Triggers `useLoadFonts()` which asynchronously loads defined `.ttf`/`.otf` keys.
   - Renders `null` until `fontsLoaded` is `true`.
3. **Bootstrapping UI**:
   - `GestureHandlerRootView` is wrapped around the root to supply RNGH v2 contexts.
   - `<SystemBars hidden />` (react-native-edge-to-edge) applies system styling.
   - Yields to `<RootStack />` (`src/navigation/Root.tsx`).
4. **Auth Loading**: Supabase listener automatically restores session by accessing `AsyncStorage`, which triggers Zustand store updates later on.

## 5. Configuration & Environments

- **Environment Vars**: Supplied via `.env` (prefixed with `EXPO_PUBLIC_`). The only required vars are for Supabase tracking (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
- **Expo Config (`app.json`)**:
  - `newArchEnabled`: Currently `true` (running Fabric & TurboModules).
  - Includes plugins for native configuration: `expo-font`, `expo-splash-screen`, `expo-video`, `react-native-compressor`, `expo-asset`.
  - Android package: `com.abehari.PlantUp`.
  - Configures Splash screen settings and user interface styling ("automatic" theme).

## 6. Navigation

**Library:** `@react-navigation/native` v7 / `@react-navigation/stack` v7 / `@react-navigation/bottom-tabs` v7.
**Deep Linking:** Configured in `Root.tsx` with `Linking.createURL('/')` for screens like auth and `plant-stats/:plantId`.

### Main Navigators
1. **RootStack (`Root.tsx`)**: The main standard Stack.
2. **AuthStack (`auth.tsx`)**: Dedicated auth flow (Login, Register, Reset Password).
3. **TabNavigator (`tab-navigator.tsx`)**: Primary Bottom Tabs accessible post-login.

### Core Screen Table

| Route Name         | Screen Component Path                                      | Purpose                         | Params |
|--------------------|------------------------------------------------------------|---------------------------------|--------|
| `Auth`             | `src/navigation/auth.tsx`                                  | Container for Authentication    | - |
| `TabNavigator`     | `src/navigation/tab-navigator.tsx`                         | Bottom Tabs container           | - |
| `Settings`         | `src/screens/Tab/SettingsScreen/SettingsScreen`            | Master user settings            | - |
| `Appearance`       | `src/screens/Tab/SettingsScreen/AppearanceScreen`          | Change unistyles theme          | - |
| `FeedPostDetail`   | `src/screens/Tab/Feed/FeedPostDetailScreen`                | Look at a single post & comms   | `{ post: any }` |
| `UserPlants`       | `src/screens/Tab/profileScreen/UserPlantsScreen`           | See a user's plant collection   | `{ userId?: string }` |
| `MessageDetail`    | `src/screens/Tab/directMessages/MessageDetailScreen`       | Direct 1-on-1 chat              | `{ id, name, avatar }` |
| `Connections`      | `src/screens/Tab/profileScreen/ConnectionsScreen`          | Followers/Following lists       | `{ initialTab, userId }` |
| `PublicProfile`    | `src/screens/Tab/profileScreen/PublicProfileScreen`        | Look at another user's profile  | `{ userId: string }` |
| `DirectMessages`   | `src/screens/Tab/directMessages/DirectMessagesScreen`      | Message inbox list              | - |
| `Shop`             | `src/screens/Tab/shop/ShopScreen`                          | Virtual shop & inventory        | `{ initialTab? }` |
| `PlantStats`       | `src/screens/Tab/plantStats/ShowPlantStats`                | Detailed graph & stats for plant| `{ plantId, onlyShowSelected? }` |

**Modal Screens:** (Slide up / swipe dismissible): `CreatePost`, `Add a Plant`, `BorderInventory`, `TitleInventory`, `Plant3DTest`.
**Transparent Overlays:** `Lootbox` (fades in).

## 7. State Management

- **Approach**: `zustand` v4.5.x context-free hooks approach. Fast and minimal boilerplate.
- **Location**: Stores reside in `src/stores/`.
- **How async flows are handled**: Standard `async/await` wrapping inside Zustand actions.

| Store File                       | Primary Domain / Responsibilities                             |
|----------------------------------|---------------------------------------------------------------|
| `DMStore.ts`                     | Handles 1:1 user messages schemas, unseen counters, polling.  |
| `MessageNotificationStore.ts`    | Transient counter/badges state for new inbound direct messages.|
| `PostStore.ts`                   | Feed posts collection cache.                                  |
| `TipStore.ts`                    | Educational plant tips array.                                 |
| `UserStore.ts`                   | Core user state. Offline tokens syncing routines via `AsyncStorage`. |
| `store.ts`                       | General placeholder store.                 |

## 8. API / Networking and Database Structure

### Database Structure and Schemas
The application heavily utilizes PostgreSQL **Schemas** to separate domain boundaries. Only one client is initialized in logic, but it points to discrete namespaces:
- **`public`**: Reserved for Auth profiles and caching LLM Edge Function outputs (`mentor_daily_advice`).
- **`microcontroller_schema` (`db.micro`)**: Hardware telemetry. 
  - *Main Table*: `Controllers` (plant_id, temperature, humidity, soil_moisture, light, electrical_conductivity).
- **`social_media_schema` (`db.social`)**: User feeds and catalogs.
  - *Main Tables*: `Plants` (tracked user plants), `Plant_data` (general botany catalog), `Posts` (user timeline).
- **`user_schema` (`db.user`)**: Isolated user metric dependencies (connections, messaging profiles).
- **`webshop_schema` (`db.webshop`)**: Virtual items layout.
- **`gamification` (`db.gamification`)**: Trackers for missions.
  - *Main Tables*: `Quests`, `User_quests` (tracks target counts and progressions).

### API Communication Flow
- **HTTP Strategy:** NO `axios` or bare `fetch` wrapper for standard operations. App purely relies on `@supabase/supabase-js` executing chained query builders.
- **Setup Layer (`src/utils/supabase.ts`)**:
  - Automatically fetches `EXPO_PUBLIC_SUPABASE_URL` and anon key.
  - Automatically ties `auth.storage` to `AsyncStorage`.
  - Listens `onAuthStateChange` to bridge Realtime connections, using `supabase.realtime.setAuth(session.access_token)` instantly to enforce RLS.
- **Retrieval Patterns**: Components/Stores use typical `await db.social.from('Plants').select('*')` patterns. Raw payloads are caught by React components or Zustand actions, massaged into domain arrays, and flushed to UI. 
- **Edge API:** Only edge functions use direct REST via Supabase `functions.invoke` or generic fetch. A helper `.rpc('get_random_entry_dynamic')` is also exported.

### Edge Functions and AI Evaluation Flow
The app calculates health deterministically on the client, but defers complex text-analysis and AI-mentoring to **Supabase Edge Functions** (written in TypeScript on Deno).

**The `mentor_daily` Workflow (ShowPlantStats -> DailyMentorCard):**
1. **Trigger:** User opens `DailyMentorCard` inside `ShowPlantStats.tsx`.
2. **Client Check:** App checks local state. If no cache exists, it fires a `POST` request to `https://[SUPABASE_URL]/functions/v1/mentor_daily` passing the `plant_id`.
3. **Server Validation (Edge):** The Deno function authenticates the `Bearer` token via `dbPublic.auth.getUser(token)`.
4. **Data Aggregation (Edge):** Deno queries `db.micro` for the latest sensor readings and calculates a server-side health score bridging ideal min/max thresholds.
5. **Cache Verification:** A SHA-256 hash is generated from the input context. The edge queries `public.mentor_daily_advice` to see if a prompt was already generated today.
6. **OpenAI Hand-off:** If it's a cache miss, the function securely utilizes `Deno.env.get('OPENAI_API_KEY')`, triggering a chat completion towards `gpt-5-mini`.
7. **JSON Validation & Cache:** The response (restricted to strict JSON using a system prompt) is caught, deserialized, saved back into `mentor_daily_advice`, and finally returned to the UI.

## 9. Data Persistence

1. **Remote**: Supabase PostgreSQL.
2. **Local Session Cache**: React Native's `@react-native-async-storage/async-storage`.
   - Used natively by the Supabase client for Session persistence.
   - Appended for tracking notification toggles (in `UserStore.ts`: `sprigNotificationsEnabled`).
   - Sound FX states (in `SoundManager.ts` using key `@sound_enabled`).
   - User interaction histories (`src/utils/tipHistory.ts` caches last seen tips so randomizer avoids duplicates).
   - Mission overlays view-tracking (in `ShowMissionsScreen`).
3. **Security considerations**: Data stored locally is in plaintext string format. Sensitive rules rely fully on database Row Level Security and standard session persistence.

## 10. Core Features

### Auth & Onboarding (Authentication & Authorization Concept)
- **User-facing behavior**: Starts at Welcome. Can register or login.
- **Main Screens**: `Login`, `Register`, `Welcome`, `ForgotPass`, `ResetPass` (in `src/screens/auth/`).
- **Engine**: Supabase Auth (GoTrue).
- **Flow**: Users register/login. The returned Session Access Token is cached natively in `AsyncStorage`.
- **Enforcement (RLS)**: Security is handled mostly at the Database layer using **Row Level Security (RLS)**.
- **Realtime Auth Hooking**: To prevent permission gaps over WebSockets, the app runs an explicit `supabase.auth.onAuthStateChange` listener bridging the token `supabase.realtime.setAuth(session.access_token)`.
- **State Involved**: Supabase Auth controls `<RootStack />` transition to Main app paths upon login success.

### Feed & Social
- **User-facing behavior**: Central scrolling feed showing user plant posts (images, video, text).
- **Main Screens**: `FeedScreen.tsx`, `FeedPostDetailScreen.tsx`, `CreatePostScreen.tsx`.
- **Key Components**: `FeedCard.tsx`, `FeedBottomSheet.tsx`, `CommentsBottomSheet.tsx`, `MasonryFeedGrid.tsx`.
- **State Involved**: `PostStore.ts` caching, mapped with `db.social` schema.
- **Permissions Required**: Camera and Media (`expo-image-picker`) required during `CreatePostScreen.tsx`.

### Plant Stats & Hardware Monitoring
- **User-facing behavior**: Views raw micro-controller telemetry like moisture, light, and temperature.
- **Main Screens**: `ShowPlantStats.tsx`.
- **Key Components**: `SensorDisplayCard.tsx`.
- **DB Backing**: Queries the `db.micro` / `microcontroller_schema`.
- Includes parsing sensor stats (moisture, light, temp) rendered into visual modules, powered by `react-native-gifted-charts` / `victory-native`.

### 3D Plant Growth & Gameplay
- **User-facing behavior**: Inspect generated 3D plant structures algorithmically expanding.
- **Main Screens**: `Plant3DTestScreen.tsx`.
- **Key Components**: `LSystemPlant3D.tsx`, `ProceduralPlant.tsx`, `PotModel.tsx`.
- **Tech Built**: Combines `@react-three/fiber` to procedurally build plant mesh branches (L-System tree generation).

### Direct Messaging
- **User-facing behavior**: Users can chat 1-1 with typing indicators.
- **Main Screens**: `DirectMessagesScreen.tsx`, `MessageDetailScreen.tsx`.
- **Key Components**: `TypingIndicator.tsx`.
- **State Involved**: Heavily relies on `DMStore.ts` and `MessageNotificationStore.ts`.
- Subscribes via Supabase real-time instances to inbound inserts on messaging schemas.

### Missions, Shop & Gamification
- **User-facing behavior**: Look at tasks, buy titles/borders, see lootboxes visually open with confetti.
- **Main Screens**: `ShowMissionsScreen.tsx`, `ShopScreen.tsx`, `LootboxScreen.tsx`.
- **Key Components**: `RewardDetailsModal.tsx`, `RewardItem.tsx`, `PlantCoinBox.tsx`, `RankCard.tsx`, `XPOverlay.tsx`.
- Mapped to Achievements and daily missions to earn "PlantCoins". Features an opening Lootbox system built via transparent overlays and fades (`LootboxScreen`).

## 11. Reusable Components

Located in `src/components/`, heavily used elements:

- `DraggableBottomSheet.tsx` / `FeedBottomSheet.tsx`: Gesture-controlled sheets to display comments. Replaces raw `@gorhom/bottom-sheet` usages with customized handling.
- `GradientButton.tsx` / `GradientText.tsx` / `GradientView.tsx`: Wrapper for `expo-linear-gradient` to quickly supply standard UI theming gradients.
- `NavigationBar.tsx`: The bottom tab custom bar implementation.
- `SpriteComponent.tsx`: Appears in Root level for rendering absolute positioned dynamic sprites (e.g. Gamification pet overlay).
- `HeaderButton.tsx` / `TabBarIcon.tsx`: Small boilerplate navigation icons.

## 12. Styling & Theming

- **Engine**: `react-native-unistyles` (v3). It completely avoids `StyleSheet.create` where theme responsiveness is required directly.
- **Tokens (see `theme.ts`)**:
  - `lightTheme` & `darkTheme`.
  - **Colors**: `primary: '#4FDA74'`, `secondary: '#329D9C'`, `background`, transparent/glass surfaces.
  - **Typography**: Uses `"Nunito"` (Regular) and `"Inter"` (Headers).
  - **Spacing/Margins**: Access keys via `theme.margins.md`, `sm`, `xl`, etc.
- **Usage**: A component defines styles using `const { theme, styles } = useUnistyles()`.

## 13. Permissions, Notifications, Background Work

- **Permissions**:
  - **Media/Camera**: Driven via `expo-image-picker` inside post creation elements.
  - **Audio/Video**: For feed video posts and `SoundManager.ts` (Sound Effects overlay). Uses `expo-av` and `expo-video`.
- **Notifications**: Local states track badge numbers (`sprigNotificationsEnabled`), but explicit usage of `expo-notifications` or APNs setup is currently absent/shallow.
- **Background Work**: No explicit background-fetch schedules. Relies strictly on push/active Supabase socket pings.

## 14. Observability

- **Logging Strategy**: Uses standardized `console.log()` across hooks and DB scripts (`console.log('[Supabase]')` is specifically built in `utils/supabase.ts` for tracking RLS and Auth cycles).
- **Analytics/Crash Reporting**: Not configured via 3rd party SDKs in `package.json` at this time.

## 15. Testing

- **Testing Tools**: Not fully configured. Currently, there are no Jest configurations, enzyme, testing-library wrappers, or E2E (Detox) tests implemented in the scaffolding.
- **Quality**: Enforced by `eslint` (`eslint-config-universe`) and `prettier`. 

## 16. Build, Release, CI/CD and Deployment Process

- **Environment**: Expo Application Services (EAS) capable, standard managed workflow `app.json`.
- **New Architecture**: Reconfigured with `newArchEnabled: true` starting late-2024.
- **CI Workflows**: No local GitHub Actions or pipelines. Build process currently relies on CLI tools `npx expo`.
- **Flavors/Variants**: Single master version set up natively.

### Deployment Process
- **Mobile Client (React Native):**
  - Uses managed Expo frameworks (`npx expo run:ios`/`android`). 
  - Deployed to stores via Expo Application Services (EAS Build / EAS Submit).
- **Edge Functions:**
  - Deployed via Supabase CLI (`supabase functions deploy mentor_daily`).
- **Database Migrations:**
  - Schema changes and triggers (like `update_conversation_trigger.sql`) reside sequentially in `.sql` root files or `supabase/migrations/` and track via the Supabase CLI.

## 17. Common Engineering Tasks

- **Add a new Screen**:
  1. Create component in `src/screens/...`.
  2. Implement routing in `src/navigation/Root.tsx` Stack.Screen (or TabNavigator).
  3. Expand `RootStackParamList` typing definitions.
- **Add a new API Endpoint**:
  1. No new Rest APIs. Guarantee PostgreSQL structure runs inside Supabase.
  2. Apply proper Row Level Security policies (e.g., `fix_rls_policies.sql`).
  3. Call `await db.namespace.from('table').select(...)` natively wrapped inside your component/Store.
- **Add a new Setting / Option**:
  1. Link to `src/screens/Tab/SettingsScreen/SettingsScreen.tsx`.
  2. Map toggle to `AsyncStorage` / Store contexts.
- **Add a new Reusable component**:
  1. Place in `src/components/`, export via default or named, style heavily with `useUnistyles`.

## 18. Known Issues / TODOs

- **TODO (Testing):** Add testing framework and test files. Need tests for complex components like `FeedBottomSheet`.
- **TODO (Observability):** Look into implementing Sentry or Datadog for tracing errors. Verify paths in `App.tsx`.
- **TODO (Notifications):** Implement the `expo-notifications` setup explicitly if native server pushes are anticipated.

## 19. Key Technical Decisions and Trade-offs

1. **Trade-off: Supabase SDK vs API Gateway**
   - *Decision:* Connecting clients directly to PostgreSQL schemas (`@supabase/supabase-js`) bypassing traditional REST layers.
   - *Pro:* Massive development speed increment; native real-time WebSockets; less intermediate backend code.
   - *Con:* Requires iron-clad SQL Row Level Security policies. Business logic leaks into front-end components if not careful.

2. **Trade-off: Serverless LLM Proxies vs Direct Integration**
   - *Decision:* OpenAI calls pass through `supabase/functions/mentor_daily` instead of the device.
   - *Pro:* API keys remain fully isolated; allows cheap caching of responses server-side (`mentor_daily_advice`) to avoid rate-limiting or heavy GPT token costs.

3. **Trade-off: Zustand over Redux**
   - *Decision:* `zustand` is used for states like User/DM caching.
   - *Pro:* 90% less boilerplate. Hook-based usage aligns perfectly with React Navigation 7 and Functional views without Providers.

4. **Trade-off: Unistyles over Tailwind/StyleSheet**
   - *Decision:* Using `react-native-unistyles` configured in `theme.ts` for styling.
   - *Pro:* Immediate reaction to device theme changes without re-renders. Uses C++ JSI natively instead of React Context loops. Much faster for complex graphs than Tailwind plugins.

5. **Decision: 3D Rendering & Gestures combined**
   - Integrating `@react-three/fiber` with heavy Gesture Handlers (`@gorhom/bottom-sheet`, `react-native-reanimated`). This demands the `"newArchEnabled": true` Fabric setup specified in `app.json` to keep 60fps steady while manipulating L-System trees and sliding overlays concurrently.
