import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { StyleSheet as UnistylesSheet, useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '../../../stores/UserStore';

const BOOSTER_ITEM_ID = 'xp_boost_24h';

export default function BoosterWidget() {
  const { theme } = useUnistyles();
  const { profile, inventory, activateBooster, fetchProfile } = useUserStore();
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check Active Boost
  const boostEndTime = profile?.active_boost_end_time;
  const isBoostActive = boostEndTime && new Date(boostEndTime) > new Date();
  
  // Check Inventory
  const boosterItem = inventory.find(i => i.item_id === BOOSTER_ITEM_ID);
  const ownedQuantity = boosterItem?.quantity || 0;

  useEffect(() => {
    if (!isBoostActive || !boostEndTime) {
      if (timeLeft !== null) setTimeLeft(null); // Clear timer if store already updated
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const end = new Date(boostEndTime);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(null);
        // FORCE REFRESH when timer expires
        // This will update 'profile.active_boost_end_time' -> causing isBoostActive to be false
        // -> removing the banner in ShowMissionsScreen automatically.
        fetchProfile(); 
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      // Compact time format: 23h 59m -> 23:59
      const paddedM = m.toString().padStart(2, '0');
      setTimeLeft(`${h}:${paddedM}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [boostEndTime, isBoostActive]);

  const handleActivate = async () => {
    if (isBoostActive) {
      Alert.alert('Boost Active', `Time remaining: ${timeLeft}`);
      return;
    }
    
    if (ownedQuantity <= 0) {
        Alert.alert('No Booster', 'You do not have any XP Fertilizers!');
        return;
    }
    
    setLoading(true);
    const result = await activateBooster(BOOSTER_ITEM_ID);
    setLoading(false);

    if (result.success) {
      Alert.alert('Boost Activated!', 'XP x1.5 active for 24h! 🚀');
    } else {
      Alert.alert('Error', result.message || 'Could not activate booster.');
    }
  };

  // Always show for testing
  // if (!isBoostActive && ownedQuantity === 0) return null;

  return (
    <TouchableOpacity onPress={handleActivate} disabled={loading} style={styles.container}>
       {/* Background Glow if active */}
       {isBoostActive && (
          <LinearGradient
            colors={['rgba(46, 204, 113, 0.6)', 'rgba(39, 174, 96, 0.0)']}
            style={styles.activeGlow}
          />
       )}
       
       <Image 
          source={require('../../../../assets/images/XPBoostItem.png')} 
          style={[styles.image, isBoostActive && styles.activeImage]}
       />
       
       {isBoostActive ? (
         <View style={styles.timerBadge}>
            <Text style={styles.timerText}>{timeLeft}</Text>
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
  },
  image: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
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
    bottom: 5,
    right: 5,
    backgroundColor: '#329D9C',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  countText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  timerBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#2ecc71',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  timerText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  }
}));
