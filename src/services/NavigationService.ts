import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/Root';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type PendingNavigation = {
    name: keyof RootStackParamList;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any;
} | null;

let pendingNavigation: PendingNavigation = null;

export function navigate<RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params?: RootStackParamList[RouteName]
) {
    if (navigationRef.isReady()) {
        navigationRef.navigate(name as any, params as any);
    } else {
        // Store navigation request until the navigator is ready (e.g. app cold start from notification tap)
        pendingNavigation = { name, params };
        console.warn('[NavigationService] Navigation is not ready yet, queued navigation', {
            name,
            hasParams: !!params,
        });
    }
}

export function flushPendingNavigation() {
    if (pendingNavigation && navigationRef.isReady()) {
        const { name, params } = pendingNavigation;
        navigationRef.navigate(name as any, params as any);
        pendingNavigation = null;
    }
}

export const NavigationService = {
    navigate,
    navigationRef,
    flushPendingNavigation,
};
