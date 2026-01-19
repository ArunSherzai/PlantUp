import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Image, TouchableOpacity, SafeAreaView, StatusBar, ImageBackground, Modal, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/Root';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6'; // Import FontAwesome6
import FontAwesome from '@expo/vector-icons/FontAwesome';
import DeveloperMenu from '../../../components/DeveloperMenu'; // Import DeveloperMenu
import { useDMStore, Conversation } from '../../../stores/DMStore'; // Import DMStore
import { useUserStore } from '../../../stores/UserStore';
import { db } from '../../../utils/supabase';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getLatestTip, StoredTip } from '../../../utils/tipHistory';

type Props = StackScreenProps<RootStackParamList, 'DirectMessages'>;

// Simple user interface for search
interface SearchUser {
    id: string;
    username: string;
    avatar_path: string | null;
}

export default function DirectMessagesScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const { theme } = useUnistyles();
    const insets = useSafeAreaInsets();
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
            }

            // Note: Subscription is handled globally in UserStore on login
            // so we don't need to subscribe/unsubscribe here.
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
                    // Filter out blocked users
                    const { isBlocked } = useUserStore.getState();
                    const filtered = data.filter(u => !isBlocked(u.id));
                    setSearchResults(filtered);
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


            {/* Header Section */}
            <View style={styles.header}>
                <View style={[styles.headerContent, { paddingTop: insets.top + vh * 10 }]}>
                    <Text style={styles.headerLargeTitle}>Connect with{'\n'}Others!</Text>
                </View>
                {/* Bug Icon for Dev Menu */}
                <TouchableOpacity onPress={() => setShowDevMenu(true)} style={[styles.bugButton, { top: insets.top + vh * 10 }]}>
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

// ... imports
const { width, height } = Dimensions.get('window');
const vw = width / 100;
const vh = height / 100;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: '30%', // Keeps the background image ratio
        position: 'relative',
    },

    headerContent: {
        paddingHorizontal: vw * 5,
        // paddingTop handled inline with insets
    },
    bugButton: {
        position: 'absolute',
        // top handled inline with insets
        right: vw * 5,
        padding: vw * 2,
        zIndex: 10,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: vw * 4.5,
        fontWeight: '600',
        marginBottom: vh * 2,
    },
    headerLargeTitle: {
        color: '#FFF',
        fontSize: vw * 10, // Matching other screens
        fontWeight: '900',
        lineHeight: vw * 11,
    },
    contentContainer: {
        flex: 1,
        borderTopLeftRadius: vw * 8,
        borderTopRightRadius: vw * 8,
        paddingTop: vh * 3,
        paddingHorizontal: vw * 5,
        // Ensure it fills the bottom naturally
    },
    contentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: vh * 2,
        paddingRight: vw * 2
    },
    sectionTitle: {
        fontSize: vw * 6,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
    },
    searchContainer: {
        marginBottom: vh * 2,
    },
    searchInput: {
        height: vh * 6,
        borderRadius: vw * 6,
        paddingHorizontal: vw * 5,
        fontSize: vw * 4,
    },
    listContent: {
        paddingBottom: vh * 5,
    },
    messageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: vh * 2.5,
    },
    avatarContainer: {
        width: vw * 13,
        height: vw * 13,
        borderRadius: (vw * 13) / 2,
        backgroundColor: '#E0E0E0',
        marginRight: vw * 4,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: (vw * 13) / 2,
    },
    messageContent: {
        flex: 1,
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: vh * 0.5,
    },
    name: {
        fontSize: vw * 4,
        fontWeight: '600',
    },
    time: {
        fontSize: vw * 3,
    },
    lastMessage: {
        fontSize: vw * 3.5,
    },
    newChatButton: {
        width: vw * 10,
        height: vw * 10,
        borderRadius: (vw * 10) / 2,
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
        padding: vw * 5
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: vh * 2,
        marginTop: vh * 1
    },
    modalTitle: {
        fontSize: vw * 5.5,
        fontWeight: 'bold'
    },
    modalCloseText: {
        fontSize: vw * 4,
        fontWeight: '600'
    },
    modalSearchContainer: {
        marginBottom: vh * 2
    },
    userResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: vh * 2,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE'
    },
    avatarContainerSmall: {
        width: vw * 10,
        height: vw * 10,
        borderRadius: (vw * 10) / 2,
        backgroundColor: '#E0E0E0',
        overflow: 'hidden',
        marginRight: vw * 3,
    },
    userResultName: {
        fontSize: vw * 4,
        fontWeight: '500'
    },
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: vw * 5,
        height: vw * 5,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    unreadBadgeText: {
        color: '#FFF',
        fontSize: vw * 2.8,
        fontWeight: 'bold',
    },
});
