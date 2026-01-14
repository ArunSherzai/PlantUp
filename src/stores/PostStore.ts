import { create } from 'zustand';
import { Post } from '../hooks/usePosts';

interface PostState {
    posts: Post[];
    page: number;
    loading: boolean;
    hasMore: boolean;
    error: string | null;

    setPosts: (posts: Post[]) => void;
    appendPosts: (posts: Post[]) => void;
    setPage: (page: number) => void;
    setLoading: (loading: boolean) => void;
    setHasMore: (hasMore: boolean) => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

export const usePostStore = create<PostState>((set) => ({
    posts: [],
    page: 0,
    loading: false,
    hasMore: true,
    error: null,

    setPosts: (posts) => set({ posts }),
    appendPosts: (newPosts) => set((state) => {
        // Filter out duplicates just in case
        const existingIds = new Set(state.posts.map(p => p.id));
        const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
        return { posts: [...state.posts, ...uniqueNewPosts] };
    }),
    setPage: (page) => set({ page }),
    setLoading: (loading) => set({ loading }),
    setHasMore: (hasMore) => set({ hasMore }),
    setError: (error) => set({ error }),
    reset: () => set({ posts: [], page: 0, loading: false, hasMore: true, error: null }),
}));
