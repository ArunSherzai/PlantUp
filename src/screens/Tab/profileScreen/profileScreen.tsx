import React, { useState, useCallback } from 'react';
import { View, Text, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StyleSheet, useUnistyles } from '~/lib/unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { StatusBar } from 'expo-status-bar';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const vw = width / 100;

const withAlpha = (color: string | null | undefined, alpha: number) => {
  if (!color) return null;

  const trimmed = color.trim();
  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);

  if (!hexMatch) {
    return trimmed;
  }

  let hex = hexMatch[1];
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

import { useUserStore } from '../../../stores/UserStore';
import { useTutorialStore } from '../../../stores/TutorialStore';
import GradientIcon from '../../../components/GradientIcon';
import GradientText from '../../../components/GradientText';
// import RankCard from '../../../components/RankCard'; // Not used if inline
import RewardItem from '../../../components/RewardItem';
import {
  getRankName,
  Reward,
  getLevelProgress,
  getXPForNextLevel,
  getTotalXPForLevel,
} from '../../../utils/leveling';
import PostListTab from './components/PostListTab';
import { FontAwesome5 } from '@expo/vector-icons';
import RewardDetailsModal from '../../../components/RewardDetailsModal';
import PlantPotPreview, { PlantMode } from '../../../components/PlantPotPreview';
import { useEffect, useMemo, memo } from 'react';
import MentorBadge from '../../../components/MentorBadge';
import { isMentor } from '../../../utils/mentorUtils';
import { FlatList } from 'react-native';
import { useInboxStore } from '../../../stores/InboxStore';
import { showAlertDialog } from '~/services/appDialog';

// --- Sub-components to prevent full screen re-renders ---
const StatsRow = memo(
  ({ stats, theme, typographyColor }: { stats: any[]; theme: any; typographyColor: string }) => (
    <View style={[styles.statsRow, { backgroundColor: theme.colors.surface }]}>
      {stats.map((stat, index) => {
        const content = (
          <>
            <GradientText
              text={String(stat.value)}
              style={[styles.statValue, { color: theme.colors.primary }]}
            />
            <Text style={[styles.statLabel, { color: typographyColor, opacity: 0.6 }]}>
              {stat.label}
            </Text>
          </>
        );
        return stat.onPress ? (
          <TouchableOpacity key={index} style={styles.statItem} onPress={stat.onPress}>
            {content}
          </TouchableOpacity>
        ) : (
          <View key={index} style={styles.statItem}>
            {content}
          </View>
        );
      })}
    </View>
  )
);

