import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, Dimensions, TextInput, ScrollView } from 'react-native';
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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableBottomSheet from '../../../components/DraggableBottomSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// We need the RouteProp to access params
type FeedPostDetailRouteProp = RouteProp<RootStackParamList, 'FeedPostDetail'>;

const { height, width } = Dimensions.get('window');

export default function FeedPostDetailScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation<any>();
    const route = useRoute<FeedPostDetailRouteProp>();
    const insets = useSafeAreaInsets();

    // Fallback if no params (dev safety), though FeedScreen will pass them
    const post = route.params?.post;

    // Fetch related posts (for now just all posts)
    const { posts: relatedPosts } = useFeed();

    // Mock slice for "Related"
    const displayPosts = relatedPosts.filter(p => p.id !== post?.id).slice(0, 4);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                {/* Fixed Background Content */}
                {getDisplayMedia(post) ? (
                    <Image
                        source={{ uri: getDisplayMedia(post) }}
                        style={styles.backgroundImage}
                        resizeMode="cover"
                    />
                ) : (
                    // Logic for Thought Post Background
                    <View style={[styles.backgroundImage, { backgroundColor: '#F0F5F1', justifyContent: 'center', alignItems: 'center' }]}>
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

                {/* Fixed Header */}
                <View style={[styles.headerSafeArea, { paddingTop: insets.top }]}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                            <FontAwesome6 name="chevron-left" size={20} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.headerButton}>
                            <FontAwesome6 name="magnifying-glass" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Draggable Bottom Sheet */}
                <DraggableBottomSheet initialHeight={0.4} maxHeight={0.9}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}>
                        {/* User Info Row */}
                        <View style={styles.userInfoRow}>
                            <View style={styles.userSection}>
                                <Image
                                    source={require('../../../../assets/images/Profilbild.png')} // Mock avatar or from Post payload if users linked
                                    style={styles.avatar}
                                />
                                <View style={styles.textSection}>
                                    {/* Mock username for now as DB might not have joined user data yet, or use generic fallback */}
                                    <Text style={[styles.username, { color: theme.colors.text }]}>Greenout123</Text>
                                    <Text style={[styles.caption, { color: theme.colors.text }]} numberOfLines={2}>
                                        {post?.caption || 'My Pink Princess #post #plslikeandfollow'}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity style={[styles.followButton, { backgroundColor: '#4CA771' }]}>
                                <Text style={styles.followButtonText}>Follow</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        {/* Comments Section */}
                        <View style={styles.commentsSection}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Comments</Text>
                            <Text style={styles.commentPrompt}>Love this Picture? Add a comment!</Text>

                            <View style={styles.commentInputRow}>
                                <Image
                                    source={require('../../../../assets/images/Profilbild.png')} // User's own avatar
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
                    </ScrollView>
                </DraggableBottomSheet>

            </View>
        </GestureHandlerRootView>
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
        zIndex: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    headerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.2)',
        width: "20%",
        justifyContent: "center",
    },
    headerText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
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
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        paddingHorizontal: 15,
        height: 40,
    },
    input: {
        flex: 1,
        color: 'black',
    },
});
