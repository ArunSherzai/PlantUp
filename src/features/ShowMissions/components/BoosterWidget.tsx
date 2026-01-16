import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet as UnistylesSheet, useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '../../../stores/UserStore';

const { width } = Dimensions.get('window');
const vw = width / 100;

export default function BoosterWidget() {
  const { theme } = useUnistyles();
  const { profile, fetchProfile } = useUserStore();
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // Check Active Boost
  const boostEndTime = profile?.active_boost_end_time;
  const isBoostActive = boostEndTime && new Date(boostEndTime) > new Date();

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

  // Navigation
  const navigation = useNavigation<any>(); // Simple typing for now to avoid circular deps if needed

  const handleActivate = () => {
    // Navigate to Shop, specifically the Inventory tab
    navigation.navigate('Shop', { initialTab: 'inventory' });
  };

  // Always show for testing
  // if (!isBoostActive && ownedQuantity === 0) return null;

  return (
    <TouchableOpacity onPress={handleActivate} style={styles.container}>
       {/* Background Glow if active */}
       {isBoostActive && (
          <LinearGradient
            colors={['rgba(46, 204, 113, 0.6)', 'rgba(39, 174, 96, 0.0)']}
            style={styles.activeGlow}
          />
       )}
       
       <FontAwesome6 
          name="basket-shopping"
          size={32} 
          color={isBoostActive ? "#FFFFFF" : theme.colors.text}
          style={[styles.icon, isBoostActive && styles.activeIcon]} 
       />
       
       {isBoostActive && (
         <View style={styles.timerBadge}>
            <Text style={styles.timerText}>{timeLeft}</Text>
         </View>
       )}
    </TouchableOpacity>
  );
}

const styles = UnistylesSheet.create((theme) => ({
  container: {
    width: vw * 20,
    height: vw * 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeIcon: {
    shadowColor: '#FFF',
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  activeGlow: {
    position: 'absolute',
    width: vw * 24,
    height: vw * 24,
    borderRadius: vw * 12,
    zIndex: -1,
  },
  
  // Badges
  countBadge: {
    position: 'absolute',
    bottom: vw * 1,
    right: vw * 1,
    backgroundColor: '#329D9C',
    borderRadius: vw * 3.5,
    width: vw * 7,
    height: vw * 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  countText: {
    color: 'white',
    fontSize: vw * 3.5,
    fontWeight: 'bold',
  },
  
  timerBadge: {
    position: 'absolute',
    bottom: -vw * 1.5,
    backgroundColor: '#2ecc71',
    paddingHorizontal: vw * 1.5,
    paddingVertical: vw * 0.8,
    borderRadius: vw * 1.5,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  timerText: {
    color: 'white',
    fontSize: vw * 2.8,
    fontWeight: 'bold',
  }
}));
