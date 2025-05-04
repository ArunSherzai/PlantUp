import { createStackNavigator } from '@react-navigation/stack';

import Login from '~/screens/auth/Login';
import Register from '~/screens/auth/Register';
import Welcome from '~/screens/auth/Welcome';
import ForgotPass from '~/screens/auth/ForgotPass';
import ResetPass from '~/screens/auth/ResetPass';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPass: undefined;
  ResetPass: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        animationTypeForReplace: 'push',
      }}>
      <Stack.Screen name="Login" component={Login} />

      <Stack.Screen name="Welcome" component={Welcome} />

      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen
        name="ForgotPass"
        component={ForgotPass}
        options={{
          animation: 'slide_from_right',
          animationTypeForReplace: 'push',
        }}
      />
      <Stack.Screen
        name="ResetPass"
        component={ResetPass}
        options={{
          animation: 'slide_from_right',
          animationTypeForReplace: 'push',
        }}
      />
    </Stack.Navigator>
  );
}
