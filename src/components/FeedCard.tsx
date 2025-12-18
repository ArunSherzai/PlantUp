import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

interface FeedCardProps {
    imageUri?: any;
    caption?: string;
    hashtags?: string[];
    isVideo?: boolean;
    style?: any;
    onPress?: () => void;
    username?: string;
    userAvatar?: any;
    aspectRatio?: number;
    hideCaption?: boolean;
}

export default function FeedCard({ imageUri, caption, hashtags, isVideo, style, onPress, username, userAvatar, aspectRatio, hideCaption }: FeedCardProps) {
    const { theme } = useUnistyles();
    const hasMedia = imageUri?.uri || (typeof imageUri === 'number');

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor: theme.colors.surface }, // Revert to surface always
                style
            ]}
            onPress={onPress}
            activeOpacity={0.9}
        >
            {hasMedia ? (
                <>
                    <View style={[styles.imageContainer, aspectRatio ? { aspectRatio } : undefined]}>
                        <Image source={imageUri} style={styles.image} resizeMode="cover" />
                        {isVideo && (
                            <View style={styles.playIconContainer}>
                                <FontAwesome6 name="play" size={12} color="white" />
                            </View>
                        )}
                        {/* Menu button overlaying image for media posts */}
                        <TouchableOpacity style={[styles.menuButton, { bottom: 8, right: 8 }]}>
                            <FontAwesome6 name="ellipsis" size={16} color="white" />
                        </TouchableOpacity>
                    </View>


                </>
            ) : (
                // Text Only Card Layout (Mimicking Image Structure)
                <>
                    <View style={[
                        styles.imageContainer, // Inherit shape/radius
                        { backgroundColor: theme.colors.surface, borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
                        aspectRatio ? { aspectRatio } : undefined
                    ]}>

                        {/* Badge at top */}
                        <View style={[styles.badge, { backgroundColor: theme.colors.background, marginTop: 12, marginLeft: 12 }]}>
                            <Text style={[styles.badgeText, { color: theme.colors.primary }]}>Thought</Text>
                        </View>

                        {/* Main Content (Centered in Box) */}
                        <View style={{ paddingHorizontal: 12, flex: 1, justifyContent: 'center' }}>
                            <Text style={[styles.textBody, { color: theme.colors.text, marginBottom: 0 }]} numberOfLines={aspectRatio && aspectRatio < 1 ? 8 : 4}>
                                {caption ? caption.replace(/#\w+/g, '').trim() : "No content"}
                            </Text>
                        </View>

                        {/* Menu button (Ellipsis) - Same position as media posts */}
                        <TouchableOpacity style={[styles.menuButton, { bottom: 8, right: 8 }]}>
                            <FontAwesome6 name="ellipsis" size={16} color="white" />
                        </TouchableOpacity>
                    </View>


                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        // overflow: 'hidden', // Remove overflow hidden if we want shadow on card, but usually needed for image clipping
        // For "all corners of image rounded", we can just round the image container.
        marginBottom: 16,
        flex: 1,
        position: 'relative',
        // backgroundColor handled by props
    },
    textCardContainer: {
        borderLeftWidth: 4,
        padding: 12,
        minHeight: 140,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 0.8,
        borderRadius: 16, // Round all corners of the image
        overflow: 'hidden', // Clip the image to radius
        position: 'relative', // For absolute positioned children inside
    },
    image: {
        width: '100%',
        height: '100%',
    },
    playIconContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -16,
        marginTop: -16,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 32,
        padding: 0,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'white'
    },
    menuButton: {
        position: 'absolute',
        padding: 4,
        zIndex: 10,
        // backgroundColor: 'rgba(0,0,0,0.3)', // Removed grey background
        // Add shadow text if white on image?
    },
    content: {
        padding: 10,
        paddingRight: 10,
    },
    caption: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
        // color: '#000', // Handled by theme
    },
    hashtags: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
    // Text Card Styles
    textWaitWrapper: {
        flex: 1,
    },
    textHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatarPlaceholder: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
    },
    username: {
        fontSize: 12,
        fontWeight: '600',
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 8,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    textBody: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
        marginBottom: 12,
    },
    textFooter: {
        flexDirection: 'row',
        marginTop: 'auto',
        paddingBottom: 20,
        paddingRight: 20,
        paddingLeft: 20,
    }
});
