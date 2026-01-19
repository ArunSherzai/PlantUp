import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native'; // Removed standard Image
import { Image } from 'expo-image'; // Use Expo Image
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

type RewardItemProps = {
    title: string;
    description: string;
    image?: any; // Allow Expo Image source types
    isUnlocked: boolean;
    isClaimed?: boolean;
    onClaim?: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ICON_SIZE = SCREEN_WIDTH * 0.12; // Approx 45-50px on standard phones

export default function RewardItem({ title, description, image, isUnlocked, isClaimed, onClaim }: RewardItemProps) {
    const { theme } = useUnistyles();
    const [imageError, setImageError] = React.useState(false);
    const Container = TouchableOpacity;

    const isGif = image?.uri && typeof image.uri === 'string' && image.uri.includes('.gif');

    return (
        <Container
            style={[styles.container, !isUnlocked && styles.lockedContainer, isClaimed && styles.claimedContainer]}
            onPress={onClaim}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                {image && isUnlocked && !isClaimed && !imageError ? (
                   <View style={styles.iconWrapper}> 
                       <Image 
                         source={image} 
                         style={[
                            styles.imageInner,
                            isGif && styles.gifScaling
                         ]}
                         contentFit="contain"
                         transition={200}
                         onError={() => setImageError(true)}
                       />
                   </View>
                ) : (
                    <LinearGradient
                        colors={isClaimed 
                            ? [theme.colors.secondary, theme.colors.secondary] 
                            : (isUnlocked ? ['#4CAF50', '#81C784'] : ['#BDBDBD', '#E0E0E0'])
                        }
                        style={styles.iconWrapper}
                    >
                        <FontAwesome6 
                            name={isClaimed ? "check" : (isUnlocked ? "gift" : "lock")} 
                            size={ICON_SIZE * 0.5} 
                            color="white" 
                        />
                    </LinearGradient>
                )}
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description} numberOfLines={2}>
                    {isClaimed ? "Claimed" : description}
                </Text>
            </View>
        </Container>
    );
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 16, // Slightly rounder
        padding: SCREEN_WIDTH * 0.03, // Responsive padding
        marginBottom: 10,
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        marginRight: 10,
        width: SCREEN_WIDTH * 0.45,
    },
    lockedContainer: {
        opacity: 0.7,
    },
    claimedContainer: {
        opacity: 0.5,
        backgroundColor: theme.colors.greyedOut || '#eee',
    },
    iconContainer: {
        marginRight: SCREEN_WIDTH * 0.03,
    },
    iconWrapper: {
        width: ICON_SIZE,
        height: ICON_SIZE,
        borderRadius: ICON_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    },
    imageInner: {
        width: '100%',
        height: '100%',
    },
    gifScaling: {
        width: '158%',
        height: '158%',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: SCREEN_WIDTH * 0.035,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 2,
    },
    description: {
        fontSize: SCREEN_WIDTH * 0.028,
        color: theme.colors.typography,
    },
}));
