import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

const { width, height } = Dimensions.get('window');
const vw = width / 100;
const vh = height / 100;

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

const FeedCard = React.memo(({ imageUri, caption, hashtags, isVideo, style, onPress, username, userAvatar, aspectRatio, hideCaption }: FeedCardProps) => {
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
                                <FontAwesome6 name="play" size={vw * 3} color="white" />
                            </View>
                        )}
                        {/* Menu button overlaying image for media posts */}
                        <TouchableOpacity style={[styles.menuButton, { bottom: 8, right: 8 }]}>
                            <FontAwesome6 name="ellipsis" size={vw * 4} color="white" />
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
                        <View style={[styles.badge, { backgroundColor: theme.colors.background }]}>
                            <Text style={[styles.badgeText, { color: theme.colors.primary }]}>Thought</Text>
                        </View>

                        {/* Main Content (Centered in Box) */}
                        <View style={{ paddingHorizontal: vw * 3, flex: 1, justifyContent: 'center' }}>
                            <Text style={[styles.textBody, { color: theme.colors.text, marginBottom: 0 }]} numberOfLines={aspectRatio && aspectRatio < 1 ? 8 : 4}>
                                {caption ? caption.replace(/#\w+/g, '').trim() : "No content"}
                            </Text>
                        </View>

                        {/* Menu button (Ellipsis) - Same position as media posts */}
                        <TouchableOpacity style={[styles.menuButton, { bottom: 8, right: 8 }]}>
                            <FontAwesome6 name="ellipsis" size={vw * 4} color="white" />
                        </TouchableOpacity>
                    </View>


                </>
            )}
        </TouchableOpacity>
    );
});

export default FeedCard;

const styles = StyleSheet.create({
    container: {
        borderRadius: vw * 4,
        // overflow: 'hidden', // Remove overflow hidden if we want shadow on card, but usually needed for image clipping
        // For "all corners of image rounded", we can just round the image container.
        marginBottom: vh * 2,
        flex: 1,
        position: 'relative',
        // backgroundColor handled by props
    },
    textCardContainer: {
        borderLeftWidth: 4,
        padding: vw * 3,
        minHeight: vh * 18,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 0.8,
        borderRadius: vw * 4, // Round all corners of the image
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
        marginLeft: - (vw * 8) / 2,
        marginTop: - (vw * 8) / 2,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: vw * 8,
        padding: 0,
        width: vw * 8,
        height: vw * 8,
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
        padding: vw * 2.5,
        paddingRight: vw * 2.5,
    },
    caption: {
        fontSize: vw * 3,
        fontWeight: '500',
        marginBottom: vh * 0.5,
        // color: '#000', // Handled by theme
    },
    hashtags: {
        fontSize: vw * 2.8,
        fontWeight: '600',
        marginTop: vh * 0.5,
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
        width: vw * 5,
        height: vw * 5,
        borderRadius: vw * 2.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
    },
    username: {
        fontSize: vw * 3,
        fontWeight: '600',
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: vw * 2,
        paddingVertical: vh * 0.25,
        borderRadius: 4,
        marginBottom: vh * 1,
        marginTop: vh * 1.5,
        marginLeft: vw * 3,
    },
    badgeText: {
        fontSize: vw * 2.5,
        fontWeight: '700',
    },
    textBody: {
        fontSize: vw * 3.5,
        fontWeight: '500',
        lineHeight: vw * 5,
        marginBottom: vh * 1.5,
    },
    textFooter: {
        flexDirection: 'row',
        marginTop: 'auto',
        paddingBottom: vh * 2.5,
        paddingRight: vw * 5,
        paddingLeft: vw * 5,
    }
});
