import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useUnistyles } from '~/lib/unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

interface DeletePostModalProps {
    visible: boolean;
    deleting?: boolean;
    errorMessage?: string | null;
    onClose: () => void;
    onConfirm: () => void;
}

export default function DeletePostModal({
    visible,
    deleting = false,
    errorMessage,
    onClose,
    onConfirm,
}: DeletePostModalProps) {
    const { theme } = useUnistyles();

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={deleting ? undefined : onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={deleting ? undefined : onClose}
                />

                <View style={[styles.card, { backgroundColor: theme.colors.background }]}>
                    <View style={[styles.iconWrap, { backgroundColor: 'rgba(229, 80, 80, 0.12)' }]}>
                        <FontAwesome6 name="trash" size={24} color="#E55050" />
                    </View>

                    <Text style={[styles.title, { color: theme.colors.text }]}>Delete post?</Text>
                    <Text style={[styles.message, { color: theme.colors.typography }]}>
                        This will permanently remove the post from your profile.
                    </Text>

                    {errorMessage ? (
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    ) : null}

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.secondaryButton, { borderColor: theme.colors.greyedOut }]}
                            onPress={onClose}
                            disabled={deleting}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.primaryButton, deleting && styles.primaryButtonDisabled]}
                            onPress={onConfirm}
                            disabled={deleting}
                            activeOpacity={0.9}
                        >
                            {deleting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Delete</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    card: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 18,
        elevation: 10,
    },
    iconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 16,
    },
    errorText: {
        width: '100%',
        color: '#E55050',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 16,
    },
    actions: {
        width: '100%',
        flexDirection: 'row',
        gap: 12,
    },
    secondaryButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    primaryButton: {
        flex: 1,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E55050',
    },
    primaryButtonDisabled: {
        opacity: 0.75,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
});
