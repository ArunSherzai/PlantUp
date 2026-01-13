import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Image, TouchableOpacity, SafeAreaView, StatusBar, ImageBackground, Modal, ActivityIndicator, Alert } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/Root';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6'; // Import FontAwesome6
import FontAwesome from '@expo/vector-icons/FontAwesome';
import DeveloperMenu from '../../../components/DeveloperMenu'; // Import DeveloperMenu
import { useDMStore, Conversation } from '../../../stores/DMStore'; // Import DMStore
import { useUserStore } from '../../../stores/UserStore';
import { db } from '../../../utils/supabase';

type Props = StackScreenProps<RootStackParamList, 'DirectMessages'>;

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getLatestTip, StoredTip } from '../../../utils/tipHistory';

// Simple user interface for search
interface SearchUser {
    id: string;
    username: string;
    avatar_path: string | null;
}

export default function DirectMessagesScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const { theme } = useUnistyles();
    const [searchQuery, setSearchQuery] = useState('');
    const [sprigTip, setSprigTip] = useState<StoredTip | null>(null);
    const [showDevMenu, setShowDevMenu] = useState(false); // State for dev menu

    // New Chat Modal State
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Store hooks
    const { conversations, fetchConversations, loading, getOrCreateConversation, subscribeToInbox } = useDMStore();
    const { user } = useUserStore();

    useFocusEffect(
        React.useCallback(() => {
            const fetchTip = async () => {
                const latest = await getLatestTip();
                setSprigTip(latest);
            };
            fetchTip();

            // Fetch real conversations
            if (user) {
                fetchConversations();
                subscribeToInbox();
            }

            return () => {
                const { unsubscribeFromInbox } = useDMStore.getState();
                unsubscribeFromInbox();
            };
        }, [user])
    );

    // Helper to resolve avatar URL
    const getAvatarSource = (path: string | null) => {
        if (!path) return require('../../../../assets/images/pfp2.webp');
        if (path.startsWith('http')) return { uri: path };
        const { data } = db.public.storage.from('avatar').getPublicUrl(path);
        return { uri: data.publicUrl };
    };

    // Search Users Effect
    useEffect(() => {
        const searchUsers = async () => {
            if (!userSearchQuery.trim()) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                // Search by username
                const { data, error } = await db.user
                    .from('Users')
                    .select('id, username, avatar_path')
                    .ilike('username', `%${userSearchQuery}%`)
                    .neq('id', user?.id) // Don't show myself
                    .limit(10);

                if (error) throw error;

                if (data) {
                    setSearchResults(data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsSearching(false);
            }
        };

        const timeout = setTimeout(searchUsers, 500); // Debounce
        return () => clearTimeout(timeout);
    }, [userSearchQuery]);

    const handleUserSelect = async (selectedUser: SearchUser) => {
        setIsSearching(true);
        try {
            const conversationId = await getOrCreateConversation(selectedUser.id);
            if (conversationId) {
                setShowNewChatModal(false);
                setUserSearchQuery('');

                const avatarSource = getAvatarSource(selectedUser.avatar_path);

                navigation.navigate('MessageDetail', {
                    id: conversationId,
                    name: selectedUser.username,
                    avatar: avatarSource,
                });
            } else {
                Alert.alert('Unable to Message', 'You can only message users who follow you back (Mutual Followers).');
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Something went wrong starting the chat.');
        } finally {
            setIsSearching(false);
        }
    };


    const mergedData = React.useMemo(() => {
        // 1. Convert "Sprig" tip to a conversation-like object
        const sprigItem = sprigTip ? {
            id: 'sprig',
            special: true,
            name: 'Sprig',
            lastMessage: sprigTip.message,
            time: new Date(sprigTip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            avatar: require('../../../../assets/images/sprig_idle.png'),
        } : null;

        // 2. Map real conversations to UI format
        const realItems = conversations.map(c => {
            const partner = c.participants[0]; // Assuming 1-on-1
            const name = partner?.username || 'Unknown';
            // Avatar logic: standard object or default placeholder if missing
            // DMStore already resolves the full URL into avatar_path for us
            const avatar = partner?.avatar_path ? { uri: partner.avatar_path } : require('../../../../assets/images/pfp2.webp'); // Fallback

            let timeStr = '';
            if (c.last_message) {
                const d = new Date(c.last_message.created_at);
                const now = new Date();
                if (d.toDateString() === now.toDateString()) {
                    timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else {
                    timeStr = d.toLocaleDateString();
                }
            }

            return {
                id: c.id,
                special: false,
                name: name,
                lastMessage: c.last_message?.content || 'Start chatting!',
                time: timeStr,
                avatar: avatar,
                conversationData: c,
                unreadCount: c.unread_count || 0,
            };
        });

        const list = sprigItem ? [sprigItem, ...realItems] : [...realItems];
        return list;
    }, [sprigTip, conversations]);

    const filteredMessages = mergedData.filter(msg =>
        msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.messageItem}
            onPress={() => {
                if (item.id === 'sprig') {
                    // Navigate to Sprig chat (legacy/special)
                    navigation.navigate('MessageDetail', {
                        id: 'sprig',
                        name: 'Sprig',
                        avatar: item.avatar,
                    });
                } else {
                    // Navigate to Real chat
                    // We pass ID as conversation ID, and partner info
                    navigation.navigate('MessageDetail', {
                        id: item.id, // Conversation ID
                        name: item.name,
                        avatar: item.avatar,
                        // Optionally pass userId if needed to refetch, but convId is enough
                        // We might need partnerId if we strictly used userId before
                    });
                }
            }}
        >
            <View style={styles.avatarContainer}>
                <Image source={item.avatar} style={styles.avatar} resizeMode="cover" />
                {/* Unread Badge */}
                {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                            {item.unreadCount > 99 ? '99+' : item.unreadCount}
                        </Text>
                    </View>
                )}
            </View>
            <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                    <Text style={[styles.name, { color: theme.colors.text, fontWeight: item.unreadCount > 0 ? '700' : '600' }]}>{item.name}</Text>
                    <Text style={[styles.time, { color: theme.colors.greyedOut }]}>{item.time}</Text>
                </View>
                <Text style={[styles.lastMessage, { color: theme.colors.greyedOut, fontWeight: item.unreadCount > 0 ? '600' : '400' }]} numberOfLines={1}>
                    {item.lastMessage}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <ImageBackground
            source={require('../../../../assets/images/dmbackground.png')}
            style={styles.container}
            resizeMode="cover"
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Header Section */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={[styles.headerLargeTitle, { paddingVertical: 70 }]}>Connect with{'\n'}Others!</Text>
                </View>
                {/* Bug Icon for Dev Menu */}
                <TouchableOpacity onPress={() => setShowDevMenu(true)} style={styles.bugButton}>
                    <FontAwesome6 name="bug" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Content Section (White Card) */}
            <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>
                <View style={styles.contentHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Messages</Text>

                    {/* Add New Chat Button */}
                    <TouchableOpacity
                        style={[styles.newChatButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => setShowNewChatModal(true)}
                    >
                        <FontAwesome name="plus" size={20} color="#FFF" />
                    </TouchableOpacity>

                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={[styles.searchInput, { backgroundColor: '#F0F0F0', color: '#000' }]}
                        placeholder="Search messages..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Message List */}
                <FlatList
                    data={filteredMessages}
                    extraData={conversations} // added to ensure re-render on store update
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshing={loading}
                    onRefresh={fetchConversations}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Text style={{ color: theme.colors.greyedOut }}>No messages yet.</Text>
                        </View>
                    }
                />
            </View>

            {/* New Chat Modal */}
            <Modal
                visible={showNewChatModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowNewChatModal(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>New Message</Text>
                        <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
                            <Text style={[styles.modalCloseText, { color: theme.colors.primary }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalSearchContainer}>
                        <Text style={{ marginBottom: 5, color: theme.colors.greyedOut }}>Search for a mutual follower:</Text>
                        <TextInput
                            style={[styles.searchInput, { backgroundColor: '#F0F0F0', color: '#000' }]}
                            placeholder="Type a username..."
                            placeholderTextColor="#999"
                            autoFocus
                            value={userSearchQuery}
                            onChangeText={setUserSearchQuery}
                        />
                    </View>

                    {isSearching ? <ActivityIndicator size="large" style={{ marginTop: 20 }} /> : (
                        <FlatList
                            data={searchResults}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.userResultItem} onPress={() => handleUserSelect(item)}>
                                    <View style={styles.avatarContainerSmall}>
                                        <Image
                                            source={getAvatarSource(item.avatar_path)}
                                            style={styles.avatar}
                                        />
                                    </View>
                                    <Text style={[styles.userResultName, { color: theme.colors.text }]}>{item.username}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                userSearchQuery.length > 0 ? (
                                    <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>No users found.</Text>
                                ) : null
                            }
                        />
                    )}
                </View>
            </Modal>

            <DeveloperMenu visible={showDevMenu} onClose={() => setShowDevMenu(false)} />

        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: '35%',
        position: 'relative',
    },

    headerContent: {
        paddingHorizontal: 20,
        paddingTop: 60, // Adjust for status bar
    },
    bugButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        padding: 10,
        zIndex: 10,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
    },
    headerLargeTitle: {
        color: '#FFF',
        fontSize: 42,
        fontWeight: 'bold',
        lineHeight: 48,
    },
    contentContainer: {
        flex: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 30,
        paddingHorizontal: 20,
    },
    contentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingRight: 10
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
    },
    searchContainer: {
        marginBottom: 20,
    },
    searchInput: {
        height: 50,
        borderRadius: 25,
        paddingHorizontal: 20,
        fontSize: 16,
    },
    listContent: {
        paddingBottom: 20,
    },
    messageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E0E0E0',
        marginRight: 15,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
    },
    messageContent: {
        flex: 1,
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
    },
    time: {
        fontSize: 12,
    },
    lastMessage: {
        fontSize: 14,
    },
    newChatButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4
    },
    modalContainer: {
        flex: 1,
        padding: 20
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold'
    },
    modalCloseText: {
        fontSize: 16,
        fontWeight: '600'
    },
    modalSearchContainer: {
        marginBottom: 10
    },
    userResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE'
    },
    avatarContainerSmall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E0E0E0',
        overflow: 'hidden',
        marginRight: 12,
    },
    userResultName: {
        fontSize: 16,
        fontWeight: '500'
    },
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    unreadBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
});
