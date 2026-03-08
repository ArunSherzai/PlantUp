import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Image, TouchableOpacity, SafeAreaView, StatusBar, ImageBackground, Modal, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useUnistyles } from 'react-native-unistyles';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/Root';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import DeveloperMenu from '../../../components/DeveloperMenu';
import { useDMStore, Conversation } from '../../../stores/DMStore';
import { useUserStore } from '../../../stores/UserStore';
import { useMentorStore, Mentor } from '../../../stores/MentorStore';
import { useTutorialStore } from '../../../stores/TutorialStore';
import { db } from '../../../utils/supabase';
import { playSound } from '~/utils/SoundManager';
import { getAvatarSource } from '../../../utils/avatarUtils';
import MentorBadge from '../../../components/MentorBadge';

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
    const [mentorSearchQuery, setMentorSearchQuery] = useState('');
    const [sprigTip, setSprigTip] = useState<StoredTip | null>(null);
    const [showDevMenu, setShowDevMenu] = useState(false);
    const [activeTab, setActiveTab] = useState<'messages' | 'mentors'>('messages');

    // New Chat Modal State
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Store hooks
    const { conversations, fetchConversations, loading, getOrCreateConversation, subscribeToInbox } = useDMStore();
    const { mentors, fetchMentors, sendRequest, outgoingRequests, incomingRequests, fetchIncomingRequests, fetchOutgoingRequests, getRequestStatus, loading: mentorLoading, acceptRequest, rejectRequest } = useMentorStore();
    const { user, profile } = useUserStore();
    const { startTutorial } = useTutorialStore();

    // Border map: userId -> border URL
    const [borderMap, setBorderMap] = useState<Record<string, string>>({});

    // Fetch borders for all conversation partners
    useEffect(() => {
        const fetchBorders = async () => {
            const partnerIds = conversations
                .map(c => c.participants?.[0]?.user_id)
                .filter((id): id is string => !!id);
            if (partnerIds.length === 0) return;

            try {
                const { data: refs } = await db.gamification
                    .from('User_owned_border')
                    .select('user_id, border_id')
                    .in('user_id', partnerIds)
                    .eq('is_equipped', true);
                if (!refs || refs.length === 0) return;

                const borderIds = refs.map(r => r.border_id).filter(Boolean);
                const { data: borders } = await db.gamification
                    .from('Cosmetic_avatar_borders')
                    .select('id, media_url')
                    .in('id', borderIds);
                if (!borders) return;

                const borderById: Record<string, string> = {};
                borders.forEach(b => { if (b.media_url) borderById[b.id] = b.media_url; });

                const newMap: Record<string, string> = {};
                refs.forEach(r => {
                    let url = borderById[r.border_id];
                    if (!url) return;
                    if (url.includes('seasonal_summer') || url.includes('seasonal_winter')) {
                        url = url.replace('seasonal_summer', 'seasonal').replace('seasonal_winter', 'seasonal');
                    }
                    if (!url.startsWith('http')) {
                        const { data: urlData } = db.public.storage.from('border-skins').getPublicUrl(url);
                        newMap[r.user_id] = urlData.publicUrl;
                    } else {
                        newMap[r.user_id] = url;
                    }
                });
                setBorderMap(newMap);
            } catch (e) {
                console.warn('[DM Overview] Border fetch failed:', e);
            }
        };
        fetchBorders();
    }, [conversations]);

    // Helper: compute border overlay style for a given avatar size
    const getBorderStyle = useCallback((avatarSize: number, borderUrl: string) => {
        let scale = 1.6;
        let topShift = 0;
        let leftShift = 0;

        if (borderUrl.includes('lightning')) {
            scale = 2.65;
            topShift = avatarSize * -0.01;
            leftShift = avatarSize * -0.01;
        } else if (borderUrl.includes('.gif')) {
            scale = 2.45;
        }

        const borderSize = avatarSize * scale;
        const offset = (borderSize - avatarSize) / 2;

        return {
            position: 'absolute' as const,
            width: borderSize,
            height: borderSize,
            top: -offset + topShift,
            left: -offset + leftShift,
        };
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            const fetchTip = async () => {
                const latest = await getLatestTip();
                setSprigTip(latest);
            };
            fetchTip();

            if (user) {
                fetchConversations();
                subscribeToInbox(); // Safety check: ensure we are listening
                fetchMentors();
                fetchOutgoingRequests();
                fetchIncomingRequests();
            }

            // --- TUTORIAL TRIGGER ---
            if (profile && profile.tutorial_progress) {
                setTimeout(() => {
                    if (!profile.tutorial_progress['chat_tutorial']) {
                        startTutorial('chat_tutorial');
                    }
                }, 500);
            }

            // Note: Subscription is handled globally in UserStore on login
            // so we don't need to subscribe/unsubscribe here.
        }, [user, profile, startTutorial])
    );

    // Helper to handle mentor request
    const handleMentorRequest = async (mentorId: string) => {
        const success = await sendRequest(mentorId);
        if (success) {
            Alert.alert('Request Sent', 'Your mentorship request has been sent!');
        } else {
            Alert.alert('Request Failed', 'Unable to send request. You may have already sent one.');
        }
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
                    userId: selectedUser.id,
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
        // 1. "Sprig" appears always as a virtual conversation at the top.
        //    If we have a latest tip, use it as preview, otherwise show a generic subtitle.
        const sprigItem = {
            id: 'sprig',
            special: true,
            name: 'Sprig',
            lastMessage: sprigTip?.message || 'Your friendly plant mentor',
            time: sprigTip
                ? new Date(sprigTip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '',
            avatar: require('../../../../assets/images/sprig_idle.png'),
        };

        // 2. Map real conversations to UI format
        const realItems = conversations.map(c => {
            const partner = c.participants[0]; // Assuming 1-on-1
            const name = partner?.username || 'Unknown';
            // Avatar logic: standard object or default placeholder if missing
            // DMStore already resolves the full URL into avatar_path for us
            const avatar = getAvatarSource(partner?.avatar_path);

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

        return [sprigItem, ...realItems];
    }, [sprigTip, conversations]);

    const filteredMessages = mergedData.filter(msg =>
        msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredMentors = mentors.filter(mentor =>
        mentor.username.toLowerCase().includes(mentorSearchQuery.toLowerCase())
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
                        userId: item.conversationData?.participants?.[0]?.user_id,
                    });
                }
            }}
        >
            <View style={styles.avatarContainer}>
                <Image source={item.avatar} style={styles.avatar} resizeMode="cover" />
                {(() => {
                    const partnerId = item.conversationData?.participants?.[0]?.user_id;
                    const bUrl = partnerId ? borderMap[partnerId] : null;
                    if (!bUrl) return null;
                    return (
                        <ExpoImage
                            source={{ uri: bUrl }}
                            style={getBorderStyle(vw * 13, bUrl)}
                            contentFit="contain"
                            pointerEvents="none"
                        />
                    );
                })()}
                {/* Unread Badge */}
                {item.unreadCount > 0 && (
                    <View style={[styles.unreadBadge, { zIndex: 10 }]}>
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
                {/* Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
                        onPress={() => setActiveTab('messages')}
                    >
                        <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>Messages</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'mentors' && styles.activeTab]}
                        onPress={() => setActiveTab('mentors')}
                    >
                        <Text style={[styles.tabText, activeTab === 'mentors' && styles.activeTabText]}>Mentors</Text>
                        <FontAwesome6 name="seedling" size={14} color={activeTab === 'mentors' ? '#4CAF50' : '#999'} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                </View>

                {activeTab === 'messages' ? (
                    <>
                        <View style={styles.contentHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Messages</Text>
                            <TouchableOpacity
                                style={[styles.newChatButton, { backgroundColor: theme.colors.primary }]}
                                onPress={() => setShowNewChatModal(true)}
                            >
                                <FontAwesome name="plus" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <TextInput
                                style={[styles.searchInput, { backgroundColor: '#F0F0F0', color: '#000' }]}
                                placeholder="Search messages..."
                                placeholderTextColor="#999"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        <FlatList
                            data={filteredMessages}
                            extraData={conversations}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.listContent}
                            refreshing={loading}
                            onRefresh={async () => {
                                await fetchConversations();
                                playSound('reload');
                            }}
                            ListEmptyComponent={
                                <View style={{ alignItems: 'center', marginTop: 50 }}>
                                    <Text style={{ color: theme.colors.greyedOut }}>No messages yet.</Text>
                                </View>
                            }
                        />
                    </>
                ) : (
                    <>
                        <View style={styles.contentHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Mentors</Text>
                        </View>

                        <View style={styles.searchContainer}>
                            <TextInput
                                style={[styles.searchInput, { backgroundColor: '#F0F0F0', color: '#000' }]}
                                placeholder="Search mentors..."
                                placeholderTextColor="#999"
                                value={mentorSearchQuery}
                                onChangeText={setMentorSearchQuery}
                            />
                        </View>

                        <FlatList
                            data={filteredMentors}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.listContent}
                            refreshing={mentorLoading}
                            onRefresh={async () => {
                                await fetchMentors();
                                await fetchOutgoingRequests();
                                await fetchIncomingRequests();
                                playSound('reload');
                            }}
                            ListHeaderComponent={
                                incomingRequests && incomingRequests.some(r => r.status === 'pending') ? (
                                    <View style={{ marginBottom: 20 }}>
                                        <Text style={[styles.subsectionTitle, { color: theme.colors.text, marginBottom: 10 }]}>Pending Requests</Text>
                                        {incomingRequests.filter(r => r.status === 'pending').map(request => (
                                            <View key={request.id} style={styles.mentorItem}>
                                                <View style={styles.avatarContainer}>
                                                    <Image source={getAvatarSource(request.sender_avatar_path)} style={styles.avatar} resizeMode="cover" />
                                                </View>
                                                <View style={styles.mentorContent}>
                                                    <Text style={[styles.name, { color: theme.colors.text }]}>{request.sender_username || 'A User'}</Text>
                                                    <Text style={[styles.mentorLevel, { color: theme.colors.greyedOut }]}>wants you as a mentor</Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={[styles.requestButton, styles.acceptedButton, { marginRight: 8 }]}
                                                    onPress={async () => {
                                                        const success = await acceptRequest(request.id);
                                                        if (success) {
                                                            Alert.alert('Accepted', 'You are now mutual followers!');
                                                        }
                                                    }}
                                                >
                                                    <Text style={styles.acceptedButtonText}>Accept</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.requestButton, styles.rejectedButton]}
                                                    onPress={() => rejectRequest(request.id)}
                                                >
                                                    <Text style={styles.rejectedButtonText}>Decline</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                ) : null
                            }
                            renderItem={({ item }: { item: Mentor }) => {
                                const status = getRequestStatus(item.id);
                                return (
                                    <View style={styles.mentorItem}>
                                        <View style={styles.avatarContainer}>
                                            <Image source={getAvatarSource(item.avatar_path)} style={styles.avatar} resizeMode="cover" />
                                        </View>
                                        <View style={styles.mentorContent}>
                                            <View style={styles.mentorHeader}>
                                                <Text style={[styles.name, { color: theme.colors.text }]}>{item.username}</Text>
                                                <MentorBadge size="small" />
                                            </View>
                                            <Text style={[styles.mentorLevel, { color: theme.colors.greyedOut }]}>Level {item.level} • {item.post_count} posts</Text>
                                        </View>
                                        {status === 'none' ? (
                                            <TouchableOpacity
                                                style={[styles.requestButton, { backgroundColor: theme.colors.primary }]}
                                                onPress={() => handleMentorRequest(item.id)}
                                            >
                                                <Text style={styles.requestButtonText}>Request</Text>
                                            </TouchableOpacity>
                                        ) : status === 'pending' ? (
                                            <View style={[styles.requestButton, styles.pendingButton]}>
                                                <Text style={styles.pendingButtonText}>Pending</Text>
                                            </View>
                                        ) : status === 'accepted' ? (
                                            <TouchableOpacity
                                                style={[styles.requestButton, styles.acceptedButton]}
                                                onPress={async () => {
                                                    const convId = await getOrCreateConversation(item.id);
                                                    if (convId) {
                                                        navigation.navigate('MessageDetail', {
                                                            id: convId,
                                                            name: item.username,
                                                            avatar: getAvatarSource(item.avatar_path),
                                                            userId: item.id,
                                                        });
                                                    }
                                                }}
                                            >
                                                <Text style={styles.acceptedButtonText}>Chat</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={[styles.requestButton, styles.rejectedButton]}>
                                                <Text style={styles.rejectedButtonText}>Declined</Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={{ alignItems: 'center', marginTop: 50 }}>
                                    <Text style={{ color: theme.colors.greyedOut }}>No mentors available yet.</Text>
                                    <Text style={[{ color: theme.colors.greyedOut, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 }]}>
                                        Mentors are users with level 25+ and 5+ posts.
                                    </Text>
                                </View>
                            }
                        />
                    </>
                )}
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
        // Removed paddingHorizontal: vw * 5 to allow border overflow
        // Ensure it fills the bottom naturally
    },
    contentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: vh * 2,
        paddingHorizontal: vw * 5,
        paddingRight: vw * 7, // Extra padding since we removed it from parent
    },
    sectionTitle: {
        fontSize: vw * 6,
        fontWeight: 'bold',
    },
    subsectionTitle: {
        fontSize: vw * 4.5,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
    },
    searchContainer: {
        marginBottom: vh * 2,
        paddingHorizontal: vw * 5,
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
        paddingHorizontal: vw * 5,
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
    // Tab Switcher Styles
    tabContainer: {
        flexDirection: 'row',
        marginBottom: vh * 2,
        backgroundColor: '#F0F0F0',
        borderRadius: vw * 6,
        padding: 4,
        marginHorizontal: vw * 5,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: vh * 1.2,
        borderRadius: vw * 5,
    },
    activeTab: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: vw * 3.8,
        fontWeight: '500',
        color: '#999',
    },
    activeTabText: {
        color: '#333',
        fontWeight: '600',
    },
    // Mentor List Styles
    mentorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: vh * 2.5,
        paddingHorizontal: vw * 5,
        paddingVertical: vh * 1,
    },
    mentorContent: {
        flex: 1,
    },
    mentorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    mentorLevel: {
        fontSize: vw * 3.2,
    },
    requestButton: {
        paddingHorizontal: vw * 4,
        paddingVertical: vh * 1,
        borderRadius: vw * 4,
        marginLeft: vw * 2,
    },
    requestButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: vw * 3.2,
    },
    pendingButton: {
        backgroundColor: '#FFC107',
    },
    pendingButtonText: {
        color: '#333',
        fontWeight: '600',
        fontSize: vw * 3.2,
    },
    acceptedButton: {
        backgroundColor: '#4CAF50',
    },
    acceptedButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: vw * 3.2,
    },
    rejectedButton: {
        backgroundColor: '#E0E0E0',
    },
    rejectedButtonText: {
        color: '#666',
        fontWeight: '500',
        fontSize: vw * 3.2,
    },
});
