import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

type ConnectPlantBoxModalProps = {
  visible: boolean;
  onClose: () => void;
  onConnect: (sensorBoxId: string) => Promise<void>;
  initialValue?: string | null;
  title?: string;
  description?: string;
};

export default function ConnectPlantBoxModal({
  visible,
  onClose,
  onConnect,
  initialValue,
  title = 'Connect PlantBox',
  description = 'Enter the Sensor Box ID from your PlantBox to link it to this plant.',
}: ConnectPlantBoxModalProps) {
  const { theme } = useUnistyles();
  const [sensorBoxId, setSensorBoxId] = useState(initialValue ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (!visible) return;
    setSensorBoxId(initialValue ?? '');
    setErrorText('');
    setSubmitting(false);
  }, [visible, initialValue]);

  const handleConnect = async () => {
    const trimmedValue = sensorBoxId.trim();

    if (!trimmedValue) {
      setErrorText('Enter a Sensor Box ID.');
      return;
    }

    setSubmitting(true);
    setErrorText('');

    try {
      await onConnect(trimmedValue);
      onClose();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'The PlantBox could not be connected.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <Text style={styles.label}>Sensor Box ID</Text>
          <TextInput
            value={sensorBoxId}
            onChangeText={setSensorBoxId}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="e.g. 0d4a9e7f-..."
            placeholderTextColor={theme.colors.greyedOut}
            style={styles.input}
          />

          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              disabled={submitting}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
              onPress={handleConnect}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Connect</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.typography,
    opacity: 0.8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  errorText: {
    color: '#C64545',
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
}));
