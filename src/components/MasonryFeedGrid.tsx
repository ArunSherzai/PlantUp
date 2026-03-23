
import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import FeedCard from './FeedCard';
import { getDisplayMedia } from '../utils/media';
import { Post } from '../hooks/usePosts';

const { width } = Dimensions.get('window');
const GAP = width * 0.04; // ~15px on mobile, scales up

interface MasonryFeedGridProps {
    posts: Post[];
    onPostPress: (post: Post) => void;
    onPostLongPress?: (post: Post) => void;
    onPostMenuPress?: (post: Post) => void;
}

// Helper to group posts
const groupPosts = (posts: Post[]) => {
    const groups = [];
    for (let i = 0; i < posts.length; i += 4) {
        groups.push({
            id: `group-${i}`,
            items: posts.slice(i, i + 4),
        });
    }
    return groups;
};

const MasonryFeedGrid = React.memo(({ posts, onPostPress, onPostLongPress, onPostMenuPress }: MasonryFeedGridProps) => {
    const groups = useMemo(() => groupPosts(posts), [posts]);

    // Helper to extract hashtags
    const getHashtags = (text: string | null) => {
        if (!text) return [];
        const matches = text.match(/#\w+/g);
        return matches ? matches.map(tag => tag.substring(1)) : [];
    };

    return (
        <View style={styles.container}>
            {groups.map((group, index) => {
                const [p1, p2, p3, p4] = group.items;
                const isLastGroup = index === groups.length - 1;
                const remainingCount = group.items.length;

                // Special case for last 2 posts: Render side-by-side
                if (isLastGroup && remainingCount === 2) {
                    return (
                        <View key={group.id} style={styles.row}>
                            <View style={styles.col}>
                                <FeedCard
                                    imageUri={{ uri: getDisplayMedia(p1) }}
                                    caption={p1.caption || ''}
                                    hashtags={getHashtags(p1.caption)}
                                    isVideo={p1.type === 'video' || p1.type === 'reel'}
                                    postType={p1.type ?? undefined}
                                    sensorData={p1.caption ?? undefined}
                                    onPress={() => onPostPress(p1)}
                                    onLongPress={onPostLongPress ? () => onPostLongPress(p1) : undefined}
                                    onMenuPress={onPostMenuPress ? () => onPostMenuPress(p1) : undefined}
                                    username={p1.Users?.username}
                                    userAvatar={p1.Users?.profile_image ? { uri: p1.Users.profile_image } : null}
                                    aspectRatio={1}
                                    style={{ flex: 1 }}
                                    hideCaption={true}
                                />
                            </View>
                            <View style={styles.col}>
                                <FeedCard
                                    imageUri={{ uri: getDisplayMedia(p2) }}
                                    caption={p2.caption || ''}
                                    hashtags={getHashtags(p2.caption)}
                                    isVideo={p2.type === 'video' || p2.type === 'reel'}
                                    postType={p2.type ?? undefined}
                                    sensorData={p2.caption ?? undefined}
                                    onPress={() => onPostPress(p2)}
                                    onLongPress={onPostLongPress ? () => onPostLongPress(p2) : undefined}
                                    onMenuPress={onPostMenuPress ? () => onPostMenuPress(p2) : undefined}
                                    username={p2.Users?.username}
                                    userAvatar={p2.Users?.profile_image ? { uri: p2.Users.profile_image } : null}
                                    aspectRatio={1}
                                    style={{ flex: 1 }}
                                    hideCaption={true}
                                />
                            </View>
                        </View>
                    );
                }

                return (
                    <View key={group.id} style={styles.row}>
                        {/* LEFT COLUMN: Tall (p1) then Short (p2) */}
                        <View style={styles.col}>
                            {p1 && (
                                <FeedCard
                                    imageUri={{ uri: getDisplayMedia(p1) }}
                                    caption={p1.caption || ''}
                                    hashtags={getHashtags(p1.caption)}
                                    isVideo={p1.type === 'video' || p1.type === 'reel'}
                                    postType={p1.type ?? undefined}
                                    sensorData={p1.caption ?? undefined}
                                    onPress={() => onPostPress(p1)}
                                    onLongPress={onPostLongPress ? () => onPostLongPress(p1) : undefined}
                                    onMenuPress={onPostMenuPress ? () => onPostMenuPress(p1) : undefined}
                                    username={p1.Users?.username}
                                    userAvatar={p1.Users?.profile_image ? { uri: p1.Users.profile_image } : null}
                                    aspectRatio={0.71}
                                    style={{ flex: 1 }}
                                />
                            )}
                            {p2 && (
                                <FeedCard
                                    imageUri={{ uri: getDisplayMedia(p2) }}
                                    caption={p2.caption || ''}
                                    hashtags={getHashtags(p2.caption)}
                                    isVideo={p2.type === 'video' || p2.type === 'reel'}
                                    postType={p2.type ?? undefined}
                                    sensorData={p2.caption ?? undefined}
                                    onPress={() => onPostPress(p2)}
                                    onLongPress={onPostLongPress ? () => onPostLongPress(p2) : undefined}
                                    onMenuPress={onPostMenuPress ? () => onPostMenuPress(p2) : undefined}
                                    username={p2.Users?.username}
                                    userAvatar={p2.Users?.profile_image ? { uri: p2.Users.profile_image } : null}
                                    aspectRatio={1.53}
                                    style={{ flex: 1 }}
                                    hideCaption={true}
                                />
                            )}
                        </View>

                        {/* RIGHT COLUMN: Short (p3) then Tall (p4) */}
                        <View style={styles.col}>
                            {p3 && (
                                <FeedCard
                                    imageUri={{ uri: getDisplayMedia(p3) }}
                                    caption={p3.caption || ''}
                                    hashtags={getHashtags(p3.caption)}
                                    isVideo={p3.type === 'video' || p3.type === 'reel'}
                                    postType={p3.type ?? undefined}
                                    sensorData={p3.caption ?? undefined}
                                    onPress={() => onPostPress(p3)}
                                    onLongPress={onPostLongPress ? () => onPostLongPress(p3) : undefined}
                                    onMenuPress={onPostMenuPress ? () => onPostMenuPress(p3) : undefined}
                                    username={p3.Users?.username}
                                    userAvatar={p3.Users?.profile_image ? { uri: p3.Users.profile_image } : null}
                                    aspectRatio={1.53}
                                    style={{ flex: 1 }}
                                    hideCaption={true}
                                />
                            )}
                            {p4 && (
                                <FeedCard
                                    imageUri={{ uri: getDisplayMedia(p4) }}
                                    caption={p4.caption || ''}
                                    hashtags={getHashtags(p4.caption)}
                                    isVideo={p4.type === 'video' || p4.type === 'reel'}
                                    postType={p4.type ?? undefined}
                                    sensorData={p4.caption ?? undefined}
                                    onPress={() => onPostPress(p4)}
                                    onLongPress={onPostLongPress ? () => onPostLongPress(p4) : undefined}
                                    onMenuPress={onPostMenuPress ? () => onPostMenuPress(p4) : undefined}
                                    username={p4.Users?.username}
                                    userAvatar={p4.Users?.profile_image ? { uri: p4.Users.profile_image } : null}
                                    aspectRatio={0.71}
                                    style={{ flex: 1 }}
                                    hideCaption={true}
                                />
                            )}
                        </View>
                    </View>
                );
            })}
        </View>
    );
});

export default MasonryFeedGrid;

const styles = StyleSheet.create({
    container: {
        gap: GAP, // Vertical gap between Rows
    },
    row: {
        flexDirection: 'row',
        gap: GAP, // Horizontal gap between Columns
    },
    col: {
        flex: 1,
        gap: GAP, // Vertical gap between Items in Column
    },
});
