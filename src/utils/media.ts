import { db } from './supabase';

export const getPublicPostUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;

    const { data } = db.public.storage
        .from('post-media')
        .getPublicUrl(path);

    return data.publicUrl;
};

export const getPublicPlantImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;

    const { data } = db.public.storage
        .from('plant-images')
        .getPublicUrl(path);

    return data.publicUrl;
};

export const getPublicProgressImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;

    const { data } = db.public.storage
        .from('plant-progress')
        .getPublicUrl(path);

    return data.publicUrl;
};

export const getDisplayMedia = (post: any) => {
    let url = getPublicPostUrl(post.media_url);

    if (!url) return undefined;

    // If video, try to find thumbnail
    if (post.type === 'video' || post.type === 'reel' || url.endsWith('.mp4')) {
        // Heuristic based on screenshot: reelX.mp4 -> thumbX.png
        // Replace 'reel' with 'thumb' and extension
        return url.replace('.mp4', '.png');
    }

    return url;
};
