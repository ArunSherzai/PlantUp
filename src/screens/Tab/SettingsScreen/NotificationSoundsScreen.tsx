import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';

import { useUserStore } from '../../../stores/UserStore';
import { NotificationService } from '../../../services/NotificationService';
import { playSound, type SoundType } from '~/utils/SoundManager';
import { NOTIFICATION_SOUND_CATEGORY_LABELS, NOTIFICATION_SOUND_OPTIONS, type NotificationSoundCategory } from '../../../features/notifications/config/notificationSoundConfig';

export default function NotificationSoundsScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { notificationSoundSettings, updateNotificationSound } = useUserStore();

    const handleSoundChange = async (category: NotificationSoundCategory, value: string) => {
        await updateNotificationSound(category, value as any);
        await NotificationService.applySoundSettings({ [category]: value as any });
    };

    const handlePreview = (category: NotificationSoundCategory) => {
        const sound = notificationSoundSettings[category];
        if (!sound || sound === 'off') {
            return;
        }
        playSound(sound as SoundType);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" translucent backgroundColor="transparent" />

            <View style={[styles.headerBg, { height: 160 + insets.top }]}>
                <Image
                    source={require('../../../../assets/images/profileScreenBackground.png')}
                    style={styles.headerGradient}
                    resizeMode="cover"
                />
                <View style={styles.headerOverlay} />
            </View>

            <View style={[styles.headerContent, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome6 name="chevron-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notification Sounds</Text>
            </View>

            <View style={styles.roundedContainer}>
                <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                    <View style={[styles.heroCard, { backgroundColor: '#123B46' }]}>
                        <Text style={styles.heroEyebrow}>Sound Setup</Text>
                        <Text style={styles.heroTitle}>Choose a sound per alert type.</Text>
                        <Text style={styles.heroBody}>
                            Preview plays the current selection in the app. Android notification channels are updated when you change a sound.
                        </Text>
                    </View>

                    <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.greyedOut }]}>
                        {(Object.keys(NOTIFICATION_SOUND_CATEGORY_LABELS) as NotificationSoundCategory[]).map((category, index) => (
                            <View
                                key={category}
                                style={[
                                    styles.soundRow,
                                    index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.greyedOut },
                                ]}
                            >
                                <View style={styles.soundRowTop}>
                                    <Text style={[styles.soundCategoryLabel, { color: theme.colors.text }]}>
                                        {NOTIFICATION_SOUND_CATEGORY_LABELS[category]}
                                    </Text>
                                    <View style={styles.soundActions}>
                                        <Text style={[styles.soundCurrentValue, { color: theme.colors.primary }]}>
                                            {NOTIFICATION_SOUND_OPTIONS.find((option) => option.value === notificationSoundSettings[category])?.label || 'Default'}
                                        </Text>
                                        <TouchableOpacity
                                            style={[
                                                styles.previewButton,
                                                { borderColor: theme.colors.greyedOut, opacity: notificationSoundSettings[category] === 'off' ? 0.45 : 1 },
                                            ]}
                                            onPress={() => handlePreview(category)}
                                            disabled={notificationSoundSettings[category] === 'off'}
                                        >
                                            <FontAwesome6 name="play" size={12} color={theme.colors.text} />
                                            <Text style={[styles.previewButtonText, { color: theme.colors.text }]}>Preview</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.soundOptionsWrap}>
                                    {NOTIFICATION_SOUND_OPTIONS.map((option) => {
                                        const active = notificationSoundSettings[category] === option.value;
                                        return (
                                            <TouchableOpacity
                                                key={`${category}-${option.value}`}
                                                style={[
                                                    styles.soundChip,
                                                    {
                                                        backgroundColor: active ? theme.colors.primary : theme.colors.background,
                                                        borderColor: active ? theme.colors.primary : theme.colors.greyedOut,
                                                    },
                                                ]}
                                                onPress={() => void handleSoundChange(category, option.value)}
                                            >
                                                <Text style={[styles.soundChipText, { color: active ? '#fff' : theme.colors.text }]}> 
                                                    {option.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create((theme: any) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    headerBg: {
        width: '100%',
        position: 'absolute',
        top: 0,
        zIndex: 0,
    },
    headerGradient: {
        width: '100%',
        height: '100%',
    },
    headerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.16)',
    },
    headerContent: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 1,
        paddingBottom: 20,
    },
    backButton: {
        marginRight: 15,
        padding: 5,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    roundedContainer: {
        flex: 1,
        marginTop: 118,
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 80,
    },
    heroCard: {
        borderRadius: 24,
        padding: 18,
        marginBottom: 18,
    },
    heroEyebrow: {
        color: '#9FE3D5',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    heroTitle: {
        color: '#fff',
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '800',
        marginBottom: 10,
    },
    heroBody: {
        color: '#D4E6E4',
        fontSize: 13,
        lineHeight: 19,
    },
    sectionCard: {
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
    },
    soundRow: {
        paddingVertical: 14,
    },
    soundRowTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 12,
    },
    soundCategoryLabel: {
        fontSize: 15,
        fontWeight: '800',
        flex: 1,
    },
    soundActions: {
        alignItems: 'flex-end',
        gap: 8,
    },
    soundCurrentValue: {
        fontSize: 12,
        fontWeight: '700',
    },
    previewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    previewButtonText: {
        fontSize: 12,
        fontWeight: '700',
    },
    soundOptionsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    soundChip: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    soundChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
}));
