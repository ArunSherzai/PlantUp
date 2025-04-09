import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './LoginScreen';
import HomeScreen from './HomeScreen'; // HomeScreen importieren

const Stack = createStackNavigator();

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" /> 
      <Stack.Navigator initialRouteName="LoginScreen">
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </>
  );
}
