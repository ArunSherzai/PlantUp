import { useState } from 'react';
import { db } from '../../../utils/supabase';
import { getPublicPostUrl } from '../../../utils/media';

export type SearchPost = {
    id: string;
    media_url: string;
    caption: string | null;
    type: string | null;
    likes: number | null;
    shares: number | null;
    comments_count: number | null;
    created_at: string;
    user_id: string;
    is_blocked?: boolean;
    Users?: {
        username: string;
        profile_image: string | null;
    };
};

export function usePostSearch() {
    const [postSearchResults, setPostSearchResults] = useState<SearchPost[]>([]);
    const [postLoading, setPostLoading] = useState(false);

    const searchPosts = async (query: string) => {
        if (!query.trim()) {
            setPostSearchResults([]);
            return;
        }

        setPostLoading(true);
        try {
            // 1. Search Posts
            const { data: posts, error } = await db.social
                .from('Posts')
                .select('*')
                .ilike('caption', `%${query}%`)
                .order('created_at', { ascending: false })
                .limit(30);

            if (error) throw error;

            if (!posts || posts.length === 0) {
                setPostSearchResults([]);
                setPostLoading(false);
                return;
            }

            // 2. Fetch user data for these posts
            const userIds = [...new Set(posts.map((p: any) => p.user_id))];
            const { data: usersData } = await db.user
                .from('Users')
                .select('id, username, avatar_path')
                .in('id', userIds);

            const usersMap = new Map();
            usersData?.forEach((u: any) => usersMap.set(u.id, u));

            // 3. Merge posts with user data
            const mergedPosts: SearchPost[] = posts.map((post: any) => {
                const postUser = usersMap.get(post.user_id);
                let profileImageUrl = null;

                if (postUser?.avatar_path) {
                    if (postUser.avatar_path.startsWith('http')) {
                        profileImageUrl = postUser.avatar_path;
                    } else {
                        const { data: urlData } = db.public.storage
                            .from('avatar')
                            .getPublicUrl(postUser.avatar_path);
                        profileImageUrl = urlData.publicUrl;
                    }
                }

                return {
                    ...post,
                    media_url: getPublicPostUrl(post.media_url) || post.media_url,
                    is_blocked: false, // You might want to filter this later based on current user's Block_posts
                    Users: postUser
                        ? { username: postUser.username, profile_image: profileImageUrl }
                        : undefined,
                };
            });

            setPostSearchResults(mergedPosts);
        } catch (error) {
            console.error('Error searching posts:', error);
            setPostSearchResults([]);
        } finally {
            setPostLoading(false);
        }
    };

    const clearPostSearch = () => {
        setPostSearchResults([]);
    };

    return { postSearchResults, postLoading, searchPosts, clearPostSearch };
}
