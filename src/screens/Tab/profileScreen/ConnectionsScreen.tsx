import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Image, Dimensions, useWindowDimensions, StatusBar } from 'react-native';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/Root';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { LinearGradient } from 'expo-linear-gradient';
import { useConnections } from '../../../features/social/hooks/useConnections';
import { useUserStore } from '../../../stores/UserStore';

type ConnectionsRouteProp = RouteProp<RootStackParamList, 'Connections'>;
type ConnectionsNavigationProp = StackNavigationProp<RootStackParamList>;

type UserConnection = {
    id: string;
    name: string;
    username: string;
    bio: string;
    avatar: any; // Using any for require() images
    status: 'following' | 'not_following' | 'friends'; // friends = mutual
};

// MOCK DATA REMOVED

const { width } = Dimensions.get('window');

const styles = StyleSheet.create((theme: any) => ({
    container: {
        flex: 1,
        backgroundColor: '#0FA565',
    },
    headerArea: {
        height: 160,
        width: '100%',
        position: 'relative',
    },
    headerImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    headerContent: {
        marginTop: 60,
        paddingHorizontal: 20,
    },
    backButton: {
        marginBottom: 5,
    },
    headerTitle: {
        fontSize: 40,
        fontWeight: '900',
        color: '#FFF',
        includeFontPadding: false,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    contentCard: {
        flex: 1,
        backgroundColor: '#F5F5F7',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -20,
        paddingTop: 25,
        paddingHorizontal: 20,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
        borderRadius: 25,
        paddingHorizontal: 15,
        height: 50,
        marginBottom: 20,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        height: '100%',
    },
    tabContainer: {
        flexDirection: 'row',
        // backgroundColor handled inline or via dynamic style if needed
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
        alignSelf: 'center',
        width: '90%',
        justifyContent: 'space-between',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTabButton: {
        // Dynamic
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    activeTabText: {
        color: '#FFF',
    },
    listContent: {
        paddingBottom: 40,
    },
    userItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#FFF',
        marginBottom: 10,
        borderRadius: 16,
        paddingHorizontal: 15,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    userInfoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#CCC',
        marginRight: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    userBio: {
        fontSize: 13,
        color: '#777',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    removeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FF6B6B',
        marginRight: 8,
    },
    removeButtonText: {
        color: '#FF6B6B',
        fontSize: 12,
        fontWeight: '600',
    },
    mainButton: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        minWidth: 90,
        alignItems: 'center',
    },
    mainButtonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    // Helpers
    headerContainer: {},
    headerBackground: {},
})) as any;



// ... (keep styles) 

import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ... (keep imports)

export default function ConnectionsScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation<any>();
    const route = useRoute<ConnectionsRouteProp>();
    const insets = useSafeAreaInsets();
    // Get params
    const { initialTab, userId } = route.params || {};

    const layout = useWindowDimensions();
    const [index, setIndex] = useState(0);

    const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab || 'following');
    const [searchQuery, setSearchQuery] = useState('');

    // Real Data Hook
    const { user } = useUserStore();
    const { followers, following, loading, refreshConnections, followUser, unfollowUser } = useConnections(userId);

    const isOwner = !userId || userId === user?.id;

    // Transform data for UI
    const getStatus = (userId: string, isFollowerTab: boolean): 'following' | 'not_following' | 'friends' => {
        const isFollowing = following.some(u => u.id === userId);
        const isFollower = followers.some(u => u.id === userId);

        if (isFollowing && isFollower) return 'friends';
        if (isFollowing) return 'following';
        return 'not_following';
    };

    const data = activeTab === 'followers'
        ? followers.map(u => ({
            id: u.id,
            name: u.username, // Using username as name for now
            username: `@${u.username}`,
            bio: 'Gardener', // Placeholder bio
            avatar: u.avatar_url ? { uri: u.avatar_url } : require('../../../../assets/images/Profilbild.jpg'), // User avatar or placeholder
            status: getStatus(u.id, true)
        }))
        : following.map(u => ({
            id: u.id,
            name: u.username,
            username: `@${u.username}`,
            bio: 'Gardener',
            avatar: u.avatar_url ? { uri: u.avatar_url } : require('../../../../assets/images/Profilbild.jpg'),
            status: getStatus(u.id, false)
        }));

    // Filter based on search
    const filteredData = data.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }: { item: UserConnection }) => {
        let buttonConfig: { text: string; bg: string; textColor: string } = { text: 'Follow', bg: theme.colors.primary, textColor: '#FFF' };

        if (activeTab === 'followers') {
            if (item.status === 'not_following') {
                buttonConfig = { text: 'Follow Back', bg: '#4A90E2', textColor: '#FFF' };
            } else if (item.status === 'friends') {
                buttonConfig = { text: 'Friends', bg: '#8A2BE2', textColor: '#FFF' };
            } else {
                buttonConfig = { text: 'Following', bg: theme.colors.typography, textColor: '#FFF' };
            }
        } else {
            if (item.status === 'friends') {
                buttonConfig = { text: 'Friends', bg: '#8E44AD', textColor: '#FFF' };
            } else {
                buttonConfig = { text: 'Following', bg: '#8E44AD', textColor: '#FFF' };
            }
        }

        return (
            <TouchableOpacity
                key={item.id}
                style={styles.userItem}
                onPress={() => navigation.navigate('PublicProfile', { userId: item.id })}
            >
                <View style={styles.userInfoLeft}>
                    <Image source={item.avatar} style={styles.avatar} />
                    <View>
                        <Text style={styles.userName}>{item.name}</Text>
                        <Text style={styles.userBio}>{item.bio}</Text>
                    </View>
                </View>

                {isOwner && (
                    <View style={styles.actionButtons}>
                        {activeTab === 'followers' && (
                            <TouchableOpacity style={styles.removeButton}>
                                <Text style={styles.removeButtonText}>Remove</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.mainButton, { backgroundColor: buttonConfig.bg }]}
                            onPress={async () => {
                                if (activeTab === 'followers') {
                                    // In Followers list
                                    if (item.status === 'not_following') {
                                        // Action: Follow Back
                                        await followUser(item.id);
                                    } else {
                                        // Action: Following/Friends -> Unfollow
                                        // Design choice: Does clicking "Following" unfollow? Usually yes, or opens a modal.
                                        // For now, simple toggle:
                                        await unfollowUser(item.id);
                                    }
                                } else {
                                    // In Following list
                                    // Action: Check if we are following (we are, since it's the following list)
                                    // So action is Unfollow
                                    await unfollowUser(item.id);
                                }
                            }}
                        >
                            <Text style={styles.mainButtonText}>{buttonConfig.text}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>


            {/* Header Area */}
            <View style={[styles.headerArea, { height: 120 + insets.top }]}>
                <Image
                    source={require('../../../../assets/images/followBackground.png')}
                    style={styles.headerImage}
                    resizeMode="cover"
                />
                <View style={[styles.headerContent, { marginTop: insets.top + 10 }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <FontAwesome6 name="chevron-left" size={24} color="#FFF" />
                    </TouchableOpacity>

                    <View style={styles.titleRow}>
                        <Text 
                            style={styles.headerTitle} 
                            adjustsFontSizeToFit 
                            numberOfLines={1}
                        >
                            {activeTab === 'followers' ? 'Followers' : 'Following'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Main Content Area */}
            <View style={styles.contentCard}>
                <View style={styles.searchBarContainer}>
                    <FontAwesome6 name="magnifying-glass" size={16} color="#666" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#999"
                    />
                </View>

                <View style={[styles.tabContainer, { backgroundColor: '#E0E0E050' }]}>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === 'followers' && { backgroundColor: '#3B82F6' } // Blue
                        ]}
                        onPress={() => setActiveTab('followers')}
                    >
                        <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>Followers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === 'following' && { backgroundColor: '#8B5CF6' } // Purple
                        ]}
                        onPress={() => setActiveTab('following')}
                    >
                        <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>Following</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: '#666' }}>Loading...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredData}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: '#999' }}>No users found.</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

// Helper component for standard safe area header just in case, but we used custom implementation above
const SafeAreaHeader = ({ navigation, title }: { navigation: any, title: string }) => (null);

// Styles defined above using stylesheet pattern
