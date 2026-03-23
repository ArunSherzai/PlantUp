import * as React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { LinearGradient } from 'expo-linear-gradient';

const SENSOR_MARKER = '|||SENSOR_DATA|||';

// Helper to extract sensor JSON from caption
const extractSensorData = (caption: string | undefined): any | null => {
    if (!caption) return null;
    const idx = caption.indexOf(SENSOR_MARKER);
    if (idx === -1) return null;
    try {
        return JSON.parse(caption.slice(idx + SENSOR_MARKER.length));
    } catch {
        return null;
    }
};

// Helper to get display caption (without sensor data)
const getDisplayCaption = (caption: string | undefined): string => {
    if (!caption) return '';
    const idx = caption.indexOf(SENSOR_MARKER);
    return idx === -1 ? caption : caption.slice(0, idx).trim();
};

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
    postType?: string;
    sensorData?: string;
    onLongPress?: () => void;
    onMenuPress?: () => void;
}

const FeedCard = ({ imageUri, caption, hashtags, isVideo, style, onPress, username, userAvatar, aspectRatio, hideCaption, postType, sensorData, onLongPress, onMenuPress }: FeedCardProps) => {
    const { theme } = useUnistyles();
    const hasMedia = (imageUri?.uri || (typeof imageUri === 'number')) && postType !== 'sensorData';

    // Debug logging
    if (caption) {
        // console.log('DEBUG FeedCard:', { caption: caption.substring(0, 10), surface: theme.colors.surface });
    }

    // Extract sensor data from sensorData prop (which is now caption)
    const parsedSensorData = postType === 'sensorData' ? extractSensorData(sensorData) : null;

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor: theme.colors.surface },
                style
            ]}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.9}
        >
            {postType === 'sensorData' && parsedSensorData ? (
                // Sensor Data Card Layout
                <View style={[
                    styles.imageContainer,
                    { backgroundColor: 'white', padding: 10, justifyContent: 'center' },
                    aspectRatio ? { aspectRatio } : undefined
                ]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                        <FontAwesome6 name="leaf" size={12} color="#4CA771" style={{ marginRight: 5 }} />
                        <Text style={{ fontSize: 10, color: '#888', fontWeight: 'bold' }}>STATUS</Text>
                    </View>

                    <View style={{ flex: 1, overflow: 'hidden' }}>
                        {(() => {
                            const moisture = parsedSensorData?.soil_moisture || 0;
                            const temp = parsedSensorData?.temperature || 0;

                            let statusText = 'Healthy';
                            let statusColor = '#4CA771';

                            if (moisture < 30) { statusText = 'Thirsty'; statusColor = '#F5A623'; }
                            else if (moisture > 80) { statusText = 'Wet'; statusColor = '#4A90E2'; }

                            return (
                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 5 }}>
                                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: statusColor + '20', alignItems: 'center', justifyContent: 'center' }}>
                                        <FontAwesome6 name="leaf" size={24} color={statusColor} />
                                    </View>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center' }}>{parsedSensorData.nickname || 'My Plant'}</Text>
                                    <Text style={{ fontSize: 12, color: statusColor, fontWeight: '600' }}>{statusText}</Text>

                                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <FontAwesome6 name="droplet" size={10} color="#4A90E2" />
                                            <Text style={{ fontSize: 10, color: '#666' }}>{moisture}%</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <FontAwesome6 name="temperature-half" size={10} color="#E05B5B" />
                                            <Text style={{ fontSize: 10, color: '#666' }}>{temp}°C</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })()}
                    </View>
                </View>
            ) : hasMedia ? (
                <>
                    <View style={[styles.imageContainer, aspectRatio ? { aspectRatio } : undefined]}>
                        <Image source={imageUri} style={styles.image} resizeMode="cover" />
                        {isVideo && (
                            <View style={styles.playIconContainer}>
                                <FontAwesome6 name="play" size={vw * 3} color="white" />
                            </View>
                        )}
                        {onMenuPress ? (
                            <TouchableOpacity
                                style={[styles.menuButton, { top: 8, right: 8 }]}
                                onPress={onMenuPress}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <FontAwesome6 name="ellipsis" size={vw * 4} color="white" />
                            </TouchableOpacity>
                        ) : null}

                        {/* Creator Info Overlay */}
                        {username && (
                            <View style={styles.creatorOverlay}>
                                {userAvatar ? (
                                    <Image source={userAvatar} style={styles.creatorAvatar} />
                                ) : (
                                    <View style={styles.creatorAvatar} />
                                )}
                                <Text style={styles.creatorName} numberOfLines={1}>{username}</Text>
                            </View>
                        )}
                    </View>
                </>
            ) : (
                <LinearGradient
                    colors={[
                        theme.colors.surface,
                        (theme.colors.surface.toUpperCase() === '#FFFFFF' || theme.colors.surface.toUpperCase() === '#FFF')
                            ? '#F0F0F0'
                            : '#2A2E32'
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.imageContainer,
                        aspectRatio ? { aspectRatio } : undefined
                    ]}
                >
                    {/* Decorative Background Elements */}
                    <View style={styles.backgroundDecoration}>
                        <FontAwesome6 name="leaf" size={80} color={theme.colors.primary} style={{ opacity: 0.03, transform: [{ rotate: '-20deg' }] }} />
                    </View>
                    <View style={{ position: 'absolute', top: vh * 2, right: vw * 4, opacity: 0.1 }}>
                        <FontAwesome6 name="quote-right" size={30} color={theme.colors.primary} />
                    </View>

                    {/* Stylized Curved Accent */}
                    <View style={[styles.curvedAccent, { backgroundColor: theme.colors.primary }]} />

                    {/* Badge at top */}
                    <View style={styles.badgeContainer}>
                        <View style={[styles.badge, { backgroundColor: theme.colors.primary + '20' }]}>
                            <Text style={[styles.badgeText, { color: theme.colors.primary }]}>Thought</Text>
                        </View>
                    </View>

                    {/* Main Content */}
                    <View style={{ paddingHorizontal: vw * 4, flex: 1, justifyContent: 'center', zIndex: 1 }}>
                        {(() => {
                            const cleanCaption = caption ? caption.replace(/#\w+/g, '').trim() : "No content";
                            const isShort = cleanCaption.length < 60;

                            return (
                                <Text
                                    style={[
                                        styles.textBody,
                                        {
                                            color: theme.colors.text,
                                            fontSize: isShort ? vw * 4.5 : vw * 3.5,
                                            fontWeight: isShort ? '700' : '500',
                                            lineHeight: isShort ? vw * 6 : vw * 5,
                                        }
                                    ]}
                                    numberOfLines={aspectRatio && aspectRatio < 1 ? 10 : 6}
                                >
                                    {cleanCaption}
                                </Text>
                            );
                        })()}
                    </View>

                    {/* Menu button */}
                    {onMenuPress ? (
                        <TouchableOpacity
                            style={[styles.menuButton, { top: 8, right: 8 }]}
                            onPress={onMenuPress}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <FontAwesome6 name="ellipsis" size={vw * 4} color={theme.colors.text} style={{ opacity: 0.6 }} />
                        </TouchableOpacity>
                    ) : null}

                    {/* Creator Info Overlay */}
                    {username && (
                        <View style={[styles.creatorOverlay, { backgroundColor: 'transparent', padding: 0, bottom: 12, left: 16 }]}>
                            {userAvatar ? (
                                <Image source={userAvatar} style={[styles.creatorAvatar, { width: 20, height: 20, borderRadius: 10 }]} />
                            ) : (
                                <View style={[styles.creatorAvatar, { width: 20, height: 20, borderRadius: 10 }]} />
                            )}
                            <Text style={[styles.creatorName, { color: theme.colors.text, fontSize: vw * 2.8 }]} numberOfLines={1}>{username}</Text>
                        </View>
                    )}
                </LinearGradient>
            )}
        </TouchableOpacity>
    );
};

export default FeedCard;

const styles = StyleSheet.create({
    container: {
        borderRadius: vw * 4,
        marginBottom: vh * 2,
        flex: 1,
        position: 'relative',
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 0.8,
        borderRadius: vw * 4,
        overflow: 'hidden',
        position: 'relative',
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
    },
    backgroundDecoration: {
        position: 'absolute',
        bottom: -10,
        right: -10,
        zIndex: 0,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: vw * 2.5,
        paddingVertical: vh * 0.4,
        borderRadius: 12,
    },
    badgeContainer: {
        marginTop: vh * 1.5,
        marginLeft: vw * 4,
        marginBottom: vh * 1,
    },
    badgeText: {
        fontSize: vw * 2.2,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    textBody: {
        fontSize: vw * 3.5,
        fontWeight: '500',
        lineHeight: vw * 5.2,
    },
    curvedAccent: {
        position: 'absolute',
        left: 0,
        top: '15%',
        bottom: '15%',
        width: 4,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    creatorOverlay: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        maxWidth: '85%',
    },
    creatorAvatar: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 6,
        backgroundColor: '#ccc',
    },
    creatorName: {
        color: 'white',
        fontSize: vw * 2.5,
        fontWeight: '600',
        flexShrink: 1,
    }
});
