import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { useNavigation } from '@react-navigation/native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Dimensions } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

function InfoCard({ name, iconName, content }: { name: string; iconName: any; content: string }) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.infoCard}>
      <MaskedView
        style={{ marginBottom: 5 }}
        maskElement={<Text style={[styles.infoCardContent]}>{content}</Text>}>
        <LinearGradient
          colors={['#329D9C', '#00D988']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 25 }}
        />
      </MaskedView>

      <MaskedView
        maskElement={
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {iconName === 'ranking-star' ? (
              <FontAwesome6 name="ranking-star" size={40} />
            ) : (
              <FontAwesome name={iconName} size={40} />
            )}
          </View>
        }>
        <LinearGradient
          colors={['#329D9C', '#00D988']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 0 }}
          style={{ height: 40 }}
        />
      </MaskedView>

      <MaskedView maskElement={<Text style={[styles.infoCardContent]}>{name}</Text>}>
        <LinearGradient
          colors={['#329D9C', '#00D988']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 25 }}
        />
      </MaskedView>
    </View>
  );
}

function AchievementCard() {
  return (
    <TouchableOpacity style={styles.achievementCard}>
      <MaskedView
        style={{ width: '100%', height: 70 }} // Höhe angepasst
        maskElement={
          <View style={{ height: 70, alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesome6 name="award" size={60} />
          </View>
        }>
        <LinearGradient
          colors={['#329D9C', '#00D988']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 0 }}
          style={{ height: 70 }}
        />
      </MaskedView>

      <MaskedView
        style={{ width: '100%', height: 25 }}
        maskElement={<Text style={[styles.achievementCardText]}>Achievement</Text>}>
        <LinearGradient
          colors={['#329D9C', '#00D988']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </MaskedView>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1 }}>
      <Image
        source={require('../../../assets/images/profileScreenBackground.png')}
        style={[styles.headerImage]}
        resizeMode="cover"
      />

      <View style={styles.profileWrapper}>
        <Image
          source={require('../../../assets/images/Profilbild.png')}
          style={styles.profileImage}
        />
        <Text style={styles.profileName}>Andreas</Text>
        <Text style={styles.profileBio}>Coole Bio Haha</Text>
      </View>

      <View style={[styles.taskContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.infoCardContainer}>
          <InfoCard name="Plants" content="3" iconName="leaf"></InfoCard>
          <InfoCard name="Points" content="500" iconName="star"></InfoCard>
          <InfoCard name="Rank" content="#5" iconName="ranking-star"></InfoCard>
        </View>

        <AchievementCard />

        <Text style={styles.postHeader}>My Posts</Text>

        <Text style={{ textAlign: 'center' }}>You have no Posts</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  headerImage: {
    height: '43%',
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    margin: 20,
    height: 100,
  },
  infoCardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 5,
  },
  taskContainer: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingTop: 20,
  },
  profileWrapper: {
    position: 'absolute',
    top: '15%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  profileImage: {
    width: width * 0.35,
    height: width * 0.35,
    borderRadius: 99999,
  },
  profileName: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  profileBio: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
  },
  infoCard: {
    backgroundColor: '#F8F8FFFB',
    width: '30%',
    height: 120,
    borderRadius: 20,
    padding: 3,
    justifyContent: 'center', // statt 'center'
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  infoCardContent: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  achievementCard: {
    backgroundColor: '#F8F8FFFB',
    padding: 5,
    width: '100%',
    alignItems: 'center',
    marginTop: 16, // falls du etwas Abstand brauchst
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
    borderRadius: 20,
  },
  achievementCardText: {
    fontSize: 23,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  postHeader: {
    color: '#007348',
    fontWeight: 'bold',
    fontSize: 30,
    marginTop: 30,
  },
}));
