export const getDisplayMedia = (post: any) => {
    let url = post.media_url;
    if (!url) return null;

    // If relative path, prepend bucket URL
    if (!url.startsWith('http')) {
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        // Assuming bucket is 'post-media'
        url = `${supabaseUrl}/storage/v1/object/public/post-media/${url}`;
    }

    // If video, try to find thumbnail
    if (post.type === 'video' || post.type === 'reel' || url.endsWith('.mp4')) {
        // Heuristic based on screenshot: reelX.mp4 -> thumbX.png
        // Replace 'reel' with 'thumb' and extension
        return url.replace('reel', 'thumb').replace('.mp4', '.png');
    }

    return url;
};
