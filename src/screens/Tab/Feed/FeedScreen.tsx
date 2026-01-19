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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const vh = height / 100;
const vw = width / 100;

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
    const insets = useSafeAreaInsets();
    const { posts: allPosts, loading: postsLoading, refreshPosts: refreshFeed } = usePosts();
    const [refreshing, setRefreshing] = useState(false);
    
    // Filter out blocked posts
    const posts = allPosts.filter(p => !p.is_blocked);

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
        const isFollowing = following.some((u: { id: string }) => u.id === userId);
        const isFollower = followers.some((u: { id: string }) => u.id === userId); // To show 'Follow Back' if they follow us

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
                        <Image
                            source={
                                item.profile_image
                                    ? { uri: item.profile_image }
                                    : require('../../../../assets/images/Profilbild.jpg')
                            }
                            style={styles.placeholderImage}
                        />
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

                    <View style={[styles.headerWrapper, { top: insets.top }]}>
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
                                    style={{ position: 'absolute', right: vw * 5, top: vw * 5, zIndex: 10, padding: 5 }}
                                    onPress={() => setIsSearching(true)}
                                >
                                    <FontAwesome6 name="magnifying-glass" size={vw * 6} color="white" />
                                </TouchableOpacity>

                                <MaskedView
                                    style={{ height: vh * 15, width: '100%', marginTop: vh * 10 }}
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
                    <View style={[styles.searchResultsContainer, { top: insets.top + vh * 15 }]}>
                        <ScrollView
                            contentContainerStyle={{ padding: vw * 5 }}
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
                    <DraggableBottomSheet initialHeight={0.70} maxHeight={0.9}>
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
                                <View style={{ height: vh * 10 }} />
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
                        <FontAwesome6 name="plus" size={vw * 7} color="white" />
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
        // top handled inline
        left: 0,
        right: 0,
        paddingHorizontal: vw * 5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: vw * 6,
        paddingHorizontal: vw * 4,
        height: vh * 6,
        width: '100%',
    },
    searchInput: {
        flex: 1,
        fontSize: vw * 4,
        color: '#333',
        height: '100%',
    },
    searchResultsContainer: {
        position: 'absolute',
        // top handled inline
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#F5F5F7',
        borderTopLeftRadius: vw * 8,
        borderTopRightRadius: vw * 8,
        paddingTop: vh * 2,
    },
    resultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: vw * 4,
        borderRadius: vw * 4,
        marginBottom: vh * 1.5,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    imageContainer: {
        width: vw * 12,
        height: vw * 12,
        marginRight: vw * 4,
        position: 'relative',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        borderRadius: vw * 6,
        backgroundColor: '#eee',
    },
    levelBadge: {
        position: 'absolute',
        bottom: -5,
        right: -10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
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
    username: {
        fontWeight: 'bold',
        fontSize: vw * 4,
        color: '#333',
    },
    followersText: {
        fontSize: vw * 3,
        color: '#777',
    },
    actionButton: {
        paddingHorizontal: vw * 4,
        paddingVertical: vh * 1,
        borderRadius: 20,
    },
    actionButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: vw * 3,
    },
    headerTitle: {
        fontSize: vw * 10,
        fontWeight: '900',
        color: 'white',
        textAlign: 'left',
        paddingLeft: vw * 1,
        lineHeight: vw * 11,
    },
    scrollContent: {
        paddingHorizontal: vw * 4,
        paddingTop: vh * 2,
        paddingBottom: vh * 15, // Space for bottom tab bar
    },
    masonryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    fab: {
        position: 'absolute',
        bottom: vh * 3,
        alignSelf: 'center',
        width: vw * 15,
        height: vw * 15,
        borderRadius: vw * 5,
        backgroundColor: 'rgba(45, 48, 51, 0.9)',
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
