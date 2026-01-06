import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, Dimensions, TextInput, Platform, Keyboard, BackHandler, Modal, TouchableWithoutFeedback, Alert } from 'react-native';
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
import { TapGestureHandler, LongPressGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetView, BottomSheetTextInput, BottomSheetScrollView, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, runOnJS } from 'react-native-reanimated';

// We need the RouteProp to access params
type FeedPostDetailRouteProp = RouteProp<RootStackParamList, 'FeedPostDetail'>;

const { height, width } = Dimensions.get('window');

type SheetMode = 'related' | 'comments';

export default function FeedPostDetailScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation<any>();
    const route = useRoute<FeedPostDetailRouteProp>();
    const { user, profile } = useUserStore();

    // Fallback if no params (dev safety), though FeedScreen will pass them
    const post = route.params?.post;

    // Interaction State
    const [isLiked, setIsLiked] = useState(post?.is_liked || false);
    const [isSaved, setIsSaved] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isBlocked, setIsBlocked] = useState(post?.is_blocked || false); // New Block State initialized from params
    const [likesCount, setLikesCount] = useState<number>((post?.likes as number) || 0);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<any[]>([]);

    // Menu State
    const [menuStage, setMenuStage] = useState<'none' | 'initial' | 'report'>('none');
    const reportReasons = ["Self Harm and Suicide", "Inappropriate content", "Harassment", "False information", "Other"];

    // Pagination State
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // Animation State
    const heartScale = useSharedValue(1);
    const [showHeartBreak, setShowHeartBreak] = useState(false);
    const progress = useSharedValue(0); // Video Progress
    const durationRef = useRef(0);

    // Sheet State
    const [sheetMode, setSheetMode] = useState<SheetMode>('related');

    // Video State
    const [paused, setPaused] = useState(false);
    const [muted, setMuted] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);

    // BottomSheet Ref
    const bottomSheetRef = useRef<BottomSheet>(null);
    // Snap points: 15% (User Info + Input), 90% (Full screen)
    const snapPoints = useMemo(() => ['15%', '90%'], []);

    // Logic to fix URL extension if needed (User logic preservation)
    const rawMediaUrl = getDisplayMedia(post);
    const mediaUrl = rawMediaUrl?.replace("png", "mp4");

    // Check if it is a video based on extension (simple check)
    const isVideo = post?.type === 'video';
    const isTextPost = post?.type === 'text';

    // Helper to get hashtags
    const getHashtags = (text: string | null) => {
        if (!text) return "";
        const matches = text.match(/#\w+/g);
        return matches ? matches.join(" ") : "";
    };

    // Refs for Gestures
    const doubleTapRef = useRef(null);

    // Fetch interactions
    useEffect(() => {
        if (post?.id) {
            checkInteractions();
            fetchComments();
        }
    }, [post?.id, user?.id]);

    // Reset video state when post changes
    useEffect(() => {
        setIsVideoReady(false);
        setPaused(false);
        progress.value = 0;
    }, [post?.id]);

    const checkInteractions = async () => {
        if (!user?.id || !post?.id) return;

        // Check Like
        const { data: likeData } = await db.social.from('post_interactions')
            .select('*')
            .eq('user_id', user.id)
            .eq('post_id', post.id)
            .eq('interaction_type', 'like')
            .maybeSingle();
        if (likeData) setIsLiked(true);

        // Check Save
        const { data: saveData } = await db.social.from('post_interactions')
            .select('*')
            .eq('user_id', user.id)
            .eq('post_id', post.id)
            .eq('interaction_type', 'save')
            .maybeSingle();
        if (saveData) setIsSaved(true);

        // Check Follow
        if (post.user_id) {
            const { data: followData } = await db.social.from('follows')
                .select('*')
                .eq('follower_id', user.id)
                .eq('following_id', post.user_id)
                .maybeSingle();
            if (followData) setIsFollowing(true);
        }

        // Check Block (Only if not already true from params to avoid double work, or re-verify)
        if (!isBlocked) {
            const { data: blockData } = await db.social.from('Block_posts')
                .select('*')
                .eq('user_id', user.id)
                .eq('post_id', post.id)
                .maybeSingle();
            if (blockData) setIsBlocked(true);
        }
    };

    const fetchComments = async (newPage = 0) => {
        if (!post?.id) return;
        if (newPage === 0) setComments([]);

        const { data: commentsData, error } = await db.social
            .from('Comments')
            .select('*, replies:Comments(count)')
            .eq('post_id', post.id)
            .is('reply_id', null)
            .order('created_at', { ascending: false })
            .range(newPage * 10, (newPage + 1) * 10 - 1);

        if (error) {
            console.log('Error fetching comments:', error);
            return;
        }

        if (commentsData && commentsData.length < 10) {
            setHasMore(false);
        } else {
            setHasMore(true);
        }

        if (commentsData) {
            // Fetch users for these comments
            const userIds = Array.from(new Set(commentsData.map((c: any) => c.user_id).filter((id: any) => id)));

            if (userIds.length > 0) {
                const { data: usersData } = await db.user
                    .from('Users')
                    // Fetch profile_image too as UI needs it
                    .select('id, username, avatar_path')
                    .in('id', userIds);

                if (usersData) {
                    const userMap = new Map(usersData.map((u: any) => [u.id, u]));
                    const commentsWithUsers = commentsData.map((c: any) => {
                        const user = userMap.get(c.user_id);
                        let profileImageUrl = null;

                        if (user?.avatar_path) {

                            const { data } = db.public.storage.from('avatar').getPublicUrl(user.avatar_path);
                            profileImageUrl = data.publicUrl;

                        }

                        return {
                            ...c,
                            // Map to "Users" object to match existing UI
                            Users: user ? { ...user, profile_image: profileImageUrl } : { username: 'Unknown', profile_image: null }
                        };
                    });

                    if (newPage === 0) {
                        setComments(commentsWithUsers);
                    } else {
                        setComments(prev => [...prev, ...commentsWithUsers]);
                    }
                    setPage(newPage);
                    return;
                }
            }

            // Fallback if no users found
            if (newPage === 0) {
                setComments(commentsData);
            } else {
                setComments(prev => [...prev, ...commentsData]);
            }
            setPage(newPage);
        }
    };

    const animateLike = () => {
        heartScale.value = withSequence(
            withSpring(1.5, { damping: 10, stiffness: 200 }),
            withSpring(1, { damping: 10, stiffness: 200 })
        );
    };

    const animateDislike = () => {
        setShowHeartBreak(true);
        heartScale.value = withSequence(
            withTiming(1.2, { duration: 100 }), // Jump up
            withSpring(1, { damping: 10, stiffness: 200 }, () => {
                // Reset after animation
                runOnJS(setShowHeartBreak)(false);
            })
        );
    };

    const handleLike = async () => {
        if (!user?.id || !post?.id) return;
        const newLiked = !isLiked;

        // Trigger Animations BEFORE state update for responsiveness
        if (newLiked) {
            animateLike();
        } else {
            animateDislike();
        }

        setIsLiked(newLiked);
        setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

        if (newLiked) {
            await db.social.from('post_interactions').insert({ user_id: user.id, post_id: post.id, interaction_type: 'like' });
        } else {
            await db.social.from('post_interactions').delete().eq('user_id', user.id).eq('post_id', post.id).eq('interaction_type', 'like');
        }
    };

    const handleSave = async () => {
        if (!user?.id || !post?.id) return;
        const newSaved = !isSaved;
        setIsSaved(newSaved);

        if (newSaved) {
            await db.social.from('post_interactions').insert({ user_id: user.id, post_id: post.id, interaction_type: 'save' });
        } else {
            await db.social.from('post_interactions').delete().eq('user_id', user.id).eq('post_id', post.id).eq('interaction_type', 'save');
        }
    };

    const handleFollow = async () => {
        if (!user?.id || !post?.user_id) return;
        const newFollowing = !isFollowing;
        setIsFollowing(newFollowing);

        if (newFollowing) {
            await db.social.from('follows').insert({ follower_id: user.id, following_id: post.user_id });
        } else {
            await db.social.from('follows').delete().eq('follower_id', user.id).eq('following_id', post.user_id);
        }
    };

    const animatedHeartStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: heartScale.value }]
        };
    });

    const animatedProgressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    const onVideoLoad = useCallback((data: any) => {
        setIsVideoReady(true);
        durationRef.current = data.duration;
    }, []);

    const onVideoProgress = useCallback((data: any) => {
        if (durationRef.current > 0) {
            progress.value = data.currentTime / durationRef.current;
        }
    }, []);

    const handleReport = async (reason: string) => {
        if (!user?.id || !post?.id) return;
        
        try {
            const { error } = await db.social.from('Reported_posts').insert({
                post_id: post.id,
                reason: reason
            });

            if (error) throw error;
            
            setMenuStage('none');
            setIsBlocked(true); // Auto-block locally after report
            Alert.alert("Report Submitted", "Thank you for reporting this post. We will review it shortly.");
        } catch (err: any) {
            console.error(err);
            Alert.alert("Error", err.message || "Could not submit report. Please try again.");
        }
    };

    const handleBlock = async () => {
        console.log("Blocking Post:", post?.id, "User:", user?.id);
        if (!user?.id || !post?.id) {
            console.error("Missing user or post ID");
            return;
        }
        try {
            const { error } = await db.social.from('Block_posts').insert({
                post_id: post.id,
                user_id: user.id
            });
            if (error) throw error;
            setIsBlocked(true);
            setMenuStage('none');
        } catch (err: any) {
            console.error(err);
            Alert.alert("Error", "Could not block post.");
        }
    };

    const handleUnblock = async () => {
        if (!user?.id || !post?.id) return;
        try {
            const { error } = await db.social.from('Block_posts').delete()
                .eq('post_id', post.id)
                .eq('user_id', user.id);
            if (error) throw error;
            setIsBlocked(false);
        } catch (err: any) {
            console.error(err);
            Alert.alert("Error", "Could not unblock post.");
        }
    };

    const handleComment = async () => {
        if (!commentText.trim() || !user?.id || !post?.id) return;
        const text = commentText.trim();
        setCommentText('');
        Keyboard.dismiss();

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

    // Input Ref
    const inputRef = useRef<any>(null);

    const openComments = () => {
        setSheetMode('comments');
        bottomSheetRef.current?.snapToIndex(1); // Open to 90%
        // Auto-focus input after a slight delay to allow mounting
        setTimeout(() => {
            inputRef.current?.focus();
        }, 300);
    };

    const handleBackToRelated = () => {
        setSheetMode('related');
        bottomSheetRef.current?.snapToIndex(0); // Back to 25%
        Keyboard.dismiss();
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
            else animateLike(); // Re-animate if already liked
        }
    };

    // Related Posts Grid
    const { posts: relatedPosts } = useFeed();

    // MEMOIZATION: Prevent re-calculation on every render
    const displayPosts = useMemo(() => {
        return relatedPosts.filter(p => p.id !== post?.id && !p.is_blocked).slice(0, 8);
    }, [relatedPosts, post?.id]);

    const handlePostPress = useCallback((item: any) => {
        navigation.push('FeedPostDetail', { post: item });
    }, [navigation]);

    // Render each comment
    const renderCommentFn = useCallback((comment: any) => (
        <View key={comment.id} style={styles.commentItem}>
            <Image
                source={comment?.Users?.profile_image ? { uri: comment.Users.profile_image } : require('../../../../assets/images/Profilbild.jpg')}
                style={styles.commentAvatar}
            />
            <View style={styles.commentContent}>
                <Text style={[styles.commentUsername, { color: theme.colors.text }]}>{comment?.Users?.username || 'User'}</Text>
                <Text style={[styles.commentText, { color: theme.colors.text }]}>{comment.description}</Text>
            </View>
        </View>
    ), [theme.colors.text]);

    return (
        <GestureHandlerRootView style={styles.container}>
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
                    <LongPressGestureHandler
                        onHandlerStateChange={({ nativeEvent }) => {
                            if (nativeEvent.state === State.ACTIVE) {
                                setMenuStage('initial');
                            }
                        }}
                        minDurationMs={500}
                    >
                        <View style={styles.backgroundContainer}>
                            {isBlocked ? (
                                <View style={[styles.backgroundImage, styles.blockedContainer]}>
                                    <FontAwesome6 name="eye-slash" size={50} color={theme.colors.greyedOut} />
                                    <Text style={[styles.blockedText, { color: theme.colors.greyedOut }]}>Post Blocked</Text>
                                    <TouchableOpacity style={styles.unblockButton} onPress={handleUnblock}>
                                        <Text style={styles.unblockButtonText}>Show Post</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : isTextPost ? (
                                <View style={[styles.spacer, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F5F1' }]}>
                                    <View style={[styles.textCardLarge, { backgroundColor: theme.colors.surface }]}>
                                        <View style={styles.textBadge}>
                                            <Text style={styles.textBadgeText}>Thought</Text>
                                        </View>
                                        <View style={{ flex: 1, justifyContent: 'center' }}>
                                            <Text style={[styles.textPostContent, { color: theme.colors.text }]}>{post?.caption}</Text>
                                        </View>
                                        <FontAwesome6 name="leaf" size={120} color="#4CA771" style={styles.leafIcon} />
                                    </View>
                                </View>
                            ) : mediaUrl ? (
                                isVideo ? (
                                    <View style={{ width: '100%', height: '100%' }}>
                                        <Video
                                            source={{ uri: mediaUrl }}
                                            style={styles.backgroundImage}
                                            poster={mediaUrl}
                                            posterResizeMode="cover"
                                            resizeMode="cover"
                                            repeat
                                            paused={paused}
                                            muted={muted}
                                            playInBackground={false}
                                            playWhenInactive={false}
                                            onLoad={onVideoLoad}
                                            onProgress={onVideoProgress}
                                        />
                                        {/* Video Progress Bar */}
                                        <View style={styles.progressBarContainer}>
                                            <Animated.View style={[styles.progressBar, animatedProgressStyle]} />
                                        </View>
                                    </View>
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

                            {/* Play/Pause Indicator (Optional, shown when paused) */}
                            {paused && isVideo && !isBlocked && (
                                <View style={styles.centerOverlay}>
                                    <FontAwesome6 name="play" size={50} color="white" style={{ opacity: 0.8 }} />
                                </View>
                            )}
                        </View>
                    </LongPressGestureHandler>
                </TapGestureHandler>
            </TapGestureHandler>

            {/* Overlay Layer for Controls (Pointer Events: Box-None) */}
            <SafeAreaView style={styles.overlayContainer} pointerEvents="box-none">
                {/* Header & Mute Row */}
                <View style={styles.topControlsContainer} pointerEvents="box-none">
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                            <FontAwesome6 name="chevron-left" size={20} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.headerButton}>
                            <FontAwesome6 name="magnifying-glass" size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Mute Button positioned relative to header or via flex */}
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
                </View>

                {/* Right Side Actions (Flex aligned to bottom-right) */}
                <Animated.View style={[
                    styles.rightActionsContainer,
                    { backgroundColor: isTextPost ? 'rgba(0,0,0,0.1)' : 'transparent', borderRadius: 30, paddingTop: 10, paddingBottom: 10 },
                    // animatedActionStyle // Assuming animatedActionStyle is defined and used for this component
                ]}>
                    <TouchableOpacity style={styles.rightActionItem} onPress={handleLike}>
                        <Animated.View style={animatedHeartStyle}>
                            <FontAwesome6
                                name={showHeartBreak ? "heart-crack" : "heart"}
                                size={30}
                                color={isLiked || showHeartBreak ? "#FF3B30" : "white"}
                                solid={isLiked || showHeartBreak}
                            />
                        </Animated.View>
                        <Text style={[styles.rightActionText, isTextPost && { color: theme.colors.text, textShadowColor: 'transparent' }]}>{formatNumber(likesCount)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.rightActionItem} onPress={openComments}>
                        <FontAwesome6 name="comment-dots" size={30} color={isTextPost ? theme.colors.text : "white"} />
                        <Text style={[styles.rightActionText, isTextPost && { color: theme.colors.text, textShadowColor: 'transparent' }]}>{formatNumber(post?.comments_count || comments.length || 0)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.rightActionItem}>
                        <FontAwesome6 name="share-nodes" size={30} color={isTextPost ? theme.colors.text : "white"} />
                        <Text style={[styles.rightActionText, isTextPost && { color: theme.colors.text, textShadowColor: 'transparent' }]}>Share</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.rightActionItem} onPress={handleSave}>
                        <FontAwesome6
                            name="bookmark"
                            size={30}
                            color={isSaved ? "#FFD700" : (isTextPost ? theme.colors.text : "white")}
                            solid={isSaved}
                        />
                        <Text style={[styles.rightActionText, isTextPost && { color: theme.colors.text, textShadowColor: 'transparent' }]}>Save</Text>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>

            {/* Dynamic Bottom Sheet */}
            <BottomSheet
                ref={bottomSheetRef}
                index={0} // Open to first snap point (25%)
                snapPoints={snapPoints}
                // animatedIndex={sheetIndex} // This line was not in the original, adding it based on the instruction snippet
                enablePanDownToClose={false}
                backgroundStyle={{ backgroundColor: theme.colors.surface }}
                handleIndicatorStyle={{ backgroundColor: theme.colors.greyedOut }}
                onChange={(index) => {
                    // Slight logic to ensure mode feels correct, mostly handled by explicit state
                }}
            >
                <View style={styles.bottomSheetContainer}>
                    <View style={{ flex: 1 }}>
                        {sheetMode === 'related' ? (
                            <>
                                {/* Header: User Info & Caption */}
                                <View style={styles.userInfoHeader}>
                                    <View style={styles.userRow}>
                                        <Image
                                            source={post?.Users?.profile_image ? { uri: post.Users.profile_image } : require('../../../../assets/images/Profilbild.jpg')}
                                            style={styles.avatar}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.username, { color: theme.colors.text }]}>{post?.Users?.username || 'Observer'}</Text>
                                            <Text style={[styles.caption, { color: theme.colors.text }]} numberOfLines={2}>
                                                {isTextPost ? getHashtags(post?.caption) : (post?.caption || 'My Pink Princess #post #plslikeandfollow')}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.followButton, { backgroundColor: isFollowing ? theme.colors.surface : '#4CA771', borderWidth: isFollowing ? 1 : 0, borderColor: theme.colors.greyedOut }]}
                                            onPress={handleFollow}
                                        >
                                            <Text style={[styles.followButtonText, { color: isFollowing ? theme.colors.text : 'white' }]}>
                                                {isFollowing ? 'Following' : 'Follow'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.scrollHint}>
                                        <Text style={[styles.scrollHintText, { color: theme.colors.greyedOut }]}>Scroll for related posts</Text>
                                        <FontAwesome6 name="chevron-down" size={12} color={theme.colors.greyedOut} />
                                    </View>
                                </View>

                                {/* Scrollable: Grid */}
                                <BottomSheetScrollView contentContainerStyle={styles.gridContent}>
                                    <MasonryFeedGrid
                                        posts={displayPosts}
                                        onPostPress={handlePostPress}
                                    />
                                    <View style={{ height: 20 }} />
                                </BottomSheetScrollView>
                            </>
                        ) : (
                            <>
                                {/* Header: Comments */}
                                <View style={styles.commentsHeader}>
                                    <TouchableOpacity onPress={handleBackToRelated} style={styles.backButton}>
                                        <FontAwesome6 name="arrow-left" size={20} color={theme.colors.text} />
                                    </TouchableOpacity>
                                    <Text style={[styles.bottomSheetTitle, { color: theme.colors.text }]}>Comments ({comments.length})</Text>
                                    <View style={{ width: 20 }} />
                                </View>
                                <View style={styles.divider} />

                                {/* Scrollable: Comments List */}
                                <BottomSheetScrollView contentContainerStyle={styles.commentsList}>
                                    {comments.length === 0 ? (
                                        <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>No comments yet. Be the first!</Text>
                                    ) : (
                                        comments.map(renderCommentFn)
                                    )}
                                    <View style={{ height: 20 }} />
                                </BottomSheetScrollView>
                            </>
                        )}
                    </View>

                    {/* Footer: Input (Always Visible) */}
                    <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: '#f0f0f0' }]}>
                        <Image
                            source={profile?.profile_image ? { uri: profile.profile_image } : require('../../../../assets/images/Profilbild.png')}
                            style={styles.inputAvatar}
                        />
                        <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background }]}>
                            <BottomSheetTextInput
                                ref={inputRef}
                                placeholder="Add a comment..."
                                placeholderTextColor="#999"
                                style={[styles.input, { color: theme.colors.text }]}
                                value={commentText}
                                onChangeText={setCommentText}
                                onSubmitEditing={handleComment}
                                onFocus={() => {
                                    if (sheetMode === 'related') openComments();
                                }}
                            />
                            <TouchableOpacity onPress={handleComment}>
                                <FontAwesome6 name="paper-plane" size={16} color="#4CA771" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </BottomSheet>

            {/* Report/Block Menu Overlay */}
            {menuStage !== 'none' && (
                <View style={[styles.modalOverlay, { zIndex: 9999, elevation: 100 }]}>
                    <TouchableOpacity 
                        style={StyleSheet.absoluteFill} 
                        activeOpacity={1} 
                        onPress={() => setMenuStage('none')}
                    />
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                        {menuStage === 'initial' ? (
                            <>
                                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Options</Text>
                                <TouchableOpacity 
                                    style={styles.reportOption} 
                                    onPress={() => setMenuStage('report')}
                                >
                                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                                        <FontAwesome6 name="flag" size={16} color={theme.colors.text} />
                                        <Text style={[styles.reportOptionText, { color: theme.colors.text }]}>Report Post</Text>
                                    </View>
                                    <FontAwesome6 name="chevron-right" size={14} color={theme.colors.greyedOut} />
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.reportOption} 
                                    onPress={handleBlock}
                                >
                                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                                        <FontAwesome6 name="ban" size={16} color={theme.colors.text} />
                                        <Text style={[styles.reportOptionText, { color: theme.colors.text }]}>Block Post</Text>
                                    </View>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15, width: '100%'}}>
                                    <TouchableOpacity onPress={() => setMenuStage('initial')} style={{padding: 5}}>
                                        <FontAwesome6 name="arrow-left" size={18} color={theme.colors.text} />
                                    </TouchableOpacity>
                                    <Text style={[styles.modalTitle, { color: theme.colors.text, marginBottom: 0, marginLeft: 10 }]}>Report Reason</Text>
                                </View>
                                
                                {reportReasons.map((reason, index) => (
                                    <TouchableOpacity 
                                        key={index} 
                                        style={styles.reportOption} 
                                        onPress={() => handleReport(reason)}
                                    >
                                        <Text style={[styles.reportOptionText, { color: theme.colors.text }]}>{reason}</Text>
                                        <FontAwesome6 name="chevron-right" size={14} color={theme.colors.greyedOut} />
                                    </TouchableOpacity>
                                ))}
                            </>
                        )}

                        <TouchableOpacity 
                            style={styles.cancelButton} 
                            onPress={() => setMenuStage('none')}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </GestureHandlerRootView>
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
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        paddingBottom: 20,
    },
    topControlsContainer: {
        width: '100%',
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingHorizontal: 20,
        flexDirection: 'row',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
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
    muteButton: {
        position: 'absolute',
        top: 100,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rightActionsContainer: {
        alignSelf: 'flex-end', // Align to right
        alignItems: 'center',
        gap: 25,
        marginRight: 15,
        marginBottom: 200, // Push up slightly to clear bottom area
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
    },
    // Removed headerSafeArea style as it is now inline or overlay
    // Bottom Sheet Styles
    bottomSheetContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    userInfoHeader: {
        marginBottom: 10,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    username: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 2,
    },
    caption: {
        fontSize: 14,
        lineHeight: 18,
    },
    followButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginLeft: 10,
    },
    followButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    scrollHint: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        marginBottom: 5,
    },
    scrollHintText: {
        fontSize: 10,
    },
    gridContent: {
        paddingBottom: 20,
    },
    commentsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    backButton: {
        padding: 5,
    },
    bottomSheetTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginBottom: 10,
    },
    commentsList: {
        paddingBottom: 20,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
        backgroundColor: '#ccc',
    },
    commentContent: {
        flex: 1,
    },
    commentUsername: {
        fontWeight: 'bold',
        fontSize: 13,
        marginBottom: 2,
    },
    commentText: {
        fontSize: 14,
        lineHeight: 18,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
    },
    inputAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 12,
        height: 40,
    },
    input: {
        flex: 1,
        height: 40,
    },
    spacer: {
        flex: 1,
        width: '100%',
    },
    textCardLarge: {
        width: width * 0.85,
        height: width * 0.85, // Square card
        borderRadius: 20,
        padding: 20,
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        position: 'relative',
        overflow: 'hidden',
    },
    textBadge: {
        position: 'absolute',
        top: 20,
        left: 20,
        backgroundColor: '#F0F5F1',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        zIndex: 10,
    },
    textBadgeText: {
        color: '#4CA771',
        fontWeight: 'bold',
        fontSize: 12,
    },
    textPostContent: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        lineHeight: 32,
        zIndex: 5,
    },
    leafIcon: {
        position: 'absolute',
        bottom: -20,
        right: -20,
        opacity: 0.1,
    },
    progressBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        zIndex: 10,
    },
    progressBar: {
        height: '100%',
        backgroundColor: 'white',
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalSubtitle: {
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center',
    },
    reportOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    reportOptionText: {
        fontSize: 16,
    },
    cancelButton: {
        marginTop: 20,
        padding: 10,
    },
    cancelButtonText: {
        color: '#FF3B30',
        fontWeight: 'bold',
        fontSize: 16,
    },
    blockedContainer: {
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 15,
        zIndex: 50,
    },
    blockedText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    unblockButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    unblockButtonText: {
        color: 'white',
        fontWeight: '600',
    },
});
