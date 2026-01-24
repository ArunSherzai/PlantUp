import { db } from './supabase';

const DEFAULT_AVATAR = require('../../assets/images/Profilbild.jpg');

/**
 * Get avatar source for Image component.
 * Returns Profilbild.jpg as default when no avatar is set.
 */
export const getAvatarSource = (avatarPath: string | null | undefined) => {
    if (!avatarPath) return DEFAULT_AVATAR;
    if (avatarPath.startsWith('http')) return { uri: avatarPath };

    const { data } = db.public.storage.from('avatar').getPublicUrl(avatarPath);
    return { uri: data.publicUrl };
};
