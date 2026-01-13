import { create } from 'zustand';

interface MessageNotificationData {
    senderName: string;
    content: string;
    avatar?: any;
    conversationId?: string;
}

interface MessageNotificationStore {
    notification: MessageNotificationData | null;
    showNotification: (data: MessageNotificationData) => void;
    hideNotification: () => void;
}

export const useMessageNotificationStore = create<MessageNotificationStore>((set) => ({
    notification: null,
    showNotification: (data) => set({ notification: data }),
    hideNotification: () => set({ notification: null }),
}));
