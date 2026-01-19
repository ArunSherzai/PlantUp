import { db } from '../../utils/supabase';

export const BlockService = {
  /**
   * Block a user.
   * @param userId The ID of the user to block.
   */
  async blockUser(userId: string) {
    const { data: { user } } = await db.public.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    // Prevent self-block
    if (user.id === userId) {
      throw new Error('You cannot block yourself.');
    }

    const { error } = await db.social
      .from('user_blocks')
      .insert({
        blocker_id: user.id,
        blocked_id: userId,
      });

    if (error) {
      // Handle duplicate key nicely
      if (error.code === '23505') { // Unique violation
        console.warn('User already blocked');
        return;
      }
      throw error;
    }

    // Unfollow logic (Bidirectional severance)
    // 1. I unfollow them
    // 2. They unfollow me
    await Promise.all([
      db.social
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId),
      db.social
        .from('follows')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', user.id),
      // Delete any conversation between these users
      // Condition: (user_low = me AND user_high = them) OR (user_low = them AND user_high = me)
      db.social
        .from('dm_conversations')
        .delete()
        .or(`and(user_low.eq.${user.id},user_high.eq.${userId}),and(user_low.eq.${userId},user_high.eq.${user.id})`)
    ]);
  },

  /**
   * Unblock a user.
   * @param userId The ID of the user to unblock.
   */
  async unblockUser(userId: string) {
    const { data: { user } } = await db.public.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await db.social
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId);

    if (error) throw error;
  },

  /**
   * Get list of users blocked by the current user.
   */
  async getBlockedUsers() {
    const { data: { user } } = await db.public.auth.getUser();
    if (!user) return [];

    const { data, error } = await db.social
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id);

    if (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }

    return data.map((item: any) => item.blocked_id);
  }
};
