import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { StyleSheet as UnistylesSheet, useUnistyles } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '../../../stores/UserStore';

const FREEZE_ITEM_ID = 'streak_freeze_24h';

export default function FreezeWidget() {
  const { theme } = useUnistyles();
  const { profile, inventory, activateStreakFreeze, fetchProfile } = useUserStore();
  const [loading, setLoading] = useState(false);

  // Check Active Freeze
  const freezeEndTime = profile?.active_streak_freeze_end_time;
  const isFrozen = freezeEndTime && new Date(freezeEndTime) > new Date();
  
  // Check Inventory
  const freezeItem = inventory.find(i => i.item_id === FREEZE_ITEM_ID);
  const ownedQuantity = freezeItem?.quantity || 0;

  useEffect(() => {
    if (!isFrozen || !freezeEndTime) return;

    // Timer check to auto-refresh when freeze ends
    const checkExpiry = () => {
      const now = new Date();
      const end = new Date(freezeEndTime);
      if (now >= end) {
        fetchProfile(); // Refresh to clear freeze state
      }
    };

    const interval = setInterval(checkExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [freezeEndTime, isFrozen]);

  const handleActivate = async () => {
    if (isFrozen) {
      Alert.alert('Streak Frozen ❄️', 'Your streak is currently protected from resetting!');
      return;
    }
    
    if (ownedQuantity <= 0) {
        Alert.alert('No Freeze Items', 'You do not have any Streak Freezes!');
        return;
    }
    
    setLoading(true);
    const result = await activateStreakFreeze();
    setLoading(false);

    if (result.success) {
      Alert.alert('Streak Frozen! ❄️', 'Your streak is protected for 24h!');
    } else {
      Alert.alert('Error', result.message || 'Could not activate freeze.');
    }
  };

  return (
    <TouchableOpacity onPress={handleActivate} disabled={loading} style={styles.container}>
       {/* Background Glow if active */}
       {isFrozen && (
          <LinearGradient
            colors={['rgba(165, 242, 243, 0.6)', 'rgba(0, 126, 167, 0.0)']}
            style={styles.activeGlow}
          />
       )}
       
       {/* TODO: Replace with actual Freeze Icon/Image */}
       {/* Consistently using XPBoostItem placehoder for now or a specialized one if user provides */}
       {/* Assuming we might want a different icon. For now, let's use a blurred/tinted version or just the same logic */}
       <Image 
          source={require('../../../../assets/images/XPBoostItem.png')} // User needs to provide a Freeze Image!
          style={[styles.image, isFrozen && styles.activeImage, { tintColor: '#A5F2F3' }]} 
       />
       
       {isFrozen ? (
         <View style={styles.activeBadge}>
            <Text style={styles.activeText}>❄️</Text>
         </View>
       ) : (
         <View style={styles.countBadge}>
            <Text style={styles.countText}>{ownedQuantity}</Text>
         </View>
       )}
    </TouchableOpacity>
  );
}

const styles = UnistylesSheet.create((theme) => ({
  container: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5, // Spacing if stacked
  },
  image: {
    width: 50, // Slightly smaller than boost to distinguish? Or same.
    height: 50,
    resizeMode: 'contain',
    opacity: 0.8,
  },
  activeImage: {
    opacity: 1,
  },
  activeGlow: {
    position: 'absolute',
    width: 95,
    height: 95,
    borderRadius: 47.5,
    zIndex: -1,
  },
  
  // Badges
  countBadge: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: '#007ea7', // Blue for freeze
    borderRadius: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  countText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  activeBadge: {
    position: 'absolute',
    bottom: 10,
    backgroundColor: '#007ea7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  activeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  }
}));
