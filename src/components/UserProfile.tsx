import React, { useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useUserStore } from '../stores/UserStore';
import { useUserProfile } from '../features/social/hooks/useUserProfile';
import { useSocialStats } from '../features/social/hooks/useSocialStats';
import { usePlants } from '../features/plantlist/hooks/usePlants';
import { usePosts } from '../hooks/usePosts';
import { useConnections } from '../features/social/hooks/useConnections';
import MasonryFeedGrid from './MasonryFeedGrid';
import DraggableBottomSheet from './DraggableBottomSheet';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import GradientIcon from './GradientIcon';
import GradientText from './GradientText';
import RankCard from './RankCard';
import RewardItem from './RewardItem';
import { REWARDS, getRankName } from '../utils/leveling';
import SpriteComponent from './SpriteComponent';
import { useNavigation } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';

const { width } = Dimensions.get('window');

type Props = {
    userId: string;
    isOwner?: boolean;
};

export default function UserProfile({ userId, isOwner }: Props) {
    const { theme } = useUnistyles();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { user: currentUser } = useUserStore(); // Current logged in user (viewer)

    // Explicitly derive owner status if not passed, but trusting prop is better for flexibility
    const isCurrentUser = isOwner ?? (currentUser?.id === userId);

    const { profile, loading: profileLoading } = useUserProfile(userId);
    const { followersCount, followingCount, refreshStats } = useSocialStats(userId);
    const { plants, refreshPlants } = usePlants(userId);
    const { posts: userPosts, loading: postsLoading, refreshPosts: refreshUserPosts } = usePosts({ userId: userId });
    const { posts: likedPosts, loading: likedPostsLoading, refreshPosts: refreshLikedPosts } = usePosts({ likedBy: userId });

    // For Follow/Unfollow logic if looking at someone else
    const { following, followUser, unfollowUser, refreshConnections } = useConnections(userId);




    const [activeTab, setActiveTab] = React.useState<'leveling' | 'posts' | 'likes'>('leveling');

    useFocusEffect(
        useCallback(() => {
            refreshStats();
            refreshPlants();
            refreshUserPosts();
            refreshLikedPosts();
            refreshConnections();
        }, [userId])
    );

    const currentLevel = profile?.level || 1;
    const currentXP = profile?.xp || 0;
    const currentRank = getRankName(currentLevel);

    const isFollowing = following.some(u => u.id === userId);

    const handleFollowAction = async () => {
        if (isFollowing) {
            await unfollowUser(userId);
        } else {
            await followUser(userId);
        }
    };

    const stats = [
        { label: 'Plants', value: plants.length, onPress: () => navigation.navigate('UserPlants', { userId }) },
        { label: 'Coins', value: profile?.plant_coins || 0 },
        { label: 'Following', value: followingCount, onPress: () => navigation.navigate('Connections', { initialTab: 'following', userId }) },
        { label: 'Follower', value: followersCount, onPress: () => navigation.navigate('Connections', { initialTab: 'followers', userId }) },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'leveling':
                return (
                    <>
                        {isCurrentUser && (
                            <>
                                <TouchableOpacity style={styles.plantsButton} onPress={() => navigation.navigate('UserPlants', { userId })}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Image
                                            source={require('../../assets/images/ProfilePlantIcon.png')}
                                            style={{ width: 24, height: 24, marginRight: 8 }}
                                            resizeMode="contain"
                                        />
                                        <Text style={styles.plantsButtonText}>All Plants</Text>
                                    </View>
                                    <GradientIcon name="chevron-right" size={14} />
                                </TouchableOpacity>


                            </>
                        )}
                        {!isCurrentUser && plants.length > 0 && (
                            <TouchableOpacity style={styles.plantsButton} onPress={() => navigation.navigate('UserPlants', { userId })}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Image
                                        source={require('../../assets/images/ProfilePlantIcon.png')}
                                        style={{ width: 24, height: 24, marginRight: 8 }}
                                        resizeMode="contain"
                                    />
                                    <Text style={styles.plantsButtonText}>User Plants</Text>
                                </View>
                                <GradientIcon name="chevron-right" size={14} />
                            </TouchableOpacity>
                        )}

                        <RankCard level={currentLevel} xp={currentXP} rankName={currentRank} />

                        <Text style={styles.sectionTitle}>Rewards</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.rewardsScroll}>
                            {REWARDS.map((reward) => (
                                <RewardItem
                                    key={reward.level}
                                    title={reward.title}
                                    description={reward.description}
                                    isUnlocked={currentLevel >= reward.level}
                                    onClaim={() => { if (isCurrentUser) Alert.alert('Claimed!', reward.title); }}
                                />
                            ))}
                        </ScrollView>
                    </>
                );
            case 'posts':
                return (
                    <>
                        <Text style={styles.sectionTitle}>Posts</Text>
                        {postsLoading ? (
                            <View style={{ padding: 20 }}><Text>Loading...</Text></View>
                        ) : userPosts.length === 0 ? (
                            <View style={styles.comingSoonContainer}>
                                <Text style={styles.comingSoonText}>No posts yet.</Text>
                            </View>
                        ) : (
                            <MasonryFeedGrid posts={userPosts} onPostPress={(item) => navigation.navigate('FeedPostDetail', { post: item })} />
                        )}
                    </>
                );
            case 'likes':
                return (
                    <>
                        <Text style={styles.sectionTitle}>Liked Posts</Text>
                        {likedPostsLoading ? (
                            <View style={{ padding: 20 }}><Text>Loading...</Text></View>
                        ) : likedPosts.length === 0 ? (
                            <View style={styles.comingSoonContainer}>
                                <Text style={styles.comingSoonText}>No likes yet.</Text>
                            </View>
                        ) : (
                            <MasonryFeedGrid posts={likedPosts} onPostPress={(item) => navigation.navigate('FeedPostDetail', { post: item })} />
                        )}
                    </>
                );
        }
    };

    return (
        <View style={styles.container}>
            {/* Header Background */}
            <View style={styles.headerBg}>
                <Image
                    source={require('../../assets/images/profileScreenBackground.png')}
                    style={styles.headerGradient}
                    resizeMode="cover"
                />
                <View style={[styles.headerContent, { paddingTop: insets.top }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <FontAwesome6 name="chevron-left" size={20} color={theme.colors.textDark} />
                    </TouchableOpacity>
                    <Text 
                        style={styles.headerTitle}
                        adjustsFontSizeToFit
                        numberOfLines={3}
                        minimumFontScale={0.5}
                    >
                        {isCurrentUser ? "Your\nGrowing\nProfile!" : `${profile?.username || 'User'}'s\nProfile`}
                    </Text>
                </View>
            </View>

            <DraggableBottomSheet initialHeight={0.65} maxHeight={0.9}>
                <ScrollView
                    contentContainerStyle={[styles.sheetContent, { paddingBottom: 100 }]}
                    showsVerticalScrollIndicator={false}>

                    {/* Profile Card */}
                    <View style={styles.profileCard}>
                        <View style={styles.avatarContainer}>
                            <Image
                                source={
                                    profile?.profile_image
                                        ? { uri: profile.profile_image }
                                        : require('../../assets/images/Profilbild.jpg')
                                }
                                style={styles.avatar}
                            />
                            {/* 🟢 ADDED: Responsive Border Fix */}
                            {profile?.equipped_border?.media_url && (
                                <ExpoImage
                                    key={profile.equipped_border.media_url} // Force re-mount on change!
                                    source={{ uri: profile.equipped_border.media_url }}
                                    style={{
                                        // 🟢 RESPONSIVE SIZING RELATIVE TO AVATAR (80px)
                                        position: 'absolute',
                                        width: profile.equipped_border.media_url.includes('.gif') ? '262%' : '168%',
                                        height: profile.equipped_border.media_url.includes('.gif') ? '262%' : '168%',
                                        top: profile.equipped_border.media_url.includes('.gif') ? '-81%' : '-34%',
                                        left: profile.equipped_border.media_url.includes('.gif') ? '-81%' : '-34%',
                                        zIndex: 1,
                                    }}
                                    pointerEvents="none"
                                    contentFit="contain"
                                />
                            )}
                        </View>
                        <View style={styles.userInfo}>
                            <View style={styles.nameRow}>
                                <Text style={styles.userName}>
                                    {profile?.username || 'Gardener'}
                                </Text>
                            </View>
                            <Text style={styles.userBio}>Bio placeholder...</Text>

                            {!isCurrentUser && (
                                <TouchableOpacity
                                    style={[
                                        styles.followButton,
                                        { backgroundColor: isFollowing ? '#8E44AD' : theme.colors.primary }
                                    ]}
                                    onPress={handleFollowAction}
                                >
                                    <Text style={styles.followButtonText}>
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        {stats.map((stat, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.statItem}
                                onPress={stat.onPress}
                                disabled={!stat.onPress}
                            >
                                <GradientText text={stat.value} style={styles.statValue} />
                                <Text style={styles.statLabel}>{stat.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Tabs */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => setActiveTab('leveling')}>
                            {activeTab === 'leveling' ? (
                                <View style={{ alignItems: 'center', width: '100%' }}>
                                    <GradientIcon name="seedling" size={20} />
                                    <LinearGradient colors={theme.colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.activeTabLine} />
                                </View>
                            ) : <FontAwesome6 name="seedling" size={20} color={theme.colors.greyedOut} />}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => setActiveTab('posts')}>
                            {activeTab === 'posts' ? (
                                <View style={{ alignItems: 'center', width: '100%' }}>
                                    <GradientIcon name="list" size={20} />
                                    <LinearGradient colors={theme.colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.activeTabLine} />
                                </View>
                            ) : <FontAwesome6 name="list" size={20} color={theme.colors.greyedOut} />}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => setActiveTab('likes')}>
                            {activeTab === 'likes' ? (
                                <View style={{ alignItems: 'center', width: '100%' }}>
                                    <GradientIcon name="thumbs-up" size={20} />
                                    <LinearGradient colors={theme.colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.activeTabLine} />
                                </View>
                            ) : <FontAwesome6 name="thumbs-up" size={20} color={theme.colors.greyedOut} />}
                        </TouchableOpacity>
                    </View>

                    {renderContent()}

                </ScrollView>
            </DraggableBottomSheet>

            {isCurrentUser && <SpriteComponent />}
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    headerBg: {
        height: '100%',
        width: '100%',
        position: 'absolute',
        top: 0,
    },
    headerGradient: {
        flex: 1,
    },
    headerContent: {
        position: 'absolute',
        top: 0,
        left: 20,
    },
    backButton: {
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 42,
        fontWeight: '900',
        color: theme.colors.textDark,
        lineHeight: 46,
    },
    sheetContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    profileCard: {
        backgroundColor: theme.colors.background,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
    },
    avatarContainer: {
        marginRight: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.greyedOut,
    },
    userInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    userBio: {
        fontSize: 14,
        color: theme.colors.typography,
        marginTop: 4,
    },
    followButton: {
        marginTop: 10,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    followButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.background,
        borderRadius: 20,
        padding: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.typography,
        marginTop: 2,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        backgroundColor: theme.colors.background,
        borderRadius: 15,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    actionButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 5,
    },
    activeTabLine: {
        height: 3,
        width: '60%',
        marginTop: 5,
        borderRadius: 1.5,
    },
    plantsButton: {
        backgroundColor: theme.colors.background,
        borderRadius: 15,
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    plantsButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 10,
        marginBottom: 10,
    },
    rewardsScroll: {
        marginTop: 10,
        marginBottom: 250,
    },
    comingSoonContainer: {
        backgroundColor: theme.colors.surface + 'B3',
        borderRadius: 15,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.colors.greyedOut,
        borderStyle: 'dashed',
    },
    comingSoonText: {
        fontSize: 16,
        color: theme.colors.typography,
        fontStyle: 'italic',
    },
}));
