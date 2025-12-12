import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl, TextInput, Keyboard } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useUnistyles } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import FeedCard from '../../../components/FeedCard';
import DraggableBottomSheet from '../../../components/DraggableBottomSheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePosts } from '../../../hooks/usePosts';
import MasonryFeedGrid from '../../../components/MasonryFeedGrid';
import { useUserSearch } from '../../../features/social/hooks/useUserSearch';
import { useConnections } from '../../../features/social/hooks/useConnections';

const { width } = Dimensions.get('window');

// Helper to determine rank color based on level
const getRankColor = (level: number) => {
    if (level >= 50) return '#FFD700'; // Gold
    if (level >= 30) return '#C0C0C0'; // Silver
    if (level >= 10) return '#cd7f32'; // Bronze
    return '#4CAF50'; // Green
};

export default function FeedScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation<any>();
    const { posts, loading: postsLoading, refreshPosts: refreshFeed } = usePosts();
    const [refreshing, setRefreshing] = useState(false);

    // Search State
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { searchResults, loading: searchLoading, searchUsers, clearSearch } = useUserSearch();
    const { following, followers, followUser, unfollowUser } = useConnections();

    // Reload when screen is focused
    useFocusEffect(
        useCallback(() => {
            refreshFeed();
        }, [refreshFeed])
    );

    // Pull to refresh handler
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshFeed();
        setRefreshing(false);
    }, [refreshFeed]);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (text.length > 1) {
            searchUsers(text);
        } else {
            clearSearch();
        }
    };

    const closeSearch = () => {
        setIsSearching(false);
        setSearchQuery('');
        clearSearch();
        Keyboard.dismiss();
    };

    const getStatus = (userId: string) => {
        // Simplified check just for "Do I follow them?"
        // We can do full friend logic if desired, but "Following/Not Following" is base.
        const isFollowing = following.some(u => u.id === userId);
        const isFollower = followers.some(u => u.id === userId); // To show 'Follow Back' if they follow us

        if (isFollowing) return 'following';
        if (isFollower) return 'follows_you'; // Meaning we don't follow them back yet
        return 'not_following';
    };

    const renderSearchResult = ({ item }: { item: any }) => {
        const { id, username, level = 1, followers_count = 0 } = item;
        const status = getStatus(id);
        const rankColor = getRankColor(level);

        let buttonText = 'Follow';
        let buttonColor: string = theme.colors.primary;

        if (status === 'following') {
            buttonText = 'Following';
            buttonColor = '#8E44AD'; // Purple
        } else if (status === 'follows_you') {
            buttonText = 'Follow Back';
            buttonColor = '#4A90E2'; // Blue
        }

        return (
            <TouchableOpacity
                style={styles.resultItem}
                onPress={() => navigation.navigate('PublicProfile', { userId: id })}
            >
                <View style={styles.resultLeft}>
                    {/* Avatar with Badge */}
                    <View style={styles.imageContainer}>
                        <Image source={require('../../../../assets/images/Profilbild.png')} style={styles.placeholderImage} />
                        <View style={[styles.levelBadge, { backgroundColor: rankColor }]}>
                            <Text style={styles.levelText}>LVL {level}</Text>
                        </View>
                    </View>

                    <View>
                        <Text style={styles.username}>{username}</Text>
                        <Text style={styles.followersText}>{followers_count} Followers</Text>
                    </View>
                </View>

                {/* Follow Button */}
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: buttonColor }]}
                    onPress={() => {
                        if (status === 'following') {
                            unfollowUser(id);
                        } else {
                            followUser(id);
                        }
                    }}
                >
                    <Text style={styles.actionButtonText}>{buttonText}</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                {/* Header Background */}
                <View style={styles.headerBg}>
                    <Image
                        source={require('../../../../assets/images/homeScreenBackground.png')}
                        style={styles.headerImage}
                        resizeMode="cover"
                    />

                    <View style={styles.headerWrapper}>
                        {isSearching ? (
                            <View style={styles.searchContainer}>
                                <TouchableOpacity onPress={closeSearch} style={{ marginRight: 10 }}>
                                    <FontAwesome6 name="arrow-left" size={20} color="gray" />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search users..."
                                    placeholderTextColor="#666"
                                    value={searchQuery}
                                    onChangeText={handleSearch}
                                    autoFocus
                                />
                                {searchLoading && <ActivityIndicator size="small" color={theme.colors.primary} />}
                            </View>
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={{ position: 'absolute', right: width * 0.05, top: 0, zIndex: 10, padding: 5 }}
                                    onPress={() => setIsSearching(true)}
                                >
                                    <FontAwesome6 name="magnifying-glass" size={24} color="white" />
                                </TouchableOpacity>

                                <MaskedView
                                    style={{ height: 100, width: '100%', position: "absolute", top: 120, left: 0 }}
                                    maskElement={<Text style={styles.headerTitle}>Inspire and{'\n'}Be Inspired!</Text>}>
                                    <LinearGradient
                                        colors={['#FFFFFF', '#E0F7FA']}
                                        start={{ x: 0.2, y: 0 }}
                                        end={{ x: 0.8, y: 1 }}
                                        style={{ flex: 1 }}
                                    />
                                </MaskedView>
                            </>
                        )}
                    </View>
                </View>

                {isSearching ? (
                    <View style={styles.searchResultsContainer}>
                        <ScrollView
                            contentContainerStyle={{ padding: 20 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            {searchResults.map(user => (
                                <View key={user.id}>
                                    {renderSearchResult({ item: user })}
                                </View>
                            ))}
                            {searchResults.length === 0 && searchQuery.length > 1 && !searchLoading && (
                                <Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>No users found.</Text>
                            )}
                        </ScrollView>
                    </View>
                ) : (
                    <DraggableBottomSheet initialHeight={0.65} maxHeight={0.9}>
                        {postsLoading && posts.length === 0 ? (
                            <View style={{ padding: 20 }}>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                            </View>
                        ) : (
                            <ScrollView
                                contentContainerStyle={styles.scrollContent}
                                showsVerticalScrollIndicator={false}
                                refreshControl={
                                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text} />
                                }
                            >
                                <MasonryFeedGrid
                                    posts={posts}
                                    onPostPress={(item) => navigation.navigate('FeedPostDetail', { post: item })}
                                />
                                {posts.length === 0 && (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <Text style={{ color: theme.colors.text }}>No posts yet. Be the first!</Text>
                                    </View>
                                )}
                                <View style={{ height: 100 }} />
                            </ScrollView>
                        )}
                    </DraggableBottomSheet>
                )}

                {/* FAB (Hide when searching) */}
                {!isSearching && (
                    <TouchableOpacity
                        style={styles.fab}
                        onPress={() => navigation.navigate('CreatePost')}
                    >
                        <FontAwesome6 name="plus" size={28} color="white" />
                    </TouchableOpacity>
                )}
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerBg: {
        height: '55%',
        width: '100%',
        position: 'absolute',
        top: 0,
    },
    headerImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    headerWrapper: {
        position: 'absolute',
        top: '8%',
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        // alignItems: 'center', // Changed to allow full width search bar
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 25,
        paddingHorizontal: 15,
        height: 50,
        width: '100%',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        height: '100%',
    },
    searchResultsContainer: {
        position: 'absolute',
        top: 130, // Below header wrapper roughly
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#F5F5F7',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 10,
    },
    resultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    imageContainer: {
        width: 50,
        height: 50,
        marginRight: 15,
        position: 'relative',
    },
    placeholderImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#eee',
    },
    levelBadge: {
        position: 'absolute',
        bottom: -5,
        right: -10, // Adjust for wider badge
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8, // Rounded rectangle
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    levelText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#fff',
    },
    resultLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    // imageContainer and internal styles handled inline or nested if needed, but better flat.
    // Let's use the new imageContainer style I added earlier for the avatar part.
    username: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#333',
    },
    followersText: {
        fontSize: 12,
        color: '#777',
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    actionButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 12,
    },
    // ... (Keep existing styles below if not overwritten)
    brandText: {
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
        fontSize: 18
    },
    headerTitle: {
        fontSize: 40,
        fontWeight: '900',
        color: 'white',
        textAlign: 'left',
        paddingLeft: 20,
        lineHeight: 44,
    },
    // ...
    scrollContent: {
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    masonryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    // ...
    fab: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        width: 60,
        height: 60,
        borderRadius: 20, // Rounded square / Squircle
        backgroundColor: 'rgba(45, 48, 51, 0.9)', // Dark grey with slight transparency
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
        zIndex: 100,
    }
});
