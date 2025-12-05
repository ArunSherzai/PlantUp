import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image, StatusBar, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/Root';
import { getTipHistory, StoredTip } from '../../../utils/tipHistory';
import FontAwesome from '@expo/vector-icons/FontAwesome';

type Props = StackScreenProps<RootStackParamList, 'MessageDetail'>;

interface ChatMessage {
    id: string;
    text: string;
    sender: 'me' | 'other';
    timestamp: number;
}

export default function MessageDetailScreen({ route, navigation }: Props) {
    const { id, name, avatar } = route.params;
    const { theme } = useUnistyles();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        loadMessages();
    }, [id]);

    const loadMessages = async () => {
        if (id === 'sprig') {
            const history = await getTipHistory();

            // Deduplicate messages (keep latest)
            const uniqueMessagesMap = new Map();
            history.forEach((tip: StoredTip) => {
                if (!uniqueMessagesMap.has(tip.message)) {
                    uniqueMessagesMap.set(tip.message, tip);
                } else {
                    // If duplicate, keep the one with later timestamp
                    const existing = uniqueMessagesMap.get(tip.message);
                    if (tip.timestamp > existing.timestamp) {
                        uniqueMessagesMap.set(tip.message, tip);
                    }
                }
            });

            const uniqueHistory = Array.from(uniqueMessagesMap.values());

            const formattedMessages: ChatMessage[] = uniqueHistory.map((tip: StoredTip) => ({
                id: tip.id,
                text: tip.message,
                sender: 'other',
                timestamp: tip.timestamp,
            }));

            // Sort by timestamp ascending
            formattedMessages.sort((a, b) => a.timestamp - b.timestamp);
            setMessages(formattedMessages);
        } else {
            // Mock messages for other users
            setMessages([
                { id: '1', text: 'Hey, how are you?', sender: 'other', timestamp: Date.now() - 100000 },
                { id: '2', text: 'I am good, thanks! How about you?', sender: 'me', timestamp: Date.now() - 90000 },
                { id: '3', text: 'Doing great. Just checking on your plants.', sender: 'other', timestamp: Date.now() - 80000 },
            ]);
        }
    };

    const sendMessage = () => {
        if (!inputText.trim()) return;

        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            text: inputText,
            sender: 'me',
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, newMessage]);
        setInputText('');

        // Scroll to bottom
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
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

    const renderItem = ({ item, index }: { item: ChatMessage, index: number }) => {
        const isMe = item.sender === 'me';

        // Check if we need a date header
        let showDateHeader = false;
        if (index === 0) {
            showDateHeader = true;
        } else {
            const prevItem = messages[index - 1];
            const prevLabel = getDayLabel(prevItem.timestamp);
            const currentLabel = getDayLabel(item.timestamp);
            if (prevLabel !== currentLabel) {
                showDateHeader = true;
            }
        }

        const timeString = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome name="angle-left" size={30} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Image source={avatar} style={styles.headerAvatar} />
                    <Text style={[styles.headerName, { color: theme.colors.text }]}>{name}</Text>
                </View>
                <View style={{ width: 30 }} />
            </View>

            {/* Chat List */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />

            {/* Input Area */}
            <KeyboardAvoidingView style={{ marginBottom: 10 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={10}>
                <View style={[styles.inputContainer, { borderTopColor: 'transparent' }]}>
                    <TextInput
                        style={[styles.input, { backgroundColor: '#F0F0F0', color: '#000', borderRadius: 15, height: 60, fontSize: 16 }]}
                        placeholder="Type a message..."
                        placeholderTextColor="#999"
                        value={inputText}
                        onChangeText={setInputText}
                    />
                    <TouchableOpacity onPress={sendMessage} style={[styles.sendButton, { backgroundColor: theme.colors.primary, borderRadius: 15, height: 60, width: 60, justifyContent: 'center', alignItems: 'center' }]}>
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
        paddingVertical: 10,
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
