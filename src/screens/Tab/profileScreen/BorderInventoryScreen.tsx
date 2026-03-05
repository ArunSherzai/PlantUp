import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';
import { useUnistyles } from 'react-native-unistyles';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useUserStore } from '../../../stores/UserStore';
import { playSound } from '~/utils/SoundManager';

export default function BorderInventoryScreen() {
  const { theme } = useUnistyles();
  const navigation = useNavigation();
  const { ownedBorders, fetchBorders, equipBorder, profile } = useUserStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchBorders();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchBorders();
    setRefreshing(false);
    playSound('reload');
  }, [fetchBorders]);

  const handleEquip = async (borderId: string | null) => {
    playSound('confirm');
    await equipBorder(borderId);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          playSound('click');
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            // Determine fall back screen or just console log in dev
            console.log("Cannot go back from BorderInventory");
            // Optional: navigation.navigate('TabNavigator'); 
          }
        }}>
          <FontAwesome6 name="chevron-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Borders</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
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
              Visit the shop to get Lootboxes!
            </Text>
            <TouchableOpacity
              style={[styles.equipButton, { backgroundColor: theme.colors.primary, marginTop: 20 }]}
              onPress={() => {
                playSound('click');
                navigation.navigate('Shop' as never);
              }}
            >
              <Text style={styles.equipButtonText}>Go to Shop</Text>
            </TouchableOpacity>
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
                <Image
                  source={profile?.profile_image ? { uri: profile.profile_image } : require('../../../../assets/images/Profilbild.jpg')}
                  style={styles.avatarPreview}
                />
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
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
                  <Image
                    source={profile?.profile_image ? { uri: profile.profile_image } : require('../../../../assets/images/Profilbild.jpg')}
                    style={styles.avatarPreview}
                  />
                  {border.media_url && (
                    <ExpoImage
                      source={{ uri: border.media_url }}
                      style={[
                        styles.borderPreview,
                        border.media_url.includes('.gif')
                          ? {
                            width: '150%', // 🟢 GIFs
                            height: '150%',
                            top: '-25%',
                            left: '-25%',
                          }
                          : border.name?.toLowerCase().includes('lightning')
                            ? {
                              width: '150%', // 🟢 Water Lightning needs extra scale
                              height: '150%',
                              top: '-25%',
                              left: '-25%',
                            }
                            : {
                              width: '91%',  // 🟢 Standard PNGs (poolparty, halloween, etc.)
                              height: '91%',
                              top: '4.5%',
                              left: '4.5%',
                            }
                      ]}
                      contentFit="contain"
                    />
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
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
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
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
    width: '100%',
    aspectRatio: 1, // 🟢 Makes it a responsive square based on card width
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarPreview: {
    width: '60%', // 🟢 Relative to square container
    height: '60%',
    borderRadius: 100, // Large enough to be circle
    backgroundColor: '#ccc',
  },
  borderPreview: {
    position: 'absolute',
    pointerEvents: 'none',
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
    minWidth: '80%',
    alignItems: 'center',
  },
  equipButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
