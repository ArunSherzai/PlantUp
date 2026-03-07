import React from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Feather from '@expo/vector-icons/Feather';

interface AlertModalProps {
    visible: boolean;
    type: 'success' | 'error' | 'loading';
    title: string;
    message: string;
    onClose: () => void;
}

export default function AlertModal({ visible, type, title, message, onClose }: AlertModalProps) {
    const { theme } = useUnistyles();

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <Feather name="check-circle" size={48} color={theme.colors.primary} />;
            case 'error':
                return <Feather name="alert-circle" size={48} color="#FF3B30" />;
            case 'loading':
                return <ActivityIndicator size="large" color={theme.colors.primary} />;
        }
    };

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <View style={styles.iconContainer}>{getIcon()}</View>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>
                    {type !== 'loading' && (
                        <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={onClose}>
                            <Text style={styles.buttonText}>OK</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create((theme) => ({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: theme.colors.background,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 24,
        opacity: 0.8,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
}));
