# PlantUp – Developer Reference Guide

This guide serves as a comprehensive reference for the PlantUp React Native project. It is structured to provide detailed information about the codebase, its properties, and how to work with it effectively. Use this as a lookup guide for understanding the architecture, components, and development workflows.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Project Structure](#2-project-structure)
3. [App Initialization](#3-app-initialization)
4. [Navigation](#4-navigation)
5. [State Management](#5-state-management)
6. [API Layer](#6-api-layer)
7. [Data Persistence](#7-data-persistence)
8. [Core Features](#8-core-features)
9. [Reusable Components](#9-reusable-components)
10. [Styling and Theming](#10-styling-and-theming)
11. [Permissions and Notifications](#11-permissions-and-notifications)
12. [Testing](#12-testing)
13. [Build and Release](#13-build-and-release)
14. [Common Engineering Tasks](#14-common-engineering-tasks)
15. [Known Issues and TODOs](#15-known-issues-and-todos)

---

## 1. Introduction

PlantUp is a React Native application designed to help users manage and monitor their plants. It provides features such as plant statistics, social sharing, and a visually appealing interface. This guide is intended for developers working on the project, offering detailed insights into its structure and functionality.

---

## 2. Project Structure

### Overview

The project follows a modular structure to ensure scalability and maintainability. Below is a high-level overview of the directory layout:

```
PlantUp/
├── android/                # Android-specific files for React Native
├── assets/                # Static assets like images, fonts, and sounds
├── docs/                  # Documentation files
├── newFiles/              # Newly added components
├── src/                   # Main application source code
│   ├── app/               # Core app components
│   ├── components/        # Reusable UI components
│   ├── features/          # Feature-specific modules
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Shared libraries
│   ├── navigation/        # Navigation setup
│   ├── screens/           # Screen components
│   ├── stores/            # State management stores
│   ├── testing/           # Testing utilities
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── supabase/              # Supabase-related configurations
├── app.json               # Expo configuration
├── babel.config.js        # Babel configuration
├── metro.config.js        # Metro bundler configuration
├── package.json           # Project dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── ReadMe.md              # Project documentation
```

### Key Directories

- **`src/app`**: Contains the main `App.tsx` file and core app logic.
- **`src/components`**: Reusable UI components like buttons, cards, and modals.
- **`src/features`**: Feature-specific modules such as authentication, plant stats, and social sharing.
- **`src/hooks`**: Custom React hooks for managing state and side effects.
- **`src/navigation`**: Navigation setup using React Navigation.
- **`src/screens`**: Screen components representing different app views.
- **`src/stores`**: State management using Zustand.
- **`src/utils`**: Utility functions for common tasks.

---

## 3. App Initialization

### Entry Points

- **`index.js`**: The main entry point for the app.
- **`src/app/App.tsx`**: Initializes the app, sets up providers, and renders the root component.

### Detailed Initialization Sequence

1. **Font Loading**:

   - The `useLoadFonts` hook (from `src/utils/loadFonts.ts`) ensures that custom fonts are loaded before rendering the app.
   - The `appIsReady` state is updated once fonts are loaded.

2. **Sound System Initialization**:

   - The `SoundManager` utility (from `src/utils/SoundManager.ts`) initializes app-wide sound effects.
   - Lifecycle:
     - `SoundManager.initialize()` is called on mount.
     - `SoundManager.cleanup()` is called on unmount to release resources.

3. **Navigation Setup**:

   - The `RootStack` component (from `src/navigation/Root.tsx`) is rendered as the root navigator.
   - Handles all navigation flows within the app.

4. **System Bars**:

   - The `SystemBars` component (from `react-native-edge-to-edge`) hides system bars for a full-screen experience.

5. **Gesture Handling**:
   - The `GestureHandlerRootView` component (from `react-native-gesture-handler`) wraps the app to enable gesture handling.

#### Code Flow

```tsx
import RootStack from '~/navigation/Root';
import { useLoadFonts } from '~/utils/loadFonts';
import { SoundManager } from '~/utils/SoundManager';

export default function App() {
  const fontsLoaded = useLoadFonts();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    SoundManager.initialize();
    return () => SoundManager.cleanup();
  }, []);

  useEffect(() => {
    if (fontsLoaded) setAppIsReady(true);
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <SystemBars hidden />
        <RootStack />
      </View>
    </GestureHandlerRootView>
  );
}
```

#### Potential Improvements

1. **Error Handling**:

   - Add error boundaries to catch and handle runtime errors.

2. **Loading State**:

   - Display a loading indicator while fonts are being loaded.

3. **Modularization**:
   - Extract initialization logic (e.g., `SoundManager`) into a separate provider.

---

## 4. Navigation

### Library

- **React Navigation**: Version 6.x

### Navigator Hierarchy

- **Root Navigator**: `src/navigation/Root.tsx`
  - Defines the main stack navigator for the app.
  - Includes three groups:
    - **Standard Navigation Flow**: Regular screens.
    - **Modal Flows**: Screens with slide-up transitions.
    - **Transparent Overlays**: Screens with fade-in/out transitions.

#### Deep Linking

- **Library**: `expo-linking`
- **Configuration**:
  - Prefixes: `Linking.createURL('/')`
  - Routes:
    - `Auth`: Handles authentication-related screens.
    - `TabNavigator`: Main app navigation.
    - `PlantStats`: Deep link to plant statistics (`plant-stats/:plantId`).

### Screen List

| Route Name    | Screen Component Path            | Purpose                  |
| ------------- | -------------------------------- | ------------------------ |
| Home          | `src/screens/Tab/HomeScreen.tsx` | Displays the home feed.  |
| Plant Details | `src/screens/Plants/Details.tsx` | Shows plant information. |
| User Profile  | `src/screens/Tab/Profile.tsx`    | Displays user profile.   |

---

### Expanded Navigation

#### Library

- **React Navigation**: Version 6.x

#### Navigator Hierarchy

- **Root Navigator**: `src/navigation/Root.tsx`
  - Defines the main stack navigator for the app.
  - Includes three groups:
    - **Standard Navigation Flow**: Regular screens.
    - **Modal Flows**: Screens with slide-up transitions.
    - **Transparent Overlays**: Screens with fade-in/out transitions.

#### Deep Linking

- **Library**: `expo-linking`
- **Configuration**:
  - Prefixes: `Linking.createURL('/')`
  - Routes:
    - `Auth`: Handles authentication-related screens.
    - `TabNavigator`: Main app navigation.
    - `PlantStats`: Deep link to plant statistics (`plant-stats/:plantId`).

#### Route List

| Route Name        | Component Path                                            | Purpose                                      |
| ----------------- | --------------------------------------------------------- | -------------------------------------------- |
| `Auth`            | `src/navigation/auth.tsx`                                 | Handles authentication flows.                |
| `TabNavigator`    | `src/navigation/tab-navigator.tsx`                        | Main app navigation (tabs).                  |
| `Settings`        | `src/screens/Tab/SettingsScreen/SettingsScreen.tsx`       | Displays app settings.                       |
| `Appearance`      | `src/screens/Tab/SettingsScreen/AppearanceScreen.tsx`     | Manages appearance settings.                 |
| `Notifications`   | `src/screens/Tab/SettingsScreen/NotificationsScreen.tsx`  | Manages notification preferences.            |
| `Account`         | `src/screens/Tab/SettingsScreen/AccountScreen.tsx`        | Displays account settings.                   |
| `FeedPostDetail`  | `src/screens/Tab/Feed/FeedPostDetailScreen.tsx`           | Displays details of a feed post.             |
| `UserPlants`      | `src/screens/Tab/profileScreen/UserPlantsScreen.tsx`      | Displays a user's plants.                    |
| `MessageDetail`   | `src/screens/Tab/directMessages/MessageDetailScreen.tsx`  | Displays a direct message thread.            |
| `Connections`     | `src/screens/Tab/profileScreen/ConnectionsScreen.tsx`     | Displays user connections (followers, etc.). |
| `PublicProfile`   | `src/screens/Tab/profileScreen/PublicProfileScreen.tsx`   | Displays a public user profile.              |
| `DirectMessages`  | `src/screens/Tab/directMessages/DirectMessagesScreen.tsx` | Displays the direct messages list.           |
| `Shop`            | `src/screens/Tab/shop/ShopScreen.tsx`                     | Displays the shop screen.                    |
| `PlantStats`      | `src/screens/Tab/plantStats/ShowPlantStats.tsx`           | Displays statistics for a specific plant.    |
| `CreatePost`      | `src/screens/Tab/createPostScreen/createPostScreen.tsx`   | Allows users to create a new post.           |
| `Add a Plant`     | `src/screens/Plants/addPlant/addPlant.tsx`                | Allows users to add a new plant.             |
| `BorderInventory` | `src/screens/Tab/profileScreen/BorderInventoryScreen.tsx` | Displays border inventory.                   |
| `TitleInventory`  | `src/screens/Tab/profileScreen/TitleInventoryScreen.tsx`  | Displays title inventory.                    |
| `Plant3DTest`     | `src/screens/Tab/Plant3DTestScreen/Plant3DTestScreen.tsx` | Displays a 3D plant test screen.             |
| `Lootbox`         | `src/screens/Tab/profileScreen/LootboxScreen.tsx`         | Displays lootbox rewards.                    |

#### Code Flow

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

export default function RootStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Auth" component={AuthStack} />
        <Stack.Screen name="TabNavigator" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

#### Potential Improvements

1. **Deep Linking**:

   - Expand the `linking` configuration to include all routes.

2. **Header Customization**:

   - Add dynamic headers for better user experience.

3. **Error Handling**:
   - Implement fallback screens for undefined routes.

---

## 5. State Management

### Approach

- **Library**: Zustand
- **Store Structure**: Located in `src/stores/`

### Async Flows

- Handled using async/await within Zustand actions.

---

## 6. API Layer

### HTTP Client

- **Fetch API**: Used for network requests.

### Base URL

- Defined in `.env` file.

### API Modules

| Module    | File Path                   |
| --------- | --------------------------- |
| Auth API  | `src/features/auth/api.ts`  |
| Plant API | `src/features/plant/api.ts` |

---

## 7. Data Persistence

### Storage

- **AsyncStorage**: Used for storing tokens and user preferences.

---

## 8. Core Features

### Expanded Core Features

#### Plant Statistics

**File Path**: `src/screens/Tab/plantStats/ShowPlantStats.tsx`

**Purpose**: Displays detailed statistics for a specific plant, including temperature, humidity, soil moisture, light, and electrical conductivity.

#### Key Functionalities

1. **State Management**:

   - **State Variables**:
     - `userId`, `name`, `temperature`, `humidity`: Store user and plant-specific data.
     - `latest`: Stores the latest plant controller data fetched from the database.
     - `historyData`: Stores historical data for the plant.
     - `loading`, `loadingHistory`: Manage loading states for the UI.
     - `timeRange`: Tracks the selected time range for data visualization.
     - `selectedOptionLabel`: Tracks the currently selected data type (e.g., Temperature, Humidity).

2. **Data Fetching**:

   - **Caching**:
     - `getCache` and `setCache` functions use `AsyncStorage` to cache plant history data.
   - **Database Queries**:
     - `fetchLatestController`: Fetches the latest plant controller data from the Supabase database.

3. **UI Components**:

   - **Time Range Picker**:
     - Allows users to select a time range for viewing historical data.
     - Dynamically updates the UI based on the selected range.
   - **Draggable Bottom Sheet**:
     - Displays additional plant statistics in a draggable overlay.

4. **Memoization**:
   - **Optimization**:
     - Uses `useMemo` to calculate chart data and sensor trends only when `historyData` changes.
     - Prevents unnecessary re-computation during renders.

#### Interactions with Other Parts

1. **Components**:

   - **Header**: Displays the plant's name and basic information.
   - **TrendChartCard**: Visualizes trends for the selected data type.
   - **OverviewCard**: Provides a summary of the plant's health metrics.
   - **HistoryCard**: Displays historical data in a detailed format.
   - **MiniTrendCard**: Shows mini-trends for quick insights.
   - **SnapshotBoxes**: Displays snapshot metrics for the plant.

2. **API**:

   - **Supabase**:
     - Fetches data from the `Controllers` table.
     - Handles errors gracefully and logs them to the console.

3. **Navigation**:
   - **Route Parameters**:
     - `plantId`: Passed via navigation to identify the plant.
   - **Navigation Hooks**:
     - `useNavigation`: Used for navigating between screens.
     - `useRoute`: Retrieves route parameters.

#### Code Flow

1. **Initialization**:

   - Fetches the `plantId` from route parameters.
   - Initializes state variables for user and plant data.

2. **Data Fetching**:

   - Fetches the latest plant controller data using `fetchLatestController`.
   - Caches and retrieves historical data using `AsyncStorage`.

3. **Rendering**:

   - Displays a header with the plant's name.
   - Renders trend charts, overview cards, and history cards based on the selected time range.

4. **User Interaction**:
   - Allows users to switch between time ranges using the `TimeRangePicker`.
   - Displays additional details in a draggable bottom sheet.

#### Potential Improvements

1. **Error Handling**:

   - Add user-friendly error messages for data fetching failures.

2. **Performance**:

   - Optimize database queries to reduce latency.

3. **UI Enhancements**:
   - Add animations for smoother transitions between time ranges.

---

## 9. Reusable Components

### List

- **Button**: `src/components/Button.tsx`
- **Card**: `src/components/FeedCard.tsx`

---

## 10. Styling and Theming

### Approach

- **Custom Theming**: Defined in `theme.ts`.

---

## 11. Permissions and Notifications

### Permissions

- **Camera**: Used for plant scanning.

---

## 12. Testing

### Tools

- **Jest**: Unit testing framework.

---

## 13. Build and Release

### iOS

- **CocoaPods**: Used for dependency management.

### Android

- **Gradle**: Used for builds.

---

## 14. Common Engineering Tasks

### Add a New Screen

1. Create a new file in `src/screens/`.
2. Add the screen to the appropriate navigator.

---

## 15. Known Issues and TODOs

- **TODO**: Verify API endpoints in `src/features/`.
- **TODO**: Check unused components in `newFiles/`.

---

This guide is a living document. Update it as the project evolves to ensure it remains accurate and useful.
