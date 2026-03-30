import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, ScrollView, Switch, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';

import { useInboxStore, type InboxItem } from '../../../stores/InboxStore';
import { useUserStore } from '../../../stores/UserStore';

export default function NotificationsScreen() {
    const { theme } = useUnistyles();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { width, fontScale } = useWindowDimensions();
    const { sprigNotificationsEnabled, toggleSprigNotifications } = useUserStore();
    const items = useInboxStore((state) => state.items);
    const hydrated = useInboxStore((state) => state.hydrated);
    const hydrate = useInboxStore((state) => state.hydrate);
    const markAsRead = useInboxStore((state) => state.markAsRead);
    const markAsUnread = useInboxStore((state) => state.markAsUnread);
    const markAllAsRead = useInboxStore((state) => state.markAllAsRead);
    const removeNotification = useInboxStore((state) => state.removeNotification);
    const clearRead = useInboxStore((state) => state.clearRead);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
    const isCompact = width < 380 || fontScale > 1.15;
    const isTabletLike = width >= 768;

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    const unreadCount = useMemo(() => items.filter((item) => !item.readAt).length, [items]);
    const readCount = items.length - unreadCount;
    const filteredItems = useMemo(() => {
        if (filter === 'unread') return items.filter((item) => !item.readAt);
        if (filter === 'read') return items.filter((item) => !!item.readAt);
        return items;
    }, [filter, items]);

    const onOpenItem = async (item: InboxItem) => {
        if (!item.readAt) {
            await markAsRead(item.id);
        }

        setSelectedItem(null);

        if (item.navigationTarget) {
            navigation.navigate(item.navigationTarget.name, item.navigationTarget.params);
        }
    };

    const getAccent = (kind: InboxItem['kind']) => {
        switch (kind) {
            case 'critical':
                return '#E55050';
            case 'warning':
                return '#F0A83B';
            case 'chat':
                return '#3B82F6';
            case 'follow':
                return '#7C52E8';
            default:
                return theme.colors.primary;
        }
    };

    const getIcon = (kind: InboxItem['kind']) => {
        switch (kind) {
            case 'critical':
                return 'triangle-exclamation';
            case 'warning':
                return 'bell';
            case 'chat':
                return 'envelope';
            case 'follow':
                return 'user-plus';
            default:
                return 'seedling';
        }
    };

    const formatTime = (value: string) => {
        const date = new Date(value);
        const diffMs = Date.now() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) return 'Now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const shouldShowFullTextAction = (item: InboxItem) => {
        const titleLimit = isCompact ? 55 : 42;
        const bodyLimit = isCompact ? 150 : 110;
        return item.title.length > titleLimit || item.body.length > bodyLimit;
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
                <Text style={styles.headerTitle}>Notifications</Text>
            </View>

            <View style={styles.roundedContainer}>
                <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                    <View style={[styles.contentInner, isTabletLike && styles.contentInnerTablet]}>
                        <View style={[styles.heroCard, isCompact && styles.heroCardCompact]}>
                            <Text style={styles.heroEyebrow}>Inbox</Text>
                            <Text style={[styles.heroTitle, isCompact && styles.heroTitleCompact]}>
                                Important stays visible, noise clears out.
                            </Text>
                            <View style={[styles.heroStatsRow, isCompact && styles.heroStatsRowCompact]}>
                                <View style={[styles.statCard, isCompact && styles.statCardCompact]}>
                                    <Text style={styles.statValue}>{unreadCount}</Text>
                                    <Text style={styles.statLabel}>Unread</Text>
                                </View>
                                <View style={[styles.statCard, isCompact && styles.statCardCompact]}>
                                    <Text style={styles.statValue}>{items.length}</Text>
                                    <Text style={styles.statLabel}>Total</Text>
                                </View>
                            </View>
                            <Text style={styles.heroBody}>
                                Chat is grouped per conversation, plant alerts per plant, and older read items are trimmed automatically.
                            </Text>
                        </View>

                        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.greyedOut }]}>
                            <View style={styles.row}>
                                <View style={styles.rowLeft}>
                                    <FontAwesome6 name="bell" size={18} color={theme.colors.text} style={{ marginRight: 10 }} />
                                    <Text style={[styles.label, { color: theme.colors.text }]}>Sprig Notifications</Text>
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

                        <View style={[styles.actionRow, isCompact && styles.actionRowCompact]}>
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    isCompact && styles.actionButtonCompact,
                                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.greyedOut, opacity: unreadCount ? 1 : 0.45 },
                                ]}
                                onPress={markAllAsRead}
                                disabled={!unreadCount}
                            >
                                <FontAwesome6 name="check-double" size={14} color={theme.colors.text} />
                                <Text style={[styles.actionText, { color: theme.colors.text }]}>Mark all read</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    isCompact && styles.actionButtonCompact,
                                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.greyedOut, opacity: readCount ? 1 : 0.45 },
                                ]}
                                onPress={clearRead}
                                disabled={!readCount}
                            >
                                <FontAwesome6 name="broom" size={14} color={theme.colors.text} />
                                <Text style={[styles.actionText, { color: theme.colors.text }]}>Clear read</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterRow}>
                            {(['all', 'unread', 'read'] as const).map((value) => {
                                const active = filter === value;
                                return (
                                    <TouchableOpacity
                                        key={value}
                                        style={[
                                            styles.filterChip,
                                            isCompact && styles.filterChipCompact,
                                            {
                                                backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                                                borderColor: active ? theme.colors.primary : theme.colors.greyedOut,
                                            },
                                        ]}
                                        onPress={() => setFilter(value)}
                                    >
                                        <Text style={[styles.filterText, { color: active ? '#fff' : theme.colors.text }]}>
                                            {value === 'all' ? 'All' : value === 'unread' ? 'Unread' : 'Read'}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {!hydrated || filteredItems.length === 0 ? (
                            <View style={[styles.emptyState, isCompact && styles.emptyStateCompact, { backgroundColor: theme.colors.surface, borderColor: theme.colors.greyedOut }]}>
                                <FontAwesome6 name="inbox" size={28} color={theme.colors.greyedOut} />
                                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}> 
                                    {hydrated ? 'No notifications here.' : 'Loading inbox...'}
                                </Text>
                                <Text style={styles.emptyBody}>
                                    New warnings, messages and follows will show up here.
                                </Text>
                            </View>
                        ) : filteredItems.map((item) => {
                            const accent = getAccent(item.kind);
                            const showFullTextAction = shouldShowFullTextAction(item);

                            return (
                                <View
                                    key={item.id}
                                    style={[
                                        styles.notificationCard,
                                        isCompact && styles.notificationCardCompact,
                                        {
                                            backgroundColor: theme.colors.surface,
                                            borderColor: item.readAt ? theme.colors.greyedOut : accent,
                                        },
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={[styles.notificationTapArea, isCompact && styles.notificationTapAreaCompact]}
                                        activeOpacity={0.88}
                                        onPress={() => onOpenItem(item)}
                                    >
                                        <View style={[styles.iconWrap, isCompact && styles.iconWrapCompact, { backgroundColor: `${accent}18` }]}>
                                            {item.avatarUri ? (
                                                <Image source={{ uri: item.avatarUri }} style={styles.avatar} />
                                            ) : (
                                                <FontAwesome6 name={getIcon(item.kind)} size={18} color={accent} />
                                            )}
                                        </View>

                                        <View style={styles.itemContent}>
                                            <View style={[styles.itemTopRow, isCompact && styles.itemTopRowCompact]}>
                                                <Text style={[styles.itemTitle, isCompact && styles.itemTitleCompact, { color: theme.colors.text }]} numberOfLines={isCompact ? 2 : 1}>
                                                    {item.title}
                                                </Text>
                                                <Text style={[styles.itemMeta, { color: theme.colors.greyedOut }]}>
                                                    {formatTime(item.createdAt)}
                                                </Text>
                                            </View>
                                            <Text style={[styles.itemBody, isCompact && styles.itemBodyCompact, { color: theme.colors.text }]} numberOfLines={isCompact ? 3 : 2}>
                                                {item.body}
                                            </Text>
                                            <View style={[styles.itemFooter, isCompact && styles.itemFooterCompact]}>
                                                <Text style={[styles.kindPill, { color: accent, borderColor: `${accent}40` }]}>
                                                    {item.kind === 'follow' ? 'Follow' : item.kind}
                                                </Text>
                                                {showFullTextAction && (
                                                    <TouchableOpacity onPress={() => setSelectedItem(item)} style={[styles.detailButton, { borderColor: `${accent}40` }]}>
                                                        <Text style={[styles.detailButtonText, { color: accent }]}>Read full</Text>
                                                    </TouchableOpacity>
                                                )}
                                                {item.count > 1 && (
                                                    <Text style={[styles.countBadge, { color: theme.colors.text }]}>
                                                        +{item.count - 1}
                                                    </Text>
                                                )}
                                                {!item.readAt && <View style={[styles.unreadDot, { backgroundColor: accent }]} />}
                                            </View>
                                        </View>
                                    </TouchableOpacity>

                                    <View style={styles.itemActions}>
                                        <TouchableOpacity
                                            style={[styles.smallIconButton, isCompact && styles.smallIconButtonCompact, { backgroundColor: theme.colors.background, borderColor: theme.colors.greyedOut }]}
                                            onPress={() => item.readAt ? markAsUnread(item.id) : markAsRead(item.id)}
                                        >
                                            <FontAwesome6 name={item.readAt ? 'envelope' : 'check'} size={14} color={theme.colors.text} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.smallIconButton, isCompact && styles.smallIconButtonCompact, { backgroundColor: theme.colors.background, borderColor: theme.colors.greyedOut }]}
                                            onPress={() => removeNotification(item.id)}
                                        >
                                            <FontAwesome6 name="trash" size={14} color="#D34B4B" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>

            <Modal transparent visible={!!selectedItem} animationType="fade" onRequestClose={() => setSelectedItem(null)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}> 
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{selectedItem?.title}</Text>
                            <TouchableOpacity onPress={() => setSelectedItem(null)} style={[styles.modalCloseButton, { borderColor: theme.colors.greyedOut }]}> 
                                <FontAwesome6 name="xmark" size={16} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalMeta, { color: theme.colors.greyedOut }]}>
                            {selectedItem ? formatTime(selectedItem.createdAt) : ''}
                        </Text>
                        <ScrollView style={styles.modalBodyWrap} contentContainerStyle={styles.modalBodyContent}>
                            <Text style={[styles.modalBody, { color: theme.colors.text }]}>{selectedItem?.body}</Text>
                        </ScrollView>
                        <View style={styles.modalActions}>
                            {selectedItem?.navigationTarget && (
                                <TouchableOpacity onPress={() => void onOpenItem(selectedItem)} style={[styles.modalPrimaryButton, { backgroundColor: theme.colors.primary }]}> 
                                    <Text style={styles.modalPrimaryButtonText}>Open</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => setSelectedItem(null)} style={[styles.modalSecondaryButton, { borderColor: theme.colors.greyedOut }]}> 
                                <Text style={[styles.modalSecondaryButtonText, { color: theme.colors.text }]}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    contentInner: {
        width: '100%',
        alignSelf: 'center',
    },
    contentInnerTablet: {
        maxWidth: 720,
    },
    heroCard: {
        backgroundColor: '#103B3B',
        borderRadius: 24,
        padding: 18,
        marginBottom: 18,
    },
    heroCardCompact: {
        padding: 16,
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
        marginBottom: 14,
    },
    heroTitleCompact: {
        fontSize: 21,
        lineHeight: 27,
    },
    heroStatsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    heroStatsRowCompact: {
        flexDirection: 'column',
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    statCardCompact: {
        minHeight: 84,
    },
    statValue: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 4,
    },
    statLabel: {
        color: '#B9D6D3',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    heroBody: {
        color: '#D4E6E4',
        fontSize: 13,
        lineHeight: 19,
    },
    sectionCard: {
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '700',
    },
    actionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 14,
    },
    actionRowCompact: {
        gap: 10,
    },
    actionButton: {
        flex: 1,
        minWidth: 140,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    actionButtonCompact: {
        width: '100%',
        flexBasis: '100%',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 8,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
    },
    filterChipCompact: {
        minWidth: 92,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterText: {
        fontSize: 13,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        paddingHorizontal: 24,
        borderRadius: 18,
        borderWidth: 1,
    },
    emptyStateCompact: {
        paddingVertical: 36,
        paddingHorizontal: 18,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginTop: 14,
        marginBottom: 6,
    },
    emptyBody: {
        fontSize: 14,
        color: '#8B9493',
        textAlign: 'center',
        lineHeight: 20,
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        marginBottom: 12,
    },
    notificationCardCompact: {
        alignItems: 'flex-start',
        padding: 12,
    },
    notificationTapArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    notificationTapAreaCompact: {
        alignItems: 'flex-start',
    },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginRight: 12,
    },
    iconWrapCompact: {
        width: 44,
        height: 44,
        borderRadius: 14,
        marginTop: 2,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    itemContent: {
        flex: 1,
    },
    itemTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        gap: 10,
    },
    itemTopRowCompact: {
        alignItems: 'flex-start',
    },
    itemTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '800',
    },
    itemTitleCompact: {
        paddingRight: 8,
    },
    itemMeta: {
        fontSize: 12,
        fontWeight: '600',
    },
    itemBody: {
        fontSize: 14,
        lineHeight: 19,
    },
    itemBodyCompact: {
        lineHeight: 20,
    },
    itemFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        flexWrap: 'wrap',
        rowGap: 8,
    },
    itemFooterCompact: {
        flexWrap: 'wrap',
        rowGap: 8,
    },
    kindPill: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'capitalize',
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        overflow: 'hidden',
    },
    detailButton: {
        marginLeft: 8,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    detailButtonText: {
        fontSize: 12,
        fontWeight: '700',
    },
    countBadge: {
        marginLeft: 8,
        fontSize: 12,
        fontWeight: '700',
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 10,
    },
    itemActions: {
        gap: 8,
    },
    smallIconButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    smallIconButtonCompact: {
        width: 38,
        height: 38,
        borderRadius: 19,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        borderRadius: 24,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    modalTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '800',
        lineHeight: 26,
    },
    modalCloseButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalMeta: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 8,
        marginBottom: 14,
    },
    modalBodyWrap: {
        maxHeight: 260,
    },
    modalBodyContent: {
        paddingBottom: 8,
    },
    modalBody: {
        fontSize: 15,
        lineHeight: 23,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 18,
    },
    modalPrimaryButton: {
        minWidth: 110,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalPrimaryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
    modalSecondaryButton: {
        minWidth: 110,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    modalSecondaryButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
}));
