import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { AntDesign } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ImageBackground } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import FilledButton from '~/features/auth/components/FilledButton';

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
      <Text style={styles.taskText}>{text}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>
      <View style={styles.iconGroup}>
        <Feather name="check" size={16} style={styles.icon} />
        <Feather name="arrow-right" size={16} style={styles.icon} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../../../assets/images/homeScreenBackground.png')}
        style={styles.backgroundImage}>
        <View style={styles.topBar}>
          <Feather name="search" size={22} color="white" style={styles.icon} />
        </View>

        <View style={styles.titleWrapper}>
          <Text style={styles.title}>Home</Text>
          <Text style={styles.title}>Sweet</Text>
          <Text style={styles.title}>Home!</Text>
        </View>

        <View style={styles.taskContainer}>
          <TaskCard tag="New" text="Do this 3 times!" progress={1} total={3} />
          <TaskCard tag="New" text="Do this 1 time!" progress={0} total={1} />
          <TaskCard tag="claim in 5:45:21" text="Progressing..." progress={3} total={5} />
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  backgroundImage: {
    flex: 1,
    paddingTop: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    margin: 10,
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
  titleWrapper: {
    marginTop: 20,
  },
  title: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  taskContainer: {
    backgroundColor: theme.colors.background + 'cc', // 'cc' adds semi-transparency (hex alpha)
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    gap: 16,
    flex: 1,
  },

  taskCard: {
    backgroundColor: theme.colors.background,
    elevation: 3,
    borderRadius: 12,
    padding: 16,
  },
  tag: {
    backgroundColor: theme.colors.greyedOut,
    color: 'white',
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
