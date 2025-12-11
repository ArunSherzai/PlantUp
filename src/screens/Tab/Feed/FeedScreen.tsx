import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useUnistyles } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import FeedCard from '../../../components/FeedCard';
import DraggableBottomSheet from '../../../components/DraggableBottomSheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFeed } from '../../../hooks/useFeed';
import MasonryFeedGrid from '../../../components/MasonryFeedGrid';

const { width } = Dimensions.get('window');

export default function FeedScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation<any>();
    const { posts, loading, refreshFeed } = useFeed();
    const [refreshing, setRefreshing] = useState(false);

    // Reload when screen is focused
    useFocusEffect(
        useCallback(() => {
            refreshFeed();
        }, [refreshFeed])
    );

    // Pull to refresh handler
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshFeed();
        setRefreshing(false);
    }, [refreshFeed]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                {/* Header Background */}
                <View style={styles.headerBg}>
                    <Image
                        source={require('../../../../assets/images/homeScreenBackground.png')}
                        style={styles.headerImage}
                        resizeMode="cover"
                    />
                    {/* Overlay to darken slightly if needed, or rely on image */}
                    <View style={styles.headerWrapper}>


                        <TouchableOpacity style={{ position: 'absolute', right: width * 0.05, top: 0, zIndex: 10, padding: 5 }}>
                            <FontAwesome6 name="magnifying-glass" size={24} color="white" />
                        </TouchableOpacity>



                        <MaskedView
                            style={{ height: 100, width: '100%', position: "absolute", top: 120, left: 0 }}
                            maskElement={<Text style={styles.headerTitle}>Inspire and{'\n'}Be Inspired!</Text>}>
                            <LinearGradient
                                colors={['#FFFFFF', '#E0F7FA']}
                                start={{ x: 0.2, y: 0 }}
                                end={{ x: 0.8, y: 1 }}
                                style={{ flex: 1 }}
                            />
                        </MaskedView>
                    </View>
                </View>

                <DraggableBottomSheet initialHeight={0.65} maxHeight={0.9}>
                    {loading && posts.length === 0 ? (
                        <View style={{ padding: 20 }}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                        </View>
                    ) : (
                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text} />
                            }
                        >
                            <MasonryFeedGrid
                                posts={posts}
                                onPostPress={(item) => navigation.navigate('FeedPostDetail', { post: item })}
                            />
                            {posts.length === 0 && (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text style={{ color: theme.colors.text }}>No posts yet. Be the first!</Text>
                                </View>
                            )}
                            <View style={{ height: 100 }} />
                        </ScrollView>
                    )}
                </DraggableBottomSheet>

                {/* FAB */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('CreatePost')}
                >
                    <FontAwesome6 name="plus" size={28} color="white" />
                </TouchableOpacity>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerBg: {
        height: '100%',
        width: '100%',
        position: 'absolute',
        top: 0,
    },
    headerImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    headerWrapper: {
        position: 'absolute',
        top: '8%',
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    brandText: {
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
        fontSize: 18
    },
    headerTitle: {
        fontSize: 40,
        fontWeight: '900',
        color: 'white',
        textAlign: 'left',
        paddingLeft: 20,
        lineHeight: 44,
    },
    iconButton: {
        padding: 5,
    },
    scrollContent: {
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    masonryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    column: {
        width: (width - 45) / 2,
    },
    cardSpacing: {
        marginBottom: 15,
    },
    fab: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        width: 60,
        height: 60,
        borderRadius: 20, // Rounded square / Squircle
        backgroundColor: 'rgba(45, 48, 51, 0.9)', // Dark grey with slight transparency
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
        zIndex: 100,
    }
});
