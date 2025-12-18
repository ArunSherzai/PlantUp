import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, Dimensions, TextInput, Animated, ScrollView } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { RootStackParamList } from '../../../navigation/Root';
import FeedCard from '../../../components/FeedCard';
import MasonryFeedGrid from '../../../components/MasonryFeedGrid';
import { useFeed } from '../../../hooks/useFeed';
import { db } from '../../../utils/supabase';
import { useUserStore } from '../../../stores/UserStore';
import { useState, useEffect } from 'react';
import { getDisplayMedia } from '../../../utils/media';

// We need the RouteProp to access params
type FeedPostDetailRouteProp = RouteProp<RootStackParamList, 'FeedPostDetail'>;

const { height, width } = Dimensions.get('window');

export default function FeedPostDetailScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation<any>();
    const route = useRoute<FeedPostDetailRouteProp>();
    const { profile } = useUserStore();

    // Animation Value
    const scrollY = useRef(new Animated.Value(0)).current;

    // Fallback if no params (dev safety), though FeedScreen will pass them
    const post = route.params?.post;

    // Fetch related posts (for now just all posts)
    const { posts: relatedPosts } = useFeed();

    // Mock slice for "Related"
    const displayPosts = relatedPosts.filter(p => p.id !== post?.id).slice(0, 4);

    // Opacity Interpolation: Hidden at 0, Visible by 150 scroll
    const contentOpacity = scrollY.interpolate({
        inputRange: [0, 150],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    // Translation Interpolation: Slide up slightly
    const contentTranslateY = scrollY.interpolate({
        inputRange: [0, 150],
        outputRange: [30, 0],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
            {/* Fixed Background Content */}
            {getDisplayMedia(post) ? (
                <Image
                    source={{ uri: getDisplayMedia(post) }}
                    style={styles.backgroundImage}
                    resizeMode="contain"
                />
            ) : (
                <View style={[styles.backgroundImage, { backgroundColor: '#F0F5F1' }]} />
            )}

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

            {/* Scrollable Overlay */}
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
                {/* Transparent Spacer to show image */}
                {/* Spacer or Text Card */}
                {getDisplayMedia(post) ? (
                    <View style={styles.spacer} />
                ) : (
                    <View style={[styles.spacer, { justifyContent: 'center', alignItems: 'center' }]}>
                        <View style={[styles.textCardLarge, { backgroundColor: theme.colors.surface }]}>
                            <View style={styles.textBadge}>
                                <Text style={styles.textBadgeText}>Thought</Text>
                            </View>
                            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                                <Text style={[styles.textPostContent, { color: theme.colors.text }]}>{post?.caption}</Text>
                            </ScrollView>
                            <FontAwesome6 name="leaf" size={120} color="#4CA771" style={styles.leafIcon} />
                        </View>
                    </View>
                )}

                {/* White Content Card */}
                <View style={[styles.contentCard, { backgroundColor: theme.colors.surface }]}>
                    {/* User Info Row - ALWAYS VISIBLE */}
                    <View style={styles.userInfoRow}>
                        <View style={styles.userSection}>
                            <Image
                                source={post?.Users?.profile_image ? { uri: post.Users.profile_image } : require('../../../../assets/images/Profilbild.jpg')}
                                style={styles.avatar}
                            />
                            <View style={styles.textSection}>
                                {/* Use username from Post data */}
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

                    {/* Scroll Hint - ALWAYS VISIBLE */}
                    <View style={styles.footer}>
                        <FontAwesome6 name="chevron-down" size={14} color={theme.colors.greyedOut || '#999'} />
                        <Text style={[styles.footerText, { color: theme.colors.greyedOut || '#999' }]}>Scroll for more actions...</Text>
                    </View>

                    {/* Hidden Content (Fades in) */}
                    <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
                        <View style={styles.divider} />

                        {/* Comments Section */}
                        <View style={styles.commentsSection}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Comments</Text>
                            <Text style={styles.commentPrompt}>Love this Picture? Add a comment!</Text>

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
                                    />
                                    <TouchableOpacity>
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
    backgroundImage: {
        width: width,
        height: height, // Full screen
        position: 'absolute',
        top: 0,
        left: 0,
    },
    textCardLarge: {
        width: width * 0.85,
        aspectRatio: 0.8,
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        position: 'relative',
        overflow: 'hidden',
    },
    textBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    textBadgeText: {
        color: '#4CA771',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    textPostContent: {
        fontSize: 24,
        fontWeight: '600',
        color: '#2D3436',
        lineHeight: 32,
    },
    leafIcon: {
        position: 'absolute',
        bottom: -20,
        right: -20,
        opacity: 0.1,
        transform: [{ rotate: '-15deg' }],
    },
    headerSafeArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20, // ensure header is above scrollview initially if we want it clickable?
        // Actually, if ScrollView is on top, it might block header clicks if spacer catches touches.
        // We can make spacer pointerEvents="none" or put Header zIndex higher.
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10, // Adjust for safe area
    },
    headerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.2)', // Slight dim for readability
        width: "20%",
        justifyContent: "center",
    },
    headerText: {
        color: 'Black',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
    },
    scrollView: {
        flex: 1,
        zIndex: 10,
    },
    scrollContent: {
        flexGrow: 1,
    },
    spacer: {
        height: height - 100, // Reduced visible area to ~100px
    },
    contentCard: {
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 24,
        paddingTop: 24,
        minHeight: height * 0.8, // Ensure enough scrollable content
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
        color: '#000',
        marginBottom: 2,
    },
    caption: {
        fontSize: 14,
        color: '#333',
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
        marginBottom: 15, // Space before contents
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
        backgroundColor: '#F5F5F5', // Light grey input bg
        borderRadius: 20,
        paddingHorizontal: 15,
        height: 40,
    },
    input: {
        flex: 1,
        color: 'black',
    },
    masonryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    column: {
        width: (width - 48 - 15) / 2, // width - padding*2 - gap
    },
    cardSpacing: {
        marginBottom: 15,
    },
});
