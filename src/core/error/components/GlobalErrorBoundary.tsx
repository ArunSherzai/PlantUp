import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
        // Pipe render crashes into our global handler as bugs
        ErrorHandlerService.handle(error, { showUI: false });
        // Log info.componentStack to Sentry here...
    }

    resetError = () => {
        this.setState({ hasError: false });
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <View style={styles.container}>
                    <Text style={styles.title}>Oops! Something went wrong.</Text>
                    <Text style={styles.subtitle}>We've recorded the issue and we'll fix it soon.</Text>
                    <TouchableOpacity style={styles.button} onPress={this.resetError}>
                        <Text style={styles.buttonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff'
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333'
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 20,
        color: '#666'
    },
    button: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#2E7D32', // PlantUp typical green color
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold'
    }
});