export default function ProfileScreen() {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // Use selectors to prevent unnecessary re-renders when other parts of the store change
  const user = useUserStore((state) => state.user);
  const profile = useUserStore((state) => state.profile);
  const fetchProfile = useUserStore((state) => state.fetchProfile);
  const fetchDeepProfile = useUserStore((state) => state.fetchDeepProfile);
  const fetchTitles = useUserStore((state) => state.fetchTitles);
  const fetchBorders = useUserStore((state) => state.fetchBorders);
  const fetchUnclaimedRewards = useUserStore((state) => state.fetchUnclaimedRewards);
  const unclaimedRewards = useUserStore((state) => state.unclaimedRewards);
  const claimReward = useUserStore((state) => state.claimReward);
  const rewardsMap = useUserStore((state) => state.rewardsMap);
  const fetchRewardsMap = useUserStore((state) => state.fetchRewardsMap);
  const startTutorial = useTutorialStore((state) => state.startTutorial);
  const unreadInboxCount = useInboxStore((state) => state.unreadCount());
  const equippedInventoryTitle = useUserStore((state) =>
    state.ownedTitles.find((title) => title.is_equipped)
  );
  const equippedInventoryBorder = useUserStore((state) =>
    state.ownedBorders.find((border) => border.is_equipped)
  );

  const [activeTab, setActiveTab] = useState('leveling');
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isBioTruncated, setIsBioTruncated] = useState(false);
  // Just use 'any' for now since Reward type in leveling.ts might not match perfectly with DB reward
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [plantPreviewKey, setPlantPreviewKey] = useState(0);

  // New state to delay heavy 3D plant rendering to improve startup responsiveness
  const [isPlantReady, setIsPlantReady] = useState(false);
  const userId = user?.id;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPlantReady(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        // Keep equipped cosmetics fresh for the visible profile header, not only inventory.
        void (async () => {
          await fetchProfile();
          await Promise.all([fetchDeepProfile(), fetchTitles(), fetchBorders()]);
        })();
        fetchUnclaimedRewards();
      }

      return undefined;
    }, [
      userId,
      fetchProfile,
      fetchDeepProfile,
      fetchTitles,
      fetchBorders,
      fetchUnclaimedRewards,
    ])
  );

  const hasProfile = !!profile;
  const hasCompletedProfileTutorial = profile?.tutorial_progress?.profile_tutorial;

  useEffect(() => {
    if (!hasProfile || hasCompletedProfileTutorial) {
      return;
    }

    const timer = setTimeout(() => {
      const latestProgress = useUserStore.getState().profile?.tutorial_progress;
      if (!latestProgress?.profile_tutorial) {
        startTutorial('profile_tutorial');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [hasProfile, hasCompletedProfileTutorial, startTutorial]);

  useFocusEffect(
    useCallback(() => {
      setPlantPreviewKey((current) => current + 1);
      return undefined;
    }, [])
  );

  // Derived Values - moved before useMemo because they are used as dependencies
  const currentLevel = profile?.level || 1;
  const currentXP = profile?.xp || 0;
  const currentRank = getRankName(currentLevel);
  const currentLevelXP = getTotalXPForLevel(currentLevel);
  const xpForNext = getXPForNextLevel(currentLevel);
  const xpInLevel = currentXP - currentLevelXP;
  const xpNeededInLevel = xpForNext - currentLevelXP;
  const plantSeed = user?.id
    ? user.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
    : 12345;

  // Calculate L-System config based on growth (0-100) - moved to top level to avoid hook errors
  const lsystemConfig = useMemo(() => {
    const t = Math.max(0, Math.min(100, currentLevel)) / 100;
    return {
      iterations: 2 + Math.floor(t * 2), // Scale from 2 to 4
      length: 0.01 + t * 0.12,
      thickness: 0.003 + t * 0.02,
      lengthScale: 0.6 + t * 0.35,
      leafSize: 0.01 + t * 0.05,
      bloomSize: 0.02 + t * 0.06,
      leafChance: t * 0.5,
      bloomChance: t > 0.25 ? (t - 0.25) * 1.07 : 0,
    };
  }, [currentLevel]);

  // Placeholder data for stats (memoized)
  const stats = useMemo(
    () => [
      { label: 'Plants', value: profile?.plants_count || 0 },
      { label: 'Coins', value: profile?.plant_coins || 0 },
      {
        label: 'Following',
        value: profile?.following_count || 0,
        onPress: () => navigation.navigate('Connections', { initialTab: 'following' }),
      },
      {
        label: 'Follower',
        value: profile?.followers_count || 0,
        onPress: () => navigation.navigate('Connections', { initialTab: 'followers' }),
      },
    ],
    [
      profile?.plants_count,
      profile?.plant_coins,
      profile?.following_count,
      profile?.followers_count,
      navigation,
    ]
  );

  const displayTitle = profile?.title || equippedInventoryTitle?.name;
  const displayTitleColor =
    profile?.titlecolor || equippedInventoryTitle?.color || theme.colors.primary;
  const displayBorder = profile?.equipped_border || equippedInventoryBorder;

  const titleColor = displayTitle ? displayTitleColor : theme.colors.primary;
  const backgroundGradient = [
    withAlpha(titleColor, 0.24) || theme.colors.secondaryTint,
    theme.colors.secondaryTint,
    withAlpha(titleColor, 0.08) || theme.colors.background,
    theme.colors.background,
  ] as const;

  const handleClaimReward = async (level: number, title: string) => {
    const success = await claimReward(level);
    if (success) {
      setSelectedReward(null);
    } else {
      await showAlertDialog({
        title: 'Error',
        message: 'Could not claim reward. Try again later.',
        variant: 'error',
      });
    }
  };

  const getRewardImage = (reward: any) => {
    // 1. Prioritize Media URL from DB (e.g. for Borders)
    if (reward.media_url) {
      return { uri: reward.media_url };
    }

    // 2. Specific Local Assts based on Type/ID
    switch (reward.reward_type) {
      case 'COINS':
        return require('../../../../assets/images/plantupcoin.png');
      case 'XP_BOOST':
        return require('../../../../assets/images/XPBoostItem.png');
      default:
        return undefined;
    }
  };

  const getProfileBorderStyle = useCallback((borderUrl: string): any => {
    // Avatar is exactly 80x80
    const avatarSize = 80;

    let scale = 1.6;
    let topShift = 0;
    let leftShift = 0;

    if (borderUrl.includes('lightning')) {
      scale = 2.6;
      topShift = avatarSize * -0.000000000001;
      leftShift = avatarSize * -0.01;
    } else if (borderUrl.includes('.gif')) {
      scale = 2.45;
    }

    const borderSize = avatarSize * scale;
    const offset = (borderSize - avatarSize) / 2;

    return {
      position: 'absolute' as const,
      width: borderSize,
      height: borderSize,
      top: -offset + topShift,
      left: -offset + leftShift,
      zIndex: 1,
    };
  }, []);

  if (!user || !profile) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'leveling':
        return (
          <>
            <TouchableOpacity
              style={[styles.plantsButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => navigation.navigate('UserPlants', { userId: user.id })}>
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

            {/* 3D Plant with Level Info */}
            {(() => {
              const RANK_GRADIENTS: Record<string, [string, string]> = {
                Evergreen: ['#29d071', '#23b060'],
                Roseheart: ['#f68580', '#e57373'],
                Sapling: ['#68cf67', '#5cb85c'],
                Seedling: ['#4fab4b', '#439a40'],
                Sprout: ['#42973b', '#388e3c'],
                Sunflower: ['#f1aa21', '#ffa000'],
              };
              const gradientColors = RANK_GRADIENTS[currentRank] || ['#4CAF50', '#388E3C'];
              const progress = getLevelProgress(currentXP, currentLevel);
              return (
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.profileCard, { alignItems: 'center', width: '100%', padding: 20 }]} // Reusing profileCard style as base
                >
                  {/* 3D Plant Container */}
                  <View
                    style={{
                      height: vw * 75,
                      width: '100%',
                      borderRadius: 25,
                      overflow: 'hidden',
                      backgroundColor: 'rgba(0,0,0,0.05)',
                      marginBottom: 20,
                    }}>
                    {isPlantReady ? (
                      <PlantPotPreview
                        key={`profile-plant-${user.id}-${plantPreviewKey}`}
                        seed={plantSeed}
                        growth={currentLevel}
                        mode="lsystem"
                        lsystemConfig={lsystemConfig}
                        potType="PotStandard"
                        cameraY={0.7}
                        cameraDistance={2.2}
                        cameraTargetY={0.22}
                      />
                    ) : (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator color={theme.colors.primary} />
                      </View>
                    )}
                  </View>

                  {/* Level Info */}
                  <Text
                    style={{
                      fontSize: 32,
                      fontWeight: '900',
                      color: '#FFFFFF',
                      textShadowColor: 'rgba(0, 0, 0, 0.2)',
                      textShadowOffset: { width: 0, height: 2 },
                      textShadowRadius: 4,
                    }}>
                    Level {currentLevel}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: 'rgba(255, 255, 255, 0.9)',
                      marginTop: 4,
                      marginBottom: 15,
                      fontWeight: '600',
                    }}>
                    {xpInLevel} / {xpNeededInLevel} XP
                  </Text>

                  {/* Progress Bar */}
                  <View
                    style={{
                      width: '100%',
                      height: 12,
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      borderRadius: 6,
                      overflow: 'hidden',
                    }}>
                    <View
                      style={{
                        height: '100%',
                        borderRadius: 6,
                        backgroundColor: '#FFFFFF',
                        width: `${progress * 100}%`,
                      }}
                    />
                  </View>
                </LinearGradient>
              );
            })()}

            <Text style={[styles.sectionTitle, { color: theme.colors.typography }]}>
              Level Rewards
            </Text>

            {rewardsMap.length > 0 ? (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.rewardsScroll}
                contentContainerStyle={{ paddingRight: 40 }}
                data={rewardsMap}
                keyExtractor={(item, index) => index.toString()}
                removeClippedSubviews={true}
                initialNumToRender={5}
                windowSize={5}
                renderItem={({ item: reward }) => (
                  <RewardItem
                    title={reward.title}
                    description={reward.description}
                    isUnlocked={reward.status !== 'LOCKED'}
                    isClaimed={reward.status === 'CLAIMED'}
                    image={reward.media_url ? { uri: reward.media_url } : null}
                    onClaim={() => {
                      if (reward.status === 'AVAILABLE') {
                        handleClaimReward(reward.level, reward.title);
                      } else {
                        setSelectedReward(reward);
                      }
                    }}
                  />
                )}
              />
            ) : (
              <View style={styles.comingSoonContainer}>
                <Text style={[styles.comingSoonText, { color: theme.colors.typography }]}>
                  Fetching rewards...
                </Text>
              </View>
            )}
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
    <LinearGradient
      colors={backgroundGradient}
      locations={[0, 0.3, 0.68, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}>
      <StatusBar style="auto" />

      <View style={[styles.sheetHeader, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={[styles.iconButton, { marginRight: 8 }]}
            onPress={() => navigation.navigate('Notifications')}>
            <View>
              <FontAwesome6 name="bell" size={22} color={theme.colors.text} />
              {unreadInboxCount > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>
                    {unreadInboxCount > 99 ? '99+' : unreadInboxCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { marginRight: 8 }]}
            onPress={() => navigation.navigate('BorderInventory')}>
            <FontAwesome5 name="tshirt" size={20} color={theme.colors.text} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Settings')}>
            <FontAwesome6 name="gear" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.topRow}>
              <View style={[styles.avatarContainer, { position: 'relative' }]}>
                <Image
                  source={
                    profile?.profile_image
                      ? { uri: profile.profile_image }
                      : require('../../../../assets/images/Profilbild.jpg')
                  }
                  style={[styles.avatar, { backgroundColor: theme.colors.greyedOut }]}
                  resizeMode="cover"
                />
                {displayBorder?.media_url && (
                  <ExpoImage
                    key={displayBorder.media_url} // Force re-mount on change!
                    source={{ uri: displayBorder.media_url }}
                    style={getProfileBorderStyle(displayBorder.media_url)}
                    pointerEvents="none"
                    contentFit="contain"
                  />
                )}
              </View>

              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.userName, { color: theme.colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit>
                    {profile?.username || user?.email?.split('@')[0] || 'Gardener'}
                  </Text>
                  {(profile?.level || 0) >= 25 && (
                    <View style={{ marginLeft: 8, flexShrink: 0 }}>
                      <MentorBadge size="medium" />
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => navigation.navigate('TitleInventory')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 4,
                    minHeight: 32,
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: displayTitle ? displayTitleColor : theme.colors.greyedOut,
                      fontWeight: displayTitle ? '600' : '400',
                      fontStyle: displayTitle ? 'normal' : 'italic',
                      marginRight: 8,
                      flexShrink: 1,
                    }}
                    numberOfLines={1}>
                    {displayTitle || 'Select Title'}
                  </Text>
                  <GradientIcon name="pen" size={12} />
                </TouchableOpacity>
              </View>
            </View>
            {/* Bio Section (Below Top Row) - only if bio exists */}
            {profile?.bio ? (
              <View style={{ marginTop: 8 }}>
                {/* Hidden Text for measurement */}
                <Text
                  style={[styles.userBio, { position: 'absolute', opacity: 0, zIndex: -1 }]}
                  onTextLayout={(e: { nativeEvent: { lines: any[] } }) => {
                    if (e.nativeEvent.lines.length > 1) setIsBioTruncated(true);
                  }}>
                  {profile.bio}
                </Text>

                <Text
                  style={[styles.userBio, { color: theme.colors.text }]}
                  numberOfLines={isBioExpanded ? undefined : 1}>
                  {profile.bio}
                </Text>
                {isBioTruncated && (
                  <TouchableOpacity onPress={() => setIsBioExpanded(!isBioExpanded)}>
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontSize: 12,
                        marginTop: 4,
                        fontWeight: '600',
                      }}>
                      {isBioExpanded ? 'Show less' : 'Show more'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
          </View>

          <StatsRow stats={stats} theme={theme} typographyColor={theme.colors.typography} />

          {/* Action Buttons */}
          <View style={[styles.actionRow, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setActiveTab('leveling')}>
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

      {/* Reward Details Modal */}
      <RewardDetailsModal
        visible={!!selectedReward}
        reward={selectedReward}
        isLocked={selectedReward ? !!(selectedReward.status === 'LOCKED') : false}
        isClaimed={selectedReward ? !!(selectedReward.status === 'CLAIMED') : false}
        onClose={() => setSelectedReward(null)}
        onClaimAction={() => {
          if (selectedReward) {
            handleClaimReward(selectedReward.level, selectedReward.title);
            // Optionally close modal or let it auto-update to "Collected"
            // If we close: setSelectedReward(null);
            // If we keep open: The 'isClaimed' prop will update when store updates!
          }
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconButton: {
    padding: 8,
  },
  headerBadge: {
    position: 'absolute',
    top: -8,
    right: -12,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E55050',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: vw * 10,
    fontWeight: '900',
    lineHeight: vw * 11,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  avatarContainer: {
    width: 80,
    height: 80,
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
    overflow: 'hidden',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  userBio: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  actionRow: {
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 19,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  plantsButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    backgroundColor: theme.colors.secondaryTint,
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  comingSoonText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
}));
