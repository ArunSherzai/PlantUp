import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';
import { SystemBars } from 'react-native-edge-to-edge';
import { ErrorHandlerService } from '../services/ErrorHandlerService';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}
interface State { hasError: boolean }

export class GlobalErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        ErrorHandlerService.handle(error, { showUI: false });
    }

    resetError = () => {
        this.setState({ hasError: false });
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <SafeAreaView style={styles.container}>
                    <SystemBars style="dark" />

                    <Text style={styles.emoji}>😵</Text>
                    <Text style={styles.title}>Oops! Something went wrong.</Text>
                    <Text style={styles.subtitle}>
                        We've recorded the issue and we'll fix it soon.
                    </Text>

                    <TouchableOpacity
                        style={styles.button}
                        activeOpacity={0.8}
                        onPress={this.resetError}
                    >
                        <Text style={styles.buttonText}>Try Again</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        backgroundColor: theme.colors.background,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: theme.fontSizes.header,
        fontWeight: '700',
        fontFamily: theme.fonts.header,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: theme.fontSizes.medium,
        fontFamily: theme.fonts.regular,
        color: theme.colors.greyedOut,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    button: {
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        borderRadius: 24,
        elevation: 5,
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 48,
        shadowColor: '#000',
        shadowOffset: { height: 2, width: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    buttonText: {
        color: theme.colors.background,
        fontSize: theme.fontSizes.medium,
        fontWeight: '600',
        fontFamily: theme.fonts.regular,
        textAlign: 'center',
    },
}));
