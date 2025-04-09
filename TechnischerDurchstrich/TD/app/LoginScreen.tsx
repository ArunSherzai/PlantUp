import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { signIn, signUp } from '../auth'; // Dein Auth-Modul
import { StackNavigationProp } from '@react-navigation/stack';
import { Alert } from 'react-native';
import { Image } from 'react-native';

type RootStackParamList = {
  Home: undefined;
  LoginScreen: undefined;
};

type LoginScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'LoginScreen'>;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const user = await signIn(email, password);
    if (user) {
      Alert.alert("Login Erfolgreich", "Wilkommen zurück: " + user.email)
      navigation.navigate('Home');
    }
  };
  
  const handleSignUp = async () => {
    const user = await signUp(email, password, 'test');
    if (user) {
      Alert.alert("Registrierung Erfolgreich", "Herzlich Willkommen: " + user.email + "!")
      navigation.navigate('Home');
    }
  };

  return (
    <View>
      <Text style={{fontSize: 20}}>Email:</Text>
      <TextInput style={{fontSize: 20, borderWidth: 2, borderRadius: 10, padding: 5,height: 45}}value={email} onChangeText={setEmail} />
      <Text style={{fontSize: 20}}>Password:</Text>
      <TextInput style={{marginBottom: 10 ,fontSize: 20, borderWidth: 2, borderRadius: 10, padding: 5,height: 45}} value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Login" onPress={handleLogin} />
      <Button title="Sign Up" onPress={handleSignUp} />
    </View>
  );
};

export default LoginScreen;
