import { db } from '~/utils/supabase';

type DeletePostResult = {
  success: boolean;
  message?: string;
};

const buildRelatedMediaPaths = (mediaPath: string | null, type: string | null) => {
  if (!mediaPath || mediaPath.startsWith('http')) {
    return [];
  }

  const paths = [mediaPath];

  if (type === 'video' || type === 'reel') {
    const thumbnailPath = mediaPath.replace(/\.[^/.]+$/, '.png');
    if (thumbnailPath !== mediaPath) {
      paths.push(thumbnailPath);
    }
  }

  return paths;
};

export async function deletePost(postId: string, userId: string): Promise<DeletePostResult> {
  const { data: post, error: fetchError } = await db.social
    .from('Posts')
    .select('id, user_id, media_url, type')
    .eq('id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, message: fetchError.message };
  }

  if (!post) {
    return { success: false, message: 'Post not found or not owned by this user.' };
  }

  const cleanupTables = ['Comments', 'post_interactions', 'Block_posts', 'Reported_posts'];

  const cleanupResults = await Promise.all(
    cleanupTables.map((table) => db.social.from(table).delete().eq('post_id', postId))
  );

  const cleanupError = cleanupResults.find((result) => result.error)?.error;
  if (cleanupError) {
    return { success: false, message: cleanupError.message };
  }

  const { error: deleteError } = await db.social
    .from('Posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId);

  if (deleteError) {
    return { success: false, message: deleteError.message };
  }

  const mediaPaths = buildRelatedMediaPaths(post.media_url, post.type);
  if (mediaPaths.length > 0) {
    const { error: storageError } = await db.public.storage.from('post-media').remove(mediaPaths);
    if (storageError) {
      console.warn('[deletePost] Post deleted but storage cleanup failed:', storageError.message);
      return {
        success: true,
        message: 'Post deleted, but some media cleanup may still be needed.',
      };
    }
  }

  return { success: true };
}
