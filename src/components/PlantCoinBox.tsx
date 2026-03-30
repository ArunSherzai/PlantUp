import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { StyleSheet } from '~/lib/unistyles';
import { useUserStore } from '../stores/UserStore';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';

export const PlantCoinBox = () => {
  const { profile, addPlantCoins } = useUserStore();
  const navigation = useNavigation<any>();

  const formattedCoins = React.useMemo(() => {
    if (profile?.plant_coins == null) return '0';
    return profile.plant_coins.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }, [profile?.plant_coins]);

  return (
    <View style={styles.container}>
      <View style={styles.box}>
        {/* green + button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Shop')}
          style={styles.plusButton}
          activeOpacity={0.8}>
          <FontAwesome6 name="shop" size={16} style={styles.plusIcon} />
        </TouchableOpacity>

        {/* amount */}
        <Text style={styles.amountText}>{formattedCoins}</Text>

        {/* Plant Up coin image */}
        <Image
          source={require('../../assets/images/plantupcoin.png')}
          style={styles.coinImage}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    position: 'absolute',
    top: 20,
    right: 10,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8, // Android shadow
  },
  plusButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  plusIcon: {
    color: theme.colors.textDark,
  },
  amountText: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.textDark,
    marginHorizontal: 4,
  },
  coinImage: {
    width: 26,
    height: 26,
    marginLeft: 4,
  },
}));
