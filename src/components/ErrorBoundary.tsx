import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("ErrorBoundary caught an error:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <FontAwesome5 name="exclamation-triangle" size={32} color="#F44336" />
          <Text style={styles.title}>3D View Unavailable</Text>
          <Text style={styles.message}>
            We couldn't load the 3D plant view. This generally happens when Remote Debugging is enabled.
          </Text>
           {/* Only show retry if relevant, usually won't fix until reload */}
           <TouchableOpacity onPress={this.resetError} style={styles.button}>
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
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  message: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: '#e0e0e0',
      borderRadius: 8
  },
  buttonText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#333'
  }
});
