import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image, StatusBar, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/Root';
import { getTipHistory, StoredTip } from '../../../utils/tipHistory';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useDMStore, ChatMessage } from '../../../stores/DMStore';
import { useUserStore } from '../../../stores/UserStore';
import { initializeSounds, unloadSounds } from '../../../utils/soundEffects';
import { useTypingIndicator } from '../../../hooks/useTypingIndicator';
import { TypingIndicator } from '../../../components/TypingIndicator';

type Props = StackScreenProps<RootStackParamList, 'MessageDetail'>;

interface UIMessage {
    id: string;
    text: string;
    sender: 'me' | 'other';
    timestamp: number;
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MessageDetailScreen({ route, navigation }: Props) {
    const { id, name, avatar } = route.params;
    const { theme } = useUnistyles();
    const insets = useSafeAreaInsets(); // Hook
    const [inputText, setInputText] = useState('');
    const [uiMessages, setUiMessages] = useState<UIMessage[]>([]);
    const [loadingMore, setLoadingMore] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // Store hooks
    const {
        messages,
        fetchMessages,
        sendMessage,
        subscribeToConversation,
        unsubscribeFromConversation,
        markAsRead,
        loading
    } = useDMStore();
    const { user } = useUserStore();

    // ID param: If 'sprig', it's the bot. If UUID, it's a conversation ID.
    const isSprig = id === 'sprig';

    // Typing indicator (only for real chats, not sprig)
    const { isOtherUserTyping, startTyping, stopTyping } = useTypingIndicator({
        conversationId: id,
        currentUserId: user?.id || '',
        enabled: !isSprig && !!user?.id,
    });

    // Initialize sounds on mount
    useEffect(() => {
        initializeSounds();

        return () => {
            unloadSounds();
        };
    }, []);

    useEffect(() => {
        if (isSprig) {
            loadSprigMessages();
        } else {
            // Real Chat: Initial Load (Offset 0)
            loadRealMessages(0);
            subscribeToConversation(id);
            markAsRead(id);

            return () => {
                unsubscribeFromConversation(id);
            };
        }
    }, [id]);

    // Sync store messages to UI
    useEffect(() => {
        if (!isSprig && messages[id]) {
            const storeMsgs = messages[id];
            // Store is now "Newest First", and Inverted List wants "Newest First" (item[0] is bottom).
            // So we directly map.
            const formatted: UIMessage[] = storeMsgs.map(m => ({
                id: m.id,
                text: m.content,
                sender: m.sender_id === user?.id ? 'me' : 'other',
                timestamp: new Date(m.created_at).getTime()
            }));
            setUiMessages(formatted);
        }
    }, [messages[id], user]);

    const loadRealMessages = async (offset = 0) => {
        if (offset > 0) setLoadingMore(true);
        await fetchMessages(id, offset);
        if (offset > 0) setLoadingMore(false);
    };

    const loadMoreMessages = () => {
        if (loading || loadingMore || isSprig) return;
        const currentCount = messages[id]?.length || 0;
        if (currentCount >= 15) { // Only fetch more if we have at least one page
            console.log('Loading more messages, offset:', currentCount);
            loadRealMessages(currentCount);
        }
    };

    const loadSprigMessages = async () => {
        const history = await getTipHistory();

        // Sprig tips... dedupe
        const uniqueMessagesMap = new Map();
        history.forEach((tip: StoredTip) => {
            if (!uniqueMessagesMap.has(tip.message)) {
                uniqueMessagesMap.set(tip.message, tip);
            } else {
                const existing = uniqueMessagesMap.get(tip.message);
                if (tip.timestamp > existing.timestamp) {
                    uniqueMessagesMap.set(tip.message, tip);
                }
            }
        });

        const uniqueHistory = Array.from(uniqueMessagesMap.values());

        const formattedMessages: UIMessage[] = uniqueHistory.map((tip: StoredTip) => ({
            id: tip.id,
            text: tip.message,
            sender: 'other',
            timestamp: tip.timestamp,
        }));

        // Sort by timestamp descending (Newest First) for inverted list
        formattedMessages.sort((a, b) => b.timestamp - a.timestamp);
        setUiMessages(formattedMessages);
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const textToSend = inputText;
        setInputText(''); // Clear immediately for UX
        stopTyping(); // Clear typing indicator when sending

        if (isSprig) {
            // Echo or mock response? For now just local visible
            const newMessage: UIMessage = {
                id: Date.now().toString(),
                text: textToSend,
                sender: 'me',
                timestamp: Date.now(),
            };
            setUiMessages((prev) => [newMessage, ...prev]);
        } else {
            // Real Send: Store handles optimistic update via subscription usually, 
            // but we can rely on immediate append in store if we wanted.
            // For now, sendMessage just inserts, and subscription event adds to list.
            const success = await sendMessage(id, textToSend);
            if (!success) {
                alert('Failed to send message');
                setInputText(textToSend);
            }
        }
    };

    const getDayLabel = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === now.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString();
        }
    };

    const renderItem = ({ item, index }: { item: UIMessage, index: number }) => {
        const isMe = item.sender === 'me';

        // Date Header Logic for Inverted List:
        // Render header if the *next* item (visually above, array index + 1) has a different day.
        // OR if this is the last item in the array (topmost visually).
        let showDateHeader = false;
        const nextItem = uiMessages[index + 1]; // "Older" message

        if (!nextItem) {
            // Top of the list (oldest loaded) - Always show date
            showDateHeader = true;
        } else {
            const currentLabel = getDayLabel(item.timestamp);
            const prevLabel = getDayLabel(nextItem.timestamp);
            if (currentLabel !== prevLabel) {
                showDateHeader = true;
            }
        }

        const timeString = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // In inverted list, render order is bottom-up. 
        // We usually want Date Header ABOVE the message group.
        // But since we render Item, then Next Item... 
        // If we attach header to `item`, it appears at `item` position.
        // Inverted: [Newest (Index 0), ..., Oldest (Index N)]
        // Visually:
        // [Index N (Oldest)]  <-- Render Header Here?
        // [Index N-1]
        // ...
        // [Index 0 (Newest)]

        // If showDateHeader is true, we want to render it AFTER the bubble (which is visually "above" because inverted).
        // Wait, native column-reverse... 
        // Inverted FlatList renders items from bottom up. 
        // component 0 (bottom)
        // component 1 (above 0)

        // So strict structure:
        // <View>
        //    {showDateHeader && <Header style={{marginBottom: 20}}/>}  <-- This would put it visually BELOW the bubble? 
        //    No, in DOM flow: Top -> Bottom.
        //    Inverted list just flips the scroll container. The items themselves are normal Views.
        //    So <View><Text>Header</Text><Bubble/></View> 
        //    Will render Header ABOVE Bubble. 
        //    Which is what we want.

        return (
            <View>
                {showDateHeader && (
                    <View style={styles.dateHeaderContainer}>
                        <Text style={styles.dateHeaderText}>{getDayLabel(item.timestamp)}</Text>
                    </View>
                )}

                <View style={[styles.messageBubbleContainer, isMe ? styles.myMessageContainer : styles.otherMessageContainer]}>
                    {!isMe && (
                        <Image source={avatar} style={styles.avatarSmall} />
                    )}
                    <View style={[
                        styles.messageBubble,
                        isMe ? { backgroundColor: theme.colors.primary } : { backgroundColor: '#E5E5EA' }
                    ]}>
                        <Text style={[
                            styles.messageText,
                            isMe ? { color: '#FFF' } : { color: '#000' }
                        ]}>
                            {item.text}
                        </Text>
                        <Text style={[
                            styles.timestampText,
                            isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: 'rgba(0,0,0,0.5)' }
                        ]}>
                            {timeString}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>


            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome name="angle-left" size={30} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Image source={avatar} style={styles.headerAvatar} />
                    <Text style={[styles.headerName, { color: theme.colors.text }]}>{name}</Text>
                </View>
                <View style={{ width: 30 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
            >
                {/* Chat List */}
                <FlatList
                    ref={flatListRef}
                    data={uiMessages}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    inverted={true}
                    contentContainerStyle={styles.listContent}
                    onEndReached={loadMoreMessages}
                    onEndReachedThreshold={0.2}
                    ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 10 }} /> : null}
                    keyboardShouldPersistTaps="handled"
                />

                {/* Typing Indicator */}
                {!isSprig && <TypingIndicator visible={isOtherUserTyping} avatar={avatar} />}

                {/* Input Area */}
                <View style={[styles.inputContainer, { borderTopColor: 'transparent', marginBottom: insets.bottom + 10 }]}>
                    <TextInput
                        style={[styles.input, { backgroundColor: '#F0F0F0', color: '#000', borderRadius: 15, height: 60, fontSize: 16, paddingVertical: 10, paddingHorizontal: 15 }]}
                        placeholder="Type a message..."
                        placeholderTextColor="#999"
                        value={inputText}
                        onChangeText={(text) => {
                            setInputText(text);
                            if (text.trim() && !isSprig) {
                                startTyping();
                            } else if (!text.trim()) {
                                stopTyping();
                            }
                        }}
                        multiline={false}
                        textAlignVertical="center"
                    />
                    <TouchableOpacity onPress={handleSend} style={[styles.sendButton, { backgroundColor: theme.colors.primary, borderRadius: 15, height: 60, width: 60, justifyContent: 'center', alignItems: 'center' }]}>
                        <FontAwesome name="paper-plane" size={16} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backButton: {
        padding: 5,
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatar: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        marginRight: 10,
    },
    headerName: {
        fontSize: 18,
        fontWeight: '600',
    },
    listContent: {
        padding: 15,
        paddingBottom: 20,
    },
    dateHeaderContainer: {
        alignItems: 'center',
        marginVertical: 10,
    },
    dateHeaderText: {
        fontSize: 12,
        color: '#999',
        fontWeight: '600',
    },
    messageBubbleContainer: {
        flexDirection: 'row',
        marginBottom: 10,
        alignItems: 'flex-end',
    },
    myMessageContainer: {
        justifyContent: 'flex-end',
    },
    otherMessageContainer: {
        justifyContent: 'flex-start',
    },
    avatarSmall: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: 8,
    },
    messageBubble: {
        padding: 10,
        borderRadius: 20,
        maxWidth: '75%',
    },
    messageText: {
        fontSize: 16,
    },
    timestampText: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 15,
        marginRight: 10,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
