import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, Dimensions, TextInput, Animated, ScrollView, Platform } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { RootStackParamList } from '../../../navigation/Root';
import MasonryFeedGrid from '../../../components/MasonryFeedGrid';
import { useFeed } from '../../../hooks/useFeed';
import { db } from '../../../utils/supabase';
import { useUserStore } from '../../../stores/UserStore';
import { getDisplayMedia } from '../../../utils/media';
import Video from 'react-native-video';
import { formatNumber } from '../../../utils/formatNumber';
import { TapGestureHandler, State } from 'react-native-gesture-handler';

// We need the RouteProp to access params
type FeedPostDetailRouteProp = RouteProp<RootStackParamList, 'FeedPostDetail'>;

const { height, width } = Dimensions.get('window');

export default function FeedPostDetailScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation<any>();
    const route = useRoute<FeedPostDetailRouteProp>();
    const { user, profile } = useUserStore();

    // Animation Value
    const scrollY = useRef(new Animated.Value(0)).current;

    // Fallback if no params (dev safety), though FeedScreen will pass them
    const post = route.params?.post;

    // Interaction State
    const [isLiked, setIsLiked] = useState(post?.is_liked || false);
    const [likesCount, setLikesCount] = useState<number>((post?.likes as number) || 0);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<any[]>([]);

    // Video State
    const [paused, setPaused] = useState(false);
    const [muted, setMuted] = useState(false);

    // Logic to fix URL extension if needed (User logic preservation)
    const rawMediaUrl = getDisplayMedia(post);
    const mediaUrl = rawMediaUrl?.replace("png", "mp4");

    // Check if it is a video based on extension (simple check)
    const isVideo = post?.type === 'video';
    // Refs for Gestures
    const doubleTapRef = useRef(null);

    // Fetch interactions
    useEffect(() => {
        if (post?.id) {
            checkInteractions();
            fetchComments();
        }
    }, [post?.id]);

    const checkInteractions = async () => {
        if (!user?.id || !post?.id) return;
        const { data } = await db.social.from('post_interactions')
            .select('*')
            .eq('user_id', user.id)
            .eq('post_id', post.id)
            .eq('interaction_type', 'like')
            .maybeSingle();
        if (data) setIsLiked(true);
    };

    const fetchComments = async () => {
        if (!post?.id) return;
        const { data } = await db.social.from('Comments')
            .select('*, Users(username, profile_image)')
            .eq('post_id', post.id)
            .order('created_at', { ascending: false })
            .limit(5); // Show last 5 interactions
        if (data) setComments(data);
    };

    const handleLike = async () => {
        if (!user?.id || !post?.id) return;
        const newLiked = !isLiked;
        setIsLiked(newLiked);
        setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

        if (newLiked) {
            await db.social.from('post_interactions').insert({ user_id: user.id, post_id: post.id, interaction_type: 'like' });
        } else {
            await db.social.from('post_interactions').delete().eq('user_id', user.id).eq('post_id', post.id).eq('interaction_type', 'like');
        }
    };

    const handleComment = async () => {
        if (!commentText.trim() || !user?.id || !post?.id) return;
        const text = commentText.trim();
        setCommentText('');

        // Optimistic update
        const newComment = {
            id: 'temp-' + Date.now(),
            description: text,
            Users: { username: profile?.username || 'Me', profile_image: profile?.profile_image }
        };
        setComments(prev => [newComment, ...prev]);

        await db.social.from('Comments').insert({
            user_id: user.id,
            post_id: post.id,
            description: text
        });
    };

    // Gestures
    const onSingleTap = (event: any) => {
        if (event.nativeEvent.state === State.ACTIVE) {
            setPaused(prev => !prev);
        }
    };

    const onDoubleTap = (event: any) => {
        if (event.nativeEvent.state === State.ACTIVE) {
            if (!isLiked) handleLike();
        }
    };

    // Fetch related posts (for now just all posts)
    const { posts: relatedPosts } = useFeed();
    const displayPosts = relatedPosts.filter(p => p.id !== post?.id).slice(0, 4);

    // Opacity Interpolation: Hidden at 0, Visible by 150 scroll (for comments/content)
    const contentOpacity = scrollY.interpolate({
        inputRange: [0, 150],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const contentTranslateY = scrollY.interpolate({
        inputRange: [0, 150],
        outputRange: [30, 0],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
            {/* Video / Background Layer with Gestures */}
            <TapGestureHandler
                onHandlerStateChange={onSingleTap}
                waitFor={doubleTapRef}
            >
                <TapGestureHandler
                    ref={doubleTapRef}
                    onHandlerStateChange={onDoubleTap}
                    numberOfTaps={2}
                >
                    <View style={styles.backgroundContainer}>
                        {mediaUrl ? (
                            isVideo ? (
                                <Video
                                    source={{ uri: mediaUrl }}
                                    style={styles.backgroundImage}
                                    resizeMode="cover"
                                    repeat
                                    paused={paused}
                                    muted={muted}
                                    playInBackground={false}
                                    playWhenInactive={false}
                                />
                            ) : (
                                <Image
                                    source={{ uri: mediaUrl }}
                                    style={styles.backgroundImage}
                                    resizeMode="contain"
                                />
                            )
                        ) : (
                            <View style={[styles.backgroundImage, { backgroundColor: '#F0F5F1' }]} />
                        )}

                        {/* Mute Button Overlay */}
                        {isVideo && (
                            <TouchableOpacity
                                style={styles.muteButton}
                                onPress={() => setMuted(!muted)}
                                activeOpacity={0.7}
                            >
                                <FontAwesome6
                                    name={muted ? "volume-xmark" : "volume-high"}
                                    size={20}
                                    color="white"
                                />
                            </TouchableOpacity>
                        )}

                        {/* Right Side Actions Overlay */}
                        <View style={styles.rightActionsContainer}>
                            <TouchableOpacity style={styles.rightActionItem} onPress={handleLike}>
                                <FontAwesome6 name="heart" size={30} color={isLiked ? "#FF3B30" : "white"} solid={isLiked} />
                                <Text style={styles.rightActionText}>{formatNumber(likesCount)}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.rightActionItem} onPress={() => { }}>
                                <FontAwesome6 name="comment" size={30} color="white" />
                                <Text style={styles.rightActionText}>{formatNumber(post?.comments_count || comments.length || 0)}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.rightActionItem}>
                                <FontAwesome6 name="share-nodes" size={30} color="white" />
                                <Text style={styles.rightActionText}>Share</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.rightActionItem}>
                                <FontAwesome6 name="bookmark" size={30} color="white" />
                                <Text style={styles.rightActionText}>Save</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Play/Pause Indicator (Optional, shown when paused) */}
                        {paused && isVideo && (
                            <View style={styles.centerOverlay}>
                                <FontAwesome6 name="play" size={50} color="white" style={{ opacity: 0.8 }} />
                            </View>
                        )}
                    </View>
                </TapGestureHandler>
            </TapGestureHandler>

            {/* Fixed Header */}
            <SafeAreaView style={styles.headerSafeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                        <FontAwesome6 name="chevron-left" size={20} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.headerButton}>
                        <FontAwesome6 name="magnifying-glass" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Scrollable Overlay Content */}
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={styles.scrollView}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            >
                {/* Transparent Spacer to show video */}
                {/* We increase spacer height so video is clear */}
                <View style={styles.spacer} />

                {/* White Content Card */}
                <View style={[styles.contentCard, { backgroundColor: theme.colors.surface }]}>
                    {/* User Info Row */}
                    <View style={styles.userInfoRow}>
                        <View style={styles.userSection}>
                            <Image
                                source={post?.Users?.profile_image ? { uri: post.Users.profile_image } : require('../../../../assets/images/Profilbild.jpg')}
                                style={styles.avatar}
                            />
                            <View style={styles.textSection}>
                                <Text style={[styles.username, { color: theme.colors.text }]}>{post?.Users?.username || 'Observer'}</Text>
                                <Text style={[styles.caption, { color: theme.colors.text }]} numberOfLines={2}>
                                    {post?.caption || 'My Pink Princess #post #plslikeandfollow'}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.followButton, { backgroundColor: '#4CA771' }]}>
                            <Text style={styles.followButtonText}>Follow</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Scroll Hint */}
                    <View style={styles.footer}>
                        <FontAwesome6 name="chevron-down" size={14} color={theme.colors.greyedOut || '#999'} />
                        <Text style={[styles.footerText, { color: theme.colors.greyedOut || '#999' }]}>Scroll for more comments...</Text>
                    </View>

                    {/* Hidden Content (Fades in) */}
                    <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
                        <View style={styles.divider} />

                        {/* Comments Section */}
                        <View style={styles.commentsSection}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Comments</Text>
                            <Text style={styles.commentPrompt}>Love this Picture? Add a comment!</Text>

                            {comments.map((c, i) => (
                                <View key={c.id || i} style={{ marginBottom: 10, paddingHorizontal: 10 }}>
                                    <Text style={{ fontWeight: 'bold', color: theme.colors.text }}>{c.Users?.username}: <Text style={{ fontWeight: 'normal' }}>{c.description}</Text></Text>
                                </View>
                            ))}

                            <View style={styles.commentInputRow}>
                                <Image
                                    source={profile?.profile_image ? { uri: profile.profile_image } : require('../../../../assets/images/Profilbild.png')}
                                    style={styles.smallAvatar}
                                />
                                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background }]}>
                                    <TextInput
                                        placeholder="Add a comment"
                                        placeholderTextColor={theme.colors.greyedOut || '#999'}
                                        style={[styles.input, { color: theme.colors.text }]}
                                        value={commentText}
                                        onChangeText={setCommentText}
                                        onSubmitEditing={handleComment}
                                    />
                                    <TouchableOpacity onPress={handleComment}>
                                        <FontAwesome6 name="paper-plane" size={16} color="#4CA771" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* Related Grid */}
                        <MasonryFeedGrid
                            posts={displayPosts}
                            onPostPress={(item) => navigation.push('FeedPostDetail', { post: item })}
                        />

                        {/* Bottom Padding */}
                        <View style={{ height: 40 }} />
                    </Animated.View>
                </View>
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    backgroundContainer: {
        width: width,
        height: height,
        position: 'absolute',
        top: 0,
        left: 0,
    },
    backgroundImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    muteButton: {
        position: 'absolute',
        top: 100, // Adjust based on header
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
    },
    rightActionsContainer: {
        position: 'absolute',
        right: 15,
        bottom: 250, // Floating mid-right
        alignItems: 'center',
        gap: 25,
        zIndex: 50,
        // Ensure it doesn't block touches to video if pressed outside
    },
    rightActionItem: {
        alignItems: 'center',
    },
    rightActionText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 3,
    },
    centerOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -25,
        marginTop: -25,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 40,
    },
    headerSafeArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
    },
    headerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        width: 40,
        justifyContent: "center",
    },
    scrollView: {
        flex: 1,
        zIndex: 20, // Sit on top of video, but let interactions pass to video if transparent? 
        // ScrollView captures touches. We need to touch "through" it for video pause?
        // Actually, if we tap the spacer, it should trigger video gesture.
        // We can make spacer pointerEvents="box-none" so touches pass through?
    },
    scrollContent: {
        flexGrow: 1,
    },
    spacer: {
        height: height - 150, // Occupy most of screen so ContentCard starts at bottom
    },
    contentCard: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 24,
        paddingTop: 24,
        minHeight: height * 0.8,
        paddingBottom: 40,
    },
    userInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    userSection: {
        flexDirection: 'row',
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    textSection: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 10,
    },
    username: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    caption: {
        fontSize: 14,
        lineHeight: 18,
    },
    followButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    followButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        opacity: 0.7,
        gap: 8,
    },
    footerText: {
        fontSize: 12,
    },
    divider: {
        height: 1,
        backgroundColor: '#EEEEEE',
        marginTop: 5,
        marginBottom: 20,
    },
    commentsSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    commentPrompt: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 15,
    },
    commentInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    smallAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 15,
        height: 40,
    },
    input: {
        flex: 1,
    },
});
