import React, { useState, useCallback } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useUnistyles } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useUserStore } from '../../../stores/UserStore';
import DraggableBottomSheet from '../../../components/DraggableBottomSheet';
import GradientIcon from '../../../components/GradientIcon';
import GradientText from '../../../components/GradientText';
import RankCard from '../../../components/RankCard';
import RewardItem from '../../../components/RewardItem';
import { REWARDS, getRankName } from '../../../utils/leveling';
import PostListTab from './components/PostListTab';

export default function ProfileScreen() {
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();
  const { user, profile, fetchProfile } = useUserStore();
  const [activeTab, setActiveTab] = useState('leveling');

  useFocusEffect(
    useCallback(() => {
      if (user) fetchProfile();
    }, [user, fetchProfile])
  );

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Derived Values
  const currentLevel = profile?.level || 1;
  const currentXP = profile?.xp || 0;
  const currentRank = getRankName(currentLevel);

  // Placeholder data for stats
  const stats = [
    { label: 'Plants', value: profile?.plants_count || 0 },
    { label: 'Coins', value: profile?.plant_coins || 0 },
    {
      label: 'Following',
      value: profile?.following_count || 0,
      onPress: () => navigation.navigate('Connections', { initialTab: 'following' })
    },
    {
      label: 'Follower',
      value: profile?.followers_count || 0,
      onPress: () => navigation.navigate('Connections', { initialTab: 'followers' })
    },
  ];

  const handleClaimReward = (rewardTitle: string) => {
    Alert.alert('Reward Claimed!', `You have claimed: ${rewardTitle}`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'leveling':
        return (
          <>
            <TouchableOpacity
              style={[styles.plantsButton, { backgroundColor: theme.colors.background }]}
              onPress={() => navigation.navigate('UserPlants', { userId: user.id })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={require('../../../../assets/images/ProfilePlantIcon.png')}
                  style={{ width: 24, height: 24, marginRight: 8 }}
                  resizeMode="contain"
                />
                <Text style={[styles.plantsButtonText, { color: theme.colors.text }]}>Plants</Text>
              </View>
              <GradientIcon name="chevron-right" size={14} />
            </TouchableOpacity>

            {/* Rank Card */}
            <RankCard level={currentLevel} xp={currentXP} rankName={currentRank} />

            {/* Rewards Section */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Rewards</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.rewardsScroll}>
              {REWARDS.map((reward) => (
                <RewardItem
                  key={reward.level}
                  title={reward.title}
                  description={reward.description}
                  isUnlocked={currentLevel >= reward.level}
                  onClaim={() => handleClaimReward(reward.title)}
                />
              ))}
            </ScrollView>
          </>
        );
      case 'posts':
        return (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>My Posts</Text>
            <PostListTab userId={user.id} emptyMessage="You haven't posted anything yet." />
          </>
        );
      case 'likes':
        return (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Liked Posts</Text>
            <PostListTab likedBy={user.id} emptyMessage="You haven't liked any posts yet." />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header Background */}
        <View style={styles.headerBg}>
          <Image
            source={require('../../../../assets/images/profileScreenBackground.png')}
            style={styles.headerGradient}
            resizeMode="cover"
          />

          <View style={styles.headerContent}>
            {/* Header Top Row: BackButton & Settings */}
            <View style={styles.headerTopRow}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => navigation.goBack()}
              >
                <FontAwesome6 name="chevron-left" size={20} color={theme.colors.textDark} />
              </TouchableOpacity>

              {/* Settings Button */}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <FontAwesome6 name="gear" size={24} color={theme.colors.textDark} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.headerTitle, { color: theme.colors.textDark }]}>
              Your{'\n'}Growing{'\n'}Profile!
            </Text>
          </View>
        </View>

        {/* Draggable Bottom Sheet */}
        <DraggableBottomSheet initialHeight={0.65} maxHeight={0.9}>
          <ScrollView
            contentContainerStyle={[styles.sheetContent, { paddingBottom: 100 }]}
            showsVerticalScrollIndicator={false}>

            {/* Profile Card */}
            <View style={[styles.profileCard, { backgroundColor: theme.colors.background }]}>
              {/* Top Row: Avatar + Name/Title */}
              <View style={styles.topRow}>
                <View style={styles.avatarContainer}>
                  <Image
                    source={require('../../../../assets/images/Profilbild.png')}
                    style={[styles.avatar, { backgroundColor: theme.colors.greyedOut }]}
                  />
                </View>

                <View style={styles.userInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.userName, { color: theme.colors.text }]}>
                      {profile?.username || user?.email?.split('@')[0] || 'Gardener'}
                    </Text>
                    <GradientIcon name="pen" size={14} style={{ marginLeft: 8 }} />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      color: profile?.titlecolor || theme.colors.text,
                      marginTop: 4,
                      fontWeight: '600',
                    }}>
                    {profile?.title}
                  </Text>
                </View>
              </View>

              {/* Bio Section (Below Top Row) */}
              <Text style={[styles.userBio, { color: theme.colors.text }]}>
                Coole bio haha...
              </Text>
            </View>

            {/* Stats Row */}
            <View style={[styles.statsRow, { backgroundColor: theme.colors.background }]}>
              {stats.map((stat, index) => {
                const Wrapper = stat.onPress ? TouchableOpacity : View;
                return (
                  <Wrapper key={index} style={styles.statItem} onPress={stat.onPress}>
                    <GradientText text={String(stat.value)} style={[styles.statValue, { color: theme.colors.primary }]} />
                    <Text style={[styles.statLabel, { color: theme.colors.typography }]}>{stat.label}</Text>
                  </Wrapper>
                );
              })}
            </View>

            {/* Action Buttons */}
            <View style={[styles.actionRow, { backgroundColor: theme.colors.background }]}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setActiveTab('leveling')}>
                {activeTab === 'leveling' ? (
                  <View style={{ alignItems: 'center', width: '100%' }}>
                    <GradientIcon name="seedling" size={20} />
                    <LinearGradient
                      colors={theme.colors.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.activeTabLine}
                    />
                  </View>
                ) : (
                  <FontAwesome6 name="seedling" size={20} color={theme.colors.greyedOut} />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => setActiveTab('posts')}>
                {activeTab === 'posts' ? (
                  <View style={{ alignItems: 'center', width: '100%' }}>
                    <GradientIcon name="list" size={20} />
                    <LinearGradient
                      colors={theme.colors.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.activeTabLine}
                    />
                  </View>
                ) : (
                  <FontAwesome6 name="list" size={20} color={theme.colors.greyedOut} />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => setActiveTab('likes')}>
                {activeTab === 'likes' ? (
                  <View style={{ alignItems: 'center', width: '100%' }}>
                    <GradientIcon name="thumbs-up" size={20} />
                    <LinearGradient
                      colors={theme.colors.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.activeTabLine}
                    />
                  </View>
                ) : (
                  <FontAwesome6 name="thumbs-up" size={20} color={theme.colors.greyedOut} />
                )}
              </TouchableOpacity>
            </View>

            {/* Dynamic Content */}
            {renderContent()}

          </ScrollView>
        </DraggableBottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBg: {
    height: '55%',
    width: '100%',
    position: 'absolute',
    top: 0,
  },
  headerGradient: {
    flex: 1,
  },
  headerContent: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 46,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'column',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  avatarContainer: {
    marginRight: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userBio: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  activeTabLine: {
    height: 3,
    width: '60%',
    marginTop: 5,
    borderRadius: 1.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  plantsButton: {
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  plantsButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  rewardsScroll: {
    marginTop: 10,
    marginBottom: 250,
  },
  comingSoonContainer: {
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  comingSoonText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
});
