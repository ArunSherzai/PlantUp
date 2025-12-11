import React, { useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useUserStore } from '../../../stores/UserStore';
import { usePlantTipSystem } from '../../../hooks/usePlantTipSystem';
import { useTipStore } from '../../../stores/TipStore';
import { getRandomGeneralTip } from '../../../utils/tipResolver';
import RankCard from '../../../components/RankCard';
import RewardItem from '../../../components/RewardItem';
import { REWARDS, getRankName } from '../../../utils/leveling';
import DraggableBottomSheet from '../../../components/DraggableBottomSheet';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import GradientIcon from '../../../components/GradientIcon';
import GradientText from '../../../components/GradientText';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/Root';
import { useSocialStats } from '../../../features/social/hooks/useSocialStats';
import { usePlants } from '../../../features/plantlist/hooks/usePlants';
import { usePosts } from '../../../hooks/usePosts';
import MasonryFeedGrid from '../../../components/MasonryFeedGrid';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { theme } = useUnistyles();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, profile, fetchProfile } = useUserStore();
  const { followersCount, friendsCount, refreshStats } = useSocialStats(user?.id);
  const { plants, refreshPlants } = usePlants();

  // My Posts
  const { posts: myPosts, loading: myPostsLoading, refreshPosts: refreshMyPosts } = usePosts({ userId: user?.id });

  // Liked Posts
  const { posts: likedPosts, loading: likedPostsLoading, refreshPosts: refreshLikedPosts } = usePosts({ likedBy: user?.id });

  const [activeTab, setActiveTab] = React.useState<'leveling' | 'posts' | 'likes'>('leveling');

  // Tip System
  const { triggerManualTip } = usePlantTipSystem();
  // We need to monitor activeTip to trigger the sequential logic
  // but triggers should probably be handled carefully to avoiding infinite loops
  // Simplest approach: "Test Tips" button manually sets a sequence.

  const handleTestTips = () => {
    // 1. Trigger random tip
    const randomTip = getRandomGeneralTip();
    useTipStore.getState().setActiveTip(randomTip);

    // 2. Wait for dismissal (we can poll or use a timeout for simulation, 
    // but better is to subscribe. For this simple test feature, 
    // let's just wait a few seconds or trigger the second one after a delay?)
    // User asked: "when i click it it triggers a random tip and then a plant specific tip right after"
    // "Right after" could mean immediately replacing it, or waiting for close.
    // Let's assume waiting for close is better UX, but "right after" usually implies automatic sequencing.
    // If I just fire the random tip, the user sees it.
    // If I want to show another one "right after", I should probably wait for the first one to be closed.

    // Hacky but effective for a test button: 
    // Override the dismiss behavior TEMPORARILY or just use a timeout?
    // Let's use a timeout for the second tip to appear after the first one is likely read, 
    // OR just rely on the user closing the first one?

    // Actually, to implement "trigger A then trigger B", we need to know when A is gone.
    // Let's just trigger the Plant Tip manually, but we need to know WHICH plant.
    // The hook `triggerManualTip` uses the *latest scanned* plant.

    // Let's try this: Show Random Tip. Then 5 seconds later (or upon close), show Plant Tip.
    // Since we don't have an easy "onClose" callback chain here without global event bus,
    // let's just trigger the Plant Tip immediately after the user dismisses the random one?
    // No, the store doesn't have a callback.

    // Alternative: Just fire the Plant Tip. The `SpriteComponent` will show the active tip.
    // If we simply overwrite it, the user won't see the first one.

    // Refined Plan for Button:
    // 1. Trigger Random Tip.
    // 2. Set complete "Plant Tip" logic to run via `triggerManualTip` but we need to make sure 
    // it happens *after* the random tip.

    // Let's rely on a simple alert or proper queue? 
    // The user wants a button to TEST it. so let's just trigger the PLANT tip, 
    // because the random tip triggers automatically anyway?
    // User request: "triggers a random tip and then a plant specific tip right after"

    Alert.alert(
      "Test Tips Sequence",
      "I will show a Random Tip now. When you close it, click this button again to see a Plant Tip? Or should I force it?",
      [
        {
          text: "Random Tip", onPress: () => {
            const tip = getRandomGeneralTip();
            useTipStore.getState().setActiveTip(tip);
          }
        },
        { text: "Plant Tip", onPress: () => triggerManualTip() },
        {
          text: "Both (Sequence)", onPress: () => {
            // Show Random
            const tip = getRandomGeneralTip();
            useTipStore.getState().setActiveTip(tip);

            // Queue Plant Tip? We don't have a queue.
            // Let's just set a timeout to replace it after 3 seconds for demo purposes
            setTimeout(() => {
              triggerManualTip();
            }, 4000);
          }
        }
      ]
    );
  };
  // Re-reading request: "add a test tips buttons... when i click it it triggers a random tip and then a plant specific tip right after"
  // Let's implement the "Sequence" logic directly on press without the Alert, 
  // but maybe using a smart subscriber would be over-engineering.
  // 3-4 seconds delay seems like a good "right after" interpretation for a test button.

  const onRunTestSequence = () => {
    // 1. Random Tip
    const randomTip = getRandomGeneralTip();
    useTipStore.getState().setActiveTip(randomTip);

    // 2. Schedule Plant Tip
    setTimeout(() => {
      triggerManualTip();
    }, 5000); // 5 seconds to read
  };

  useFocusEffect(
    useCallback(() => {
      console.log('--- Profile Screen Focused ---');
      console.log('User:', user);
      console.log('Profile:', profile);
      console.log('Current Level:', profile?.level);
      console.log('Username:', profile?.username);
      console.log('Plant Coins:', profile?.plant_coins);
      console.log('Plant Coins:', profile?.plant_coins);
      fetchProfile();
      refreshStats();
      refreshPlants();
      refreshMyPosts();
      refreshLikedPosts();
      console.log('Profile refreshed on focus');
    }, [])
  );

  const currentLevel = profile?.level || 1;
  const currentXP = profile?.xp || 0;
  const currentRank = getRankName(currentLevel);

  // Placeholder data for stats
  const stats = [
    { label: 'Plants', value: plants.length },
    { label: 'Coins', value: profile?.plant_coins || 0 },
    { label: 'Friends', value: friendsCount },
    { label: 'Follower', value: followersCount },
  ];

  const handleClaimReward = (rewardTitle: string) => {
    // Rewards can be added here
    Alert.alert('Reward Claimed!', `You have claimed: ${rewardTitle}`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'leveling':
        return (
          <>
            {/* Plants Button */}
            <TouchableOpacity style={styles.plantsButton} onPress={() => navigation.navigate('UserPlants')}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={require('../../../../assets/images/ProfilePlantIcon.png')}
                  style={{ width: 24, height: 24, marginRight: 8 }}
                  resizeMode="contain"
                />
                <Text style={styles.plantsButtonText}>Plants</Text>
              </View>
              <GradientIcon name="chevron-right" size={14} />
            </TouchableOpacity>

            {/* Test Tips Button */}
            <TouchableOpacity
              style={[styles.plantsButton, { marginTop: 10 }]}
              onPress={onRunTestSequence}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesome6 name="vial" size={24} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.plantsButtonText}>Test Tips (Random then Plant)</Text>
              </View>
              <GradientIcon name="chevron-right" size={14} />
            </TouchableOpacity>

            {/* Test Lootbox Button */}
            <TouchableOpacity
              style={[styles.plantsButton, { marginTop: 10 }]}
              onPress={() => navigation.navigate('Lootbox', { itemName: 'Rare Monstera' })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesome6 name="gift" size={24} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.plantsButtonText}>Test Lootbox</Text>
              </View>
              <GradientIcon name="chevron-right" size={14} />
            </TouchableOpacity>

            {/* Rank Card */}
            <RankCard level={currentLevel} xp={currentXP} rankName={currentRank} />

            {/* Rewards Section */}
            <Text style={styles.sectionTitle}>Rewards</Text>
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
            <Text style={styles.sectionTitle}>My Posts</Text>
            {myPostsLoading ? (
              <View style={{ padding: 20 }}><Text style={{ color: theme.colors.typography }}>Loading...</Text></View>
            ) : myPosts.length === 0 ? (
              <View style={styles.comingSoonContainer}>
                <Text style={styles.comingSoonText}>You haven't posted anything yet.</Text>
              </View>
            ) : (
              <MasonryFeedGrid posts={myPosts} onPostPress={(item) => navigation.navigate('FeedPostDetail', { post: item })} />
            )}
          </>
        );
      case 'likes':
        return (
          <>
            <Text style={styles.sectionTitle}>Liked Posts</Text>
            {likedPostsLoading ? (
              <View style={{ padding: 20 }}><Text style={{ color: theme.colors.typography }}>Loading...</Text></View>
            ) : likedPosts.length === 0 ? (
              <View style={styles.comingSoonContainer}>
                <Text style={styles.comingSoonText}>You haven't liked any posts yet.</Text>
              </View>
            ) : (
              <MasonryFeedGrid posts={likedPosts} onPostPress={(item) => navigation.navigate('FeedPostDetail', { post: item })} />
            )}
          </>
        );
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header Background */}
        <View style={styles.headerBg}>
          <Image
            source={require('../../../../assets/images/profileScreenBackground.png')}
            style={styles.headerGradient}
            resizeMode="cover"
          />
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton}>
              <FontAwesome6 name="chevron-left" size={20} color={theme.colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
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
            <View style={styles.profileCard}>
              <View style={styles.avatarContainer}>
                <Image
                  source={require('../../../../assets/images/Profilbild.png')}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>
                    {profile?.username.split('@')[0] || 'Gardener'}
                  </Text>
                  <GradientIcon name="pen" size={14} style={{ marginLeft: 8 }} />
                </View>
                <Text style={styles.userBio}>Coole bio haha...</Text>
              </View>
            </View>
            {/* Stats Row */}
            <View style={styles.statsRow}>
              {stats.map((stat, index) => (
                <View key={index} style={styles.statItem}>
                  <GradientText text={stat.value} style={styles.statValue} />
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
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

            {/* Extra padding at bottom for scrolling */}
          </ScrollView>
        </DraggableBottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerBg: {
    height: '100%', // Cover full background initially
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
  },
  backButton: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: theme.colors.textDark,
    lineHeight: 46,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.greyedOut,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  userBio: {
    fontSize: 14,
    color: theme.colors.typography,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.background,
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
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.typography,
    marginTop: 2,
  },
  plantsButton: {
    backgroundColor: theme.colors.background,
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
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 10,
    marginBottom: 10,
  },
  rewardsScroll: {
    marginTop: 10,
    marginBottom: 250,
  },
  comingSoonContainer: {
    backgroundColor: theme.colors.surface + 'B3', // 70% opacity
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
    borderStyle: 'dashed',
  },
  comingSoonText: {
    fontSize: 16,
    color: theme.colors.typography,
    fontStyle: 'italic',
  },
}));
