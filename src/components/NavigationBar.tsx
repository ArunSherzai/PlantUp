import React from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, TextStyle, ButtonProps, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@react-navigation/native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';



export default function NavigationBar() {

    const { theme } = useUnistyles();
    const navigation = useNavigation();

  return (
    <View style={styles.container}>
        <TouchableOpacity style={styles.touchable}>
            <FontAwesome6 name="home" size={24} color="black" />
        </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
      height: 40,
      width: "100%",
      alignItems: "center",
      justifyContent: "space-around",
      borderRadius: 30,
    },
    touchable: {
      
    },
}));

