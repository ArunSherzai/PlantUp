import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Image, TouchableOpacity, SafeAreaView, StatusBar, ImageBackground } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/Root';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6'; // Import FontAwesome6
import DeveloperMenu from '../../../components/DeveloperMenu'; // Import DeveloperMenu

type Props = StackScreenProps<RootStackParamList, 'DirectMessages'>;

interface Message {
    id: string;
    name: string;
    lastMessage: string;
    time: string;
    avatar: any; // Using any for require() images
}

const MOCK_MESSAGES: Message[] = [
    {
        id: '1',
        name: 'Yoyo123',
        lastMessage: 'Yo, i have a question reagard...',
        time: '13:00',
        avatar: require('../../../../assets/images/pfp3.png'), // Placeholder
    },
    {
        id: '2',
        name: 'Mirkoyedo',
        lastMessage: 'What is this app...',
        time: 'Yesterday',
        avatar: require('../../../../assets/images/pfp2.webp'), // Placeholder
    },
    {
        id: '3',
        name: 'Abudi',
        lastMessage: 'Yo what is this app...',
        time: 'Yesterday',
        avatar: require('../../../../assets/images/pfp4.png'), // Placeholder
    },
    {
        id: '4',
        name: 'Mina',
        lastMessage: 'Hi how are you...',
        time: 'Yesterday',
        avatar: require('../../../../assets/images/pfp5.png'), // Placeholder
    },
];

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getLatestTip, StoredTip } from '../../../utils/tipHistory';

export default function DirectMessagesScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const { theme } = useUnistyles();
    const [searchQuery, setSearchQuery] = useState('');
    const [sprigTip, setSprigTip] = useState<StoredTip | null>(null);
    const [showDevMenu, setShowDevMenu] = useState(false); // State for dev menu

    useFocusEffect(
        React.useCallback(() => {
            const fetchTip = async () => {
                const latest = await getLatestTip();
                setSprigTip(latest);
            };
            fetchTip();
        }, [])
    );

    const allMessages = React.useMemo(() => {
        const messages = [...MOCK_MESSAGES];
        if (sprigTip) {
            messages.unshift({
                id: 'sprig',
                name: 'Sprig',
                lastMessage: sprigTip.message,
                time: new Date(sprigTip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                avatar: require('../../../../assets/images/sprig_idle.png'),
            });
        }
        return messages;
    }, [sprigTip]);

    const filteredMessages = allMessages.filter(msg =>
        msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }: { item: Message }) => (
        <TouchableOpacity
            style={styles.messageItem}
            onPress={() => navigation.navigate('MessageDetail', {
                id: item.id,
                name: item.name,
                avatar: item.avatar,
            })}
        >
            <View style={styles.avatarContainer}>
                <Image source={item.avatar} style={styles.avatar} resizeMode="cover" />
            </View>
            <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                    <Text style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
                    <Text style={[styles.time, { color: theme.colors.greyedOut }]}>{item.time}</Text>
                </View>
                <Text style={[styles.lastMessage, { color: theme.colors.greyedOut }]} numberOfLines={1}>
                    {item.lastMessage}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <ImageBackground
            source={require('../../../../assets/images/dmbackground.png')}
            style={styles.container}
            resizeMode="cover"
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Header Section */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={[styles.headerLargeTitle, { paddingVertical: 70 }]}>Connect with{'\n'}Others!</Text>
                </View>
                {/* Bug Icon for Dev Menu */}
                <TouchableOpacity onPress={() => setShowDevMenu(true)} style={styles.bugButton}>
                    <FontAwesome6 name="bug" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Content Section (White Card) */}
            <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>
                <View style={styles.contentHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Messages</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.greyedOut }]}>
                        Have questions? Ask away!
                    </Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={[styles.searchInput, { backgroundColor: '#F0F0F0', color: '#000' }]}
                        placeholder="Search"
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Message List */}
                <FlatList
                    data={filteredMessages}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                />
            </View>

            <DeveloperMenu visible={showDevMenu} onClose={() => setShowDevMenu(false)} />

        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: '35%',
        position: 'relative',
    },

    headerContent: {
        paddingHorizontal: 20,
        paddingTop: 60, // Adjust for status bar
    },
    bugButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        padding: 10,
        zIndex: 10,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
    },
    headerLargeTitle: {
        color: '#FFF',
        fontSize: 42,
        fontWeight: 'bold',
        lineHeight: 48,
    },
    contentContainer: {
        flex: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 30,
        paddingHorizontal: 20,
    },
    contentHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
    },
    searchContainer: {
        marginBottom: 20,
    },
    searchInput: {
        height: 50,
        borderRadius: 25,
        paddingHorizontal: 20,
        fontSize: 16,
    },
    listContent: {
        paddingBottom: 20,
    },
    messageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E0E0E0',
        overflow: 'hidden',
        marginRight: 15,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    messageContent: {
        flex: 1,
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
    },
    time: {
        fontSize: 12,
    },
    lastMessage: {
        fontSize: 14,
    },
});
