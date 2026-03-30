import React, { useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUnistyles } from '~/lib/unistyles';
import { Post, usePosts } from '../../../../hooks/usePosts';
import { FontAwesome5 } from '@expo/vector-icons';
import MasonryFeedGrid from '../../../../components/MasonryFeedGrid';
import { useUserStore } from '../../../../stores/UserStore';
import { deletePost } from '../../../../features/social/api/deletePost';
import DeletePostModal from './DeletePostModal';

interface PostListTabProps {
    userId?: string;
    likedBy?: string;
    emptyMessage?: string;
}

export default function PostListTab({ userId, likedBy, emptyMessage = 'No posts found.' }: PostListTabProps) {
    const { theme } = useUnistyles();
    const navigation = useNavigation<any>();
    const currentUser = useUserStore((state) => state.user);
    const { posts: allPosts, loading, error, refreshPosts } = usePosts({ userId, likedBy });
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const posts = allPosts.filter(p => !p.is_blocked);
    const canDeletePosts = !!currentUser?.id && !!userId && currentUser.id === userId && !likedBy;

    const handleDeletePost = (post: Post) => {
        if (!currentUser?.id) return;

        setDeleteError(null);
        setSelectedPost(post);
    };

    const closeDeleteModal = () => {
        if (isDeleting) return;

        setSelectedPost(null);
        setDeleteError(null);
    };

    const confirmDeletePost = async () => {
        if (!currentUser?.id || !selectedPost) return;

        setIsDeleting(true);
        setDeleteError(null);

        try {
            const result = await deletePost(selectedPost.id, currentUser.id);

            if (!result.success) {
                setDeleteError(result.message || 'Please try again.');
                return;
            }

            setSelectedPost(null);
            await refreshPosts();
        } finally {
            setIsDeleting(false);
        }
    };

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
            <View style={styles.emptyContainer}>
                <FontAwesome5 name="images" size={48} color={theme.colors.greyedOut} style={{ marginBottom: 16 }} />
                <Text style={[styles.emptyText, { color: theme.colors.typography }]}>{emptyMessage}</Text>
                {/* Distance below as requested */}
                <View style={{ height: 60 }} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MasonryFeedGrid
                posts={posts}
                onPostPress={(post) => navigation.navigate('FeedPostDetail', { post })}
                onPostMenuPress={canDeletePosts ? handleDeletePost : undefined}
                onPostLongPress={canDeletePosts ? handleDeletePost : undefined}
            />
            <DeletePostModal
                visible={!!selectedPost}
                deleting={isDeleting}
                errorMessage={deleteError}
                onClose={closeDeleteModal}
                onConfirm={confirmDeletePost}
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
    emptyContainer: {
        width: '100%',
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
        opacity: 0.7,
        textAlign: 'center',
    },
});
