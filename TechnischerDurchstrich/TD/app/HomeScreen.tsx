import React from 'react';
import { View, Text, Button } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Home: undefined;
  LoginScreen: undefined;
};

type HomeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Home'>;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  return (
    <View style={{justifyContent: "center", alignItems:"center", flex: 1}}>
      <Text style={{borderWidth: 2, fontSize: 30, padding: 10, textAlign:"center"}}>Willkommen auf dem Home Screen!</Text>
      <Button title="Zurück zum Login" onPress={() => navigation.goBack()} />
    </View>
  );
};

export default HomeScreen;
