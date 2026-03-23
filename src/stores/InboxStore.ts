import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = '@PlantUp:notification_inbox';
const MAX_ITEMS = 60;
const READ_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const ALERT_RETENTION_MS = 21 * 24 * 60 * 60 * 1000;

export type InboxNotificationKind = 'critical' | 'warning' | 'general' | 'chat' | 'follow';

export interface InboxNavigationTarget {
    name: string;
    params?: any;
}

export interface InboxItem {
    id: string;
    kind: InboxNotificationKind;
    title: string;
    body: string;
    createdAt: string;
    readAt: string | null;
    avatarUri?: string;
    groupKey?: string;
    count: number;
    navigationTarget?: InboxNavigationTarget;
}

interface AddInboxItemInput {
    kind: InboxNotificationKind;
    title: string;
    body: string;
    avatarUri?: string;
    groupKey?: string;
    navigationTarget?: InboxNavigationTarget;
}

interface InboxState {
    items: InboxItem[];
    hydrated: boolean;
    hydrate: () => Promise<void>;
    addNotification: (input: AddInboxItemInput) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAsUnread: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    removeNotification: (id: string) => Promise<void>;
    clearRead: () => Promise<void>;
    unreadCount: () => number;
}

const sortNewestFirst = (items: InboxItem[]) =>
    [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const trimItems = (items: InboxItem[]) => {
    const now = Date.now();

    const retained = sortNewestFirst(items).filter((item) => {
        if (!item.readAt) return true;

        const age = now - new Date(item.createdAt).getTime();
        const retention = item.kind === 'critical' || item.kind === 'warning'
            ? ALERT_RETENTION_MS
            : READ_RETENTION_MS;

        return age <= retention;
    });

    if (retained.length <= MAX_ITEMS) {
        return retained;
    }

    const unread = retained.filter((item) => !item.readAt);
    const read = retained.filter((item) => !!item.readAt);
    return [...unread, ...read].slice(0, MAX_ITEMS);
};

const persistItems = async (items: InboxItem[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useInboxStore = create<InboxState>((set, get) => ({
    items: [],
    hydrated: false,

    hydrate: async () => {
        if (get().hydrated) return;

        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            const parsed: InboxItem[] = raw ? JSON.parse(raw) : [];
            set({ items: trimItems(parsed), hydrated: true });
        } catch (error) {
            console.warn('[InboxStore] Failed to hydrate inbox:', error);
            set({ items: [], hydrated: true });
        }
    },

    addNotification: async (input) => {
        let nextItems: InboxItem[] = [];
        const nowIso = new Date().toISOString();

        set((state) => {
            const existingIndex = input.groupKey
                ? state.items.findIndex((item) => item.groupKey === input.groupKey && !item.readAt)
                : -1;

            if (existingIndex >= 0) {
                nextItems = trimItems(state.items.map((item, index) => {
                    if (index !== existingIndex) return item;

                    return {
                        ...item,
                        kind: input.kind,
                        title: input.title,
                        body: input.body,
                        createdAt: nowIso,
                        avatarUri: input.avatarUri ?? item.avatarUri,
                        navigationTarget: input.navigationTarget ?? item.navigationTarget,
                        count: item.count + 1,
                    };
                }));
            } else {
                nextItems = trimItems([
                    {
                        id: makeId(),
                        kind: input.kind,
                        title: input.title,
                        body: input.body,
                        createdAt: nowIso,
                        readAt: null,
                        avatarUri: input.avatarUri,
                        groupKey: input.groupKey,
                        count: 1,
                        navigationTarget: input.navigationTarget,
                    },
                    ...state.items,
                ]);
            }

            return { items: nextItems };
        });

        await persistItems(nextItems);
    },

    markAsRead: async (id) => {
        let nextItems: InboxItem[] = [];
        set((state) => {
            nextItems = trimItems(state.items.map((item) => (
                item.id === id && !item.readAt
                    ? { ...item, readAt: new Date().toISOString() }
                    : item
            )));
            return { items: nextItems };
        });
        await persistItems(nextItems);
    },

    markAsUnread: async (id) => {
        let nextItems: InboxItem[] = [];
        set((state) => {
            nextItems = trimItems(state.items.map((item) => (
                item.id === id ? { ...item, readAt: null } : item
            )));
            return { items: nextItems };
        });
        await persistItems(nextItems);
    },

    markAllAsRead: async () => {
        const readAt = new Date().toISOString();
        let nextItems: InboxItem[] = [];
        set((state) => {
            nextItems = trimItems(state.items.map((item) => (
                item.readAt ? item : { ...item, readAt }
            )));
            return { items: nextItems };
        });
        await persistItems(nextItems);
    },

    removeNotification: async (id) => {
        let nextItems: InboxItem[] = [];
        set((state) => {
            nextItems = state.items.filter((item) => item.id !== id);
            return { items: nextItems };
        });
        await persistItems(nextItems);
    },

    clearRead: async () => {
        let nextItems: InboxItem[] = [];
        set((state) => {
            nextItems = state.items.filter((item) => !item.readAt);
            return { items: nextItems };
        });
        await persistItems(nextItems);
    },

    unreadCount: () => get().items.filter((item) => !item.readAt).length,
}));
