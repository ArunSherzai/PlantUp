/**
 * Mentor criteria: level >= 25 AND at least 5 posts
 */
export const MENTOR_MIN_LEVEL = 25;
export const MENTOR_MIN_POSTS = 5;

export const isMentor = (level: number, postCount: number): boolean => {
    return level >= MENTOR_MIN_LEVEL && postCount >= MENTOR_MIN_POSTS;
};
