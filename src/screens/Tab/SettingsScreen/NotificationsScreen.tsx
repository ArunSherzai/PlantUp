import React from 'react';
import { View, Text, Switch, TouchableOpacity, Image } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserStore } from '../../../stores/UserStore';

import { StatusBar } from 'expo-status-bar';

export default function NotificationsScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { sprigNotificationsEnabled, toggleSprigNotifications } = useUserStore();

    return (
        <View style={styles.container}>
            <StatusBar style="light" translucent backgroundColor="transparent" />
            {/* Header Background */}
            <View style={[styles.headerBg, { height: 140 + insets.top }]}>
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
                <Text style={styles.headerTitle}>Notifications</Text>
            </View>

            <View style={styles.roundedContainer}>
                <View style={styles.contentContainer}>
                    <View style={styles.section}>
                        <View style={styles.row}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <FontAwesome6
                                    name="bell"
                                    size={18}
                                    color={theme.colors.text}
                                    style={{ marginRight: 10 }}
                                />
                                <Text style={styles.label}>Sprig Notifications</Text>
                            </View>

                            <Switch
                                value={sprigNotificationsEnabled}
                                onValueChange={toggleSprigNotifications}
                                trackColor={{
                                    false: theme.colors.greyedOut,
                                    true: theme.colors.primary,
                                }}
                                thumbColor="#fff"
                            />
                        </View>
                    </View>
                </View>
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
        backgroundColor: 'rgba(0,0,0,0.1)',
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
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    contentContainer: {
        padding: 20,
    },
    section: {
        marginBottom: 25,
        paddingBottom: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: '500',
    },
}));
