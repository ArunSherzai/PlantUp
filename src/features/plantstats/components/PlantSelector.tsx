import { View, Text, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export default function PlantSelector({
  plantsList,
  selectedPlant,
  isVisible,
  setVisible,
  onSelectPlant,
}: any) {
  const { theme } = useUnistyles();

  return (
    <>
      {/* BUTTON */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: 'rgba(0,0,0,0.25)' }]}
        onPress={() => setVisible(!isVisible)}>
        <Text style={[styles.text, { color: 'white', fontFamily: theme.fonts.regular }]}>
          {selectedPlant?.nickname ?? 'Select plant'}
        </Text>
        <Feather name="chevron-down" size={18} color="white" />
      </TouchableOpacity>

      {/* DROPDOWN MENU */}
      {isVisible && (
        <View style={[styles.menu, { backgroundColor: theme.colors.background }]}>
          {plantsList.map((p: any) => (
            <TouchableOpacity key={p.id} style={styles.menuItem} onPress={() => onSelectPlant(p)}>
              <Text
                style={[
                  styles.menuItemText,
                  { color: theme.colors.text, fontFamily: theme.fonts.regular },
                ]}>
                {p.nickname}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  text: {
    marginRight: 6,
    fontSize: 16,
  },
  menu: {
    position: 'absolute',
    top: 50,
    right: 20,
    borderRadius: 12,
    paddingVertical: 5,
    minWidth: 140,
    elevation: 5,
    zIndex: 40,
  },
  menuItem: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 16,
  },
}));
