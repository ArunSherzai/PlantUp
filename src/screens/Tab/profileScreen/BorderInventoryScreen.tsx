import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { useNavigation } from '@react-navigation/native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '../../../stores/UserStore';

export default function BorderInventoryScreen() {
  const { theme } = useUnistyles();
  const navigation = useNavigation();
  const { ownedBorders, fetchBorders, equipBorder } = useUserStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchBorders();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchBorders();
    setRefreshing(false);
  }, [fetchBorders]);

  const handleEquip = async (borderId: string | null) => {
    await equipBorder(borderId);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <FontAwesome6 name="chevron-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Borders</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {ownedBorders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="box-open" size={64} color={theme.colors.greyedOut} />
            <Text style={[styles.emptyText, { color: theme.colors.greyedOut }]}>
              No borders owned yet.
            </Text>
            <Text style={[styles.emptySubText, { color: theme.colors.greyedOut }]}>
              Complete quests or level up to earn them!
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {/* Default Option */}
            <View
                style={[
                  styles.card,
                  { backgroundColor: theme.colors.surface },
                  !ownedBorders.some(b => b.is_equipped) && { borderColor: theme.colors.accent, borderWidth: 2 }
                ]}
              >
                <View style={styles.previewContainer}>
                  <Image source={require('../../../../assets/images/Profilbild.png')} style={styles.avatarPreview} />
                  {/* No border image for default */}
                </View>

                <Text style={[styles.borderName, { color: theme.colors.text }]}>Default</Text>
                <Text style={[styles.rarityText, { color: theme.colors.greyedOut }]}>
                  Common
                </Text>

                <TouchableOpacity
                  style={[
                    styles.equipButton,
                    { backgroundColor: !ownedBorders.some(b => b.is_equipped) ? theme.colors.accent : theme.colors.primary }
                  ]}
                  disabled={!ownedBorders.some(b => b.is_equipped)}
                  onPress={() => handleEquip(null as any)}
                >
                    {!ownedBorders.some(b => b.is_equipped) ? (
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                            <FontAwesome6 name="check" size={12} color="#fff" />
                            <Text style={styles.equipButtonText}>Equipped</Text>
                        </View>
                    ) : (
                        <Text style={styles.equipButtonText}>Equip</Text>
                    )}
                </TouchableOpacity>
              </View>

            {ownedBorders.map((border) => (
              <View
                key={border.id}
                style={[
                  styles.card,
                  { backgroundColor: theme.colors.surface },
                  border.is_equipped && { borderColor: theme.colors.accent, borderWidth: 2 }
                ]}
              >
                <View style={styles.previewContainer}>
                  <Image source={require('../../../../assets/images/Profilbild.png')} style={styles.avatarPreview} />
                  {border.media_url && (
                     <Image source={{ uri: border.media_url }} style={styles.borderPreview} resizeMode="contain" />
                  )}
                </View>

                <Text style={[styles.borderName, { color: theme.colors.text }]}>{border.name}</Text>
                <Text style={[styles.rarityText, { color: border.rarity === 'Legendary' ? '#FFA500' : theme.colors.greyedOut }]}>
                  {border.rarity}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.equipButton,
                    { backgroundColor: border.is_equipped ? theme.colors.accent : theme.colors.primary }
                  ]}
                  disabled={border.is_equipped}
                  onPress={() => handleEquip(border.id)}
                >
                    {border.is_equipped ? (
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                            <FontAwesome6 name="check" size={12} color="#fff" />
                            <Text style={styles.equipButtonText}>Equipped</Text>
                        </View>
                    ) : (
                        <Text style={styles.equipButtonText}>Equip</Text>
                    )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    gap: 10,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    justifyContent: 'space-between',
  },
  card: {
    width: '47%', // slightly less than half to fit gap
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewContainer: {
    width: 100,
    height: 100,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ccc',
  },
  borderPreview: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  borderName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  rarityText: {
    fontSize: 12,
    marginBottom: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  equipButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  equipButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
