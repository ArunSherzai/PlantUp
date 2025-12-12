import { View, Text, TextInput, TouchableOpacity, Image, FlatList } from 'react-native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { useNavigation } from '@react-navigation/native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ImageBackground } from 'react-native';

function TaskCard({
  tag,
  text,
  progress,
  total,
}: {
  tag: string;
  text: string;
  progress: number;
  total: number;
}) {
  const progressPercent = (progress / total) * 100;

  return (
    <View style={styles.taskCard}>
      <Text style={styles.tag}>{tag}</Text>
      <View style={styles.task}>
        <View style={{ flex: 1 }}>
          <Text style={styles.taskText}>{text}</Text>
        </View>
        <Image
          source={require('../../../assets/images/plantupcoin.png')}
          style={styles.rewardImageLeft}
        />
        <Image
          source={require('../../../assets/images/plantupcoin.png')}
          style={styles.rewardImageRight}
        />
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>
      <View style={styles.iconGroup}>
        <FontAwesome6 name="check" size={16} style={styles.icon} />
        <FontAwesome6 name="arrow-right" size={16} style={styles.icon} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();

  const tasks = [
    { id: '1', tag: 'New', text: 'Water your plant 3 times!', progress: 1, total: 3 },
    { id: '2', tag: 'New', text: 'Post a picture 1 time!', progress: 0, total: 1 },
    { id: '3', tag: 'claim in 5:45:21', text: 'Progressing...', progress: 3, total: 5 },
    { id: '4', tag: 'claim in 5:45:21', text: 'Progressing...', progress: 3, total: 5 },
    { id: '5', tag: 'claim in 5:45:21', text: 'Progressing...', progress: 3, total: 5 },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Image
        source={require('../../../assets/images/homeScreenBackground.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={{ flex: 1, paddingTop: 20 }}>
        <View style={styles.topBar}>
          <FontAwesome name="search" size={22} color={theme.colors.textDark} />
        </View>
        <View style={styles.titleWrapper}>
          <Text style={styles.title}>Home</Text>
          <Text style={styles.title}>Sweet</Text>
          <Text style={styles.title}>Home!</Text>
        </View>

        <View style={styles.taskContainer}>
          <FlatList
            overScrollMode="never"
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TaskCard
                tag={item.tag}
                text={item.text}
                progress={item.progress}
                total={item.total}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  backgroundImage: {
    width: '100%',
    height: '55%',
    position: 'absolute',
    top: 0,
  },
  rewardImageLeft: {
    width: 50,
    height: 50,
    marginRight: 3,
  },
  rewardImageRight: {
    width: 50,
    height: 50,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    margin: 20,
    height: 160,
  },
  logo: {
    color: theme.colors.icon,
    fontSize: 18,
    fontWeight: 'bold',
  },
  icon: {
    marginRight: 12,
    color: theme.colors.text,
  },
  task: {
    flexDirection: 'row',
    alignItems: 'center', // center image and text vertically
    justifyContent: 'space-between', // space between text and image
    marginBottom: 8,
  },
  titleWrapper: {
    marginTop: 20,
  },
  title: {
    color: theme.colors.textDark,
    fontSize: 50,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  taskContainer: {
    backgroundColor: theme.colors.background + 'cc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    flex: 1,
  },

  taskCard: {
    backgroundColor: theme.colors.background,
    elevation: 3,
    borderRadius: 12,
    padding: 16,
    margin: 5,
  },
  tag: {
    backgroundColor: theme.colors.greyedOut,
    color: theme.colors.textDark,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    borderRadius: 8,
    marginBottom: 8,
  },
  taskText: {
    fontSize: 16,
    marginBottom: 8,
    color: theme.colors.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.greyedOut,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  iconGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
}));
