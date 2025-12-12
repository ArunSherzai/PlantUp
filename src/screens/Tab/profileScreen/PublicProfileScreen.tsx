import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import UserProfile from '../../../components/UserProfile';
import { RootStackParamList } from '../../../navigation/Root';

type PublicProfileRouteProp = RouteProp<RootStackParamList, 'PublicProfile'>;

export default function PublicProfileScreen() {
    const route = useRoute<PublicProfileRouteProp>();
    // Expect userId to be passed, fallback shouldn't happen if typed correctly
    const { userId } = route.params;

    return <UserProfile userId={userId} />;
}
