import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useUnistyles } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useUserStore } from '../../../stores/UserStore';
import RankCard from '../../../components/RankCard';
import RewardItem from '../../../components/RewardItem';
import { REWARDS } from '../../../utils/leveling';
import DraggableBottomSheet from '../../../components/DraggableBottomSheet';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import GradientIcon from '../../../components/GradientIcon';
import GradientText from '../../../components/GradientText';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { theme } = useUnistyles();
  const { user, profile, fetchProfile } = useUserStore();
  const [activeTab, setActiveTab] = React.useState<'leveling' | 'posts' | 'likes'>('leveling');

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      console.log('Profile refreshed on focus');
    }, [])
  );

  const currentLevel = profile?.level || 1;
  const currentXP = profile?.xp || 0;

  // Placeholder data for stats
  const stats = [
    { label: 'Plants', value: 9 },
    { label: 'Coins', value: '1.500' },
    { label: 'Friends', value: 14 },
    { label: 'Follower', value: '4.000' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'leveling':
        return (
          <>
            {/* Plants Button */}
            <TouchableOpacity style={styles.plantsButton}>
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

            {/* Rank Card */}
            <RankCard level={currentLevel} xp={currentXP} />

            {/* Rewards Section */}
            <Text style={styles.sectionTitle}>Rewards</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rewardsScroll}>
              {REWARDS.map((reward) => (
                <RewardItem
                  key={reward.level}
                  title={reward.title}
                  description={reward.description}
                  isUnlocked={currentLevel >= reward.level}
                />
              ))}
            </ScrollView>
          </>
        );
      case 'posts':
        return (
          <>
            <Text style={styles.sectionTitle}>My Posts</Text>
            <View style={styles.comingSoonContainer}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          </>
        );
      case 'likes':
        return (
          <>
            <Text style={styles.sectionTitle}>Liked Posts</Text>
            <View style={styles.comingSoonContainer}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
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
            source={require('../../../../assets/images/ProfileScreenBackground.png')}
            style={styles.headerGradient}
            resizeMode="cover"
          />
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton}>
              <FontAwesome6 name="chevron-left" size={20} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Your{'\n'}Growing{'\n'}Profile!</Text>
          </View>
        </View>

        {/* Draggable Bottom Sheet */}
        <DraggableBottomSheet initialHeight={0.65} maxHeight={0.9}>
          <View style={styles.sheetContent}>
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
                  <Text style={styles.userName}>{profile?.username.split('@')[0] || 'Gardener'}</Text>
                  <GradientIcon name="pen" size={14} style={{ marginLeft: 8 }} />
                </View>
                <Text style={styles.userBio}>Coole bio haha...</Text>
              </View>
            </View>

            {/* Stats Row */}
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
                onPress={() => setActiveTab('leveling')}
              >
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
                  <FontAwesome6 name="seedling" size={20} color="#555" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setActiveTab('posts')}
              >
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
                  <FontAwesome6 name="list" size={20} color="#555" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setActiveTab('likes')}
              >
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
                  <FontAwesome6 name="thumbs-up" size={20} color="#555" />
                )}
              </TouchableOpacity>
            </View>

            {/* Dynamic Content */}
            {renderContent()}

            {/* Extra padding at bottom for scrolling */}
            <View style={{ height: 100 }} />
          </View>
        </DraggableBottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    color: 'white',
    lineHeight: 46,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileCard: {
    backgroundColor: 'white',
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
    backgroundColor: '#EEE',
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
    color: '#333',
  },
  userBio: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: 'white',
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
    backgroundColor: 'white',
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
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  plantsButton: {
    backgroundColor: 'white',
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
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 10,
  },
  rewardsScroll: {
    marginBottom: 20,
  },
  comingSoonContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  comingSoonText: {
    fontSize: 16,
    color: '#888',
    fontStyle: 'italic',
  },
});
