import React, { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useUnistyles } from 'react-native-unistyles';
import DailyMentorCard from '~/features/mentor/components/DailyMentorCard';
import type { HealthResult } from '~/features/mentor/types/mentor.types';
import Feather from '@expo/vector-icons/Feather';
import { getTodayQuestKey, trackQuestAction } from '~/features/quests/questProgress';

export default function DailyMentorScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { theme } = useUnistyles();

    const { plantId, health } = route.params as {
        plantId: string;
        health: HealthResult | null;
    };

    useEffect(() => {
        trackQuestAction({
            actionCode: 'READ_TIP',
            eventKey: `${getTodayQuestKey()}:${plantId}:mentor`,
            plantId,
        });
    }, [plantId]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Optional: Add a subtle overlay background if you want it to look modal-ish, 
          but as a full screen it's better to just have the app background. */}

            {/* We can provide a custom back button if we don't use the header, but since we are a Modal presentation, 
          we can just rely on the swipe-down, or pass onClose to the card. */}

            <View style={styles.content}>
                <DailyMentorCard
                    plantId={plantId}
                    health={health}
                    onClose={() => navigation.goBack()}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingTop: 40, // push it down slightly to look good as a full modal
    }
});
