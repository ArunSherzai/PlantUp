import React, { useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useUserStore } from '../../../stores/UserStore';
import UserProfile from '../../../components/UserProfile';

export default function ProfileScreen() {
  const { user, fetchProfile } = useUserStore();

  useFocusEffect(
    useCallback(() => {
      if (user) fetchProfile();
    }, [user])
  );

  if (!user) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /></View>;
  }

  return <UserProfile userId={user.id} isOwner={true} />;
}
