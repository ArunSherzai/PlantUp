import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StyleSheet } from '~/lib/unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { LinearGradient } from 'expo-linear-gradient';
import type { TextOverlay } from '../../types';

const { width } = Dimensions.get('window');

const COLORS = [
  '#FFFFFF', '#000000', '#FF3B30', '#FF9500', '#FFCC00',
  '#34C759', '#329D9C', '#007AFF', '#5856D6', '#AF52DE',
  '#FF2D55', '#00D988',
];

const FONT_SIZES = [16, 20, 24, 32, 40, 48];

type Props = {
  textOverlays: TextOverlay[];
  onAddText: (overlay: TextOverlay) => void;
  onRemoveText: (id: string) => void;
};

export default function TextStickerPanel({ textOverlays, onAddText, onRemoveText }: Props) {
  const [text, setText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [selectedSize, setSelectedSize] = useState(24);
  const [isBold, setIsBold] = useState(false);

  const handleAddText = () => {
    if (!text.trim()) return;

    const overlay: TextOverlay = {
      id: `text_${Date.now()}`,
      text: text.trim(),
      x: width / 2 - 50,
      y: 200,
      fontSize: selectedSize,
      color: selectedColor,
      fontWeight: isBold ? 'bold' : 'normal',
      rotation: 0,
    };

    onAddText(overlay);
    setText('');
  };

  return (
    <View style={styles.container}>
      {/* Text Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          placeholder="Type your text..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={text}
          onChangeText={setText}
          returnKeyType="done"
          onSubmitEditing={handleAddText}
        />
        <TouchableOpacity onPress={handleAddText}>
          <LinearGradient
            colors={['#329D9C', '#00D988']}
            style={styles.addButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <FontAwesome6 name="plus" size={16} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Color Picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
        {COLORS.map(color => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorDot,
              { backgroundColor: color },
              selectedColor === color && styles.colorDotActive,
            ]}
            onPress={() => setSelectedColor(color)}
          />
        ))}
      </ScrollView>

      {/* Font Size + Bold */}
      <View style={styles.optionsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FONT_SIZES.map(size => (
            <TouchableOpacity
              key={size}
              style={[styles.sizeButton, selectedSize === size && styles.sizeButtonActive]}
              onPress={() => setSelectedSize(size)}
            >
              <Text style={[styles.sizeText, selectedSize === size && styles.sizeTextActive]}>
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={[styles.boldButton, isBold && styles.boldButtonActive]}
          onPress={() => setIsBold(!isBold)}
        >
          <Text style={[styles.boldText, isBold && styles.boldTextActive]}>B</Text>
        </TouchableOpacity>
      </View>

      {/* Active Text Overlays */}
      {textOverlays.length > 0 && (
        <View style={styles.overlayList}>
          <Text style={styles.overlayListTitle}>Active Texts</Text>
          {textOverlays.map(overlay => (
            <View key={overlay.id} style={styles.overlayItem}>
              <Text
                style={[styles.overlayText, { color: overlay.color }]}
                numberOfLines={1}
              >
                "{overlay.text}"
              </Text>
              <TouchableOpacity onPress={() => onRemoveText(overlay.id)}>
                <FontAwesome6 name="trash" size={14} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: 'white',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorRow: {
    flexDirection: 'row',
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: 'white',
    transform: [{ scale: 1.15 }],
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sizeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 6,
  },
  sizeButtonActive: {
    backgroundColor: 'rgba(50, 157, 156, 0.3)',
  },
  sizeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '500',
  },
  sizeTextActive: {
    color: '#00D988',
    fontWeight: '700',
  },
  boldButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boldButtonActive: {
    backgroundColor: 'rgba(50, 157, 156, 0.3)',
  },
  boldText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontWeight: '900',
  },
  boldTextActive: {
    color: '#00D988',
  },
  overlayList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 10,
    gap: 6,
  },
  overlayListTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  overlayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  overlayText: {
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
});
