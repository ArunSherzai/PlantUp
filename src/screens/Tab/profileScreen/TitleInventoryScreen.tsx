import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useUserStore } from '../../../stores/UserStore';

export default function TitleInventoryScreen() {
  const { theme } = useUnistyles();
  const navigation = useNavigation();
  const { ownedTitles, fetchTitles, equipTitle } = useUserStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchTitles();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchTitles();
    setRefreshing(false);
  }, [fetchTitles]);

  const handleEquip = async (titleId: string | null) => {
    await equipTitle(titleId);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <FontAwesome6 name="chevron-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Titles</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {ownedTitles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="scroll" size={64} color={theme.colors.greyedOut} />
            <Text style={[styles.emptyText, { color: theme.colors.greyedOut }]}>
              No titles owned yet.
            </Text>
            <Text style={[styles.emptySubText, { color: theme.colors.greyedOut }]}>
              Complete quests or level up to earn them!
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {/* No Title Option */}
            <View
              style={[
                styles.card,
                { backgroundColor: theme.colors.surface },
                !ownedTitles.some(t => t.is_equipped) && { borderColor: theme.colors.accent, borderWidth: 2 }
              ]}
            >
              <View style={styles.previewContainer}>
                <Text style={[styles.titlePreview, { color: theme.colors.text, fontStyle: 'italic' }]}>No Title</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.equipButton,
                  { backgroundColor: !ownedTitles.some(t => t.is_equipped) ? theme.colors.accent : theme.colors.primary }
                ]}
                disabled={!ownedTitles.some(t => t.is_equipped)}
                onPress={() => handleEquip(null)}
              >
                {!ownedTitles.some(t => t.is_equipped) ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <FontAwesome6 name="check" size={12} color="#fff" />
                    <Text style={styles.equipButtonText}>Equipped</Text>
                  </View>
                ) : (
                  <Text style={styles.equipButtonText}>Equip</Text>
                )}
              </TouchableOpacity>
            </View>

            {ownedTitles.map((title) => (
              <View
                key={title.id}
                style={[
                  styles.card,
                  { backgroundColor: theme.colors.surface },
                  title.is_equipped && { borderColor: theme.colors.accent, borderWidth: 2 }
                ]}
              >
                <View style={styles.previewContainer}>
                  <Text style={[styles.titlePreview, { color: title.color || theme.colors.text }]}>
                    {title.name}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.equipButton,
                    { backgroundColor: title.is_equipped ? theme.colors.accent : theme.colors.primary }
                  ]}
                  disabled={title.is_equipped}
                  onPress={() => handleEquip(title.id)}
                >
                  {title.is_equipped ? (
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
  list: {
    gap: 15,
  },
  card: {
    width: '100%',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row', // Row layout for titles
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titlePreview: {
    fontSize: 18,
    fontWeight: 'bold',
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
