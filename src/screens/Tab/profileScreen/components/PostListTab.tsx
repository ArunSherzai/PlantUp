import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUnistyles } from 'react-native-unistyles';
import { usePosts } from '../../../../hooks/usePosts';
import MasonryFeedGrid from '../../../../components/MasonryFeedGrid';

interface PostListTabProps {
    userId?: string;
    likedBy?: string;
    emptyMessage?: string;
}

export default function PostListTab({ userId, likedBy, emptyMessage = 'No posts found.' }: PostListTabProps) {
    const { theme } = useUnistyles();
    const navigation = useNavigation<any>();
    const { posts: allPosts, loading, error } = usePosts({ userId, likedBy });

    const posts = allPosts.filter(p => !p.is_blocked);

    if (loading && posts.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={{ color: 'red' }}>Error: {error}</Text>
            </View>
        );
    }

    if (posts.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <Text style={{ color: theme.colors.typography, fontStyle: 'italic' }}>{emptyMessage}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MasonryFeedGrid
                posts={posts}
                onPostPress={(post) => navigation.navigate('FeedPostDetail', { post })} // Assuming 'FeedPostDetail' exists and takes 'post'
            />
            <View style={{ height: 100 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
