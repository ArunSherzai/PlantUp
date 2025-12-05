import React, { useEffect, useState, useCallback } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { useUnistyles, StyleSheet as UnistylesSheet } from 'react-native-unistyles';
import { db } from '../../../utils/supabase';
import StreakBar from './StreakBar'; // Import the new StreakBar component

const { height, width } = Dimensions.get('window');

export default function DailyStreakComponent() {
  const { theme } = useUnistyles();
  const [streakLength, setStreakLength] = useState(0);

  const fetchStreakLength = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await db.public.auth.getUser();
      if (!user) return;

      const { data, error } = await db.user
        .from('Users')
        .select('last_completed_timestamp')
        .eq('id', user.id);

      if (error) throw error;

      const lastCompletedDate = new Date(data[0]?.last_completed_timestamp);
      const today = new Date();
      const timeDiff = Number(today) - Number(lastCompletedDate);
      const diffInDays = Math.floor(timeDiff / (1000 * 3600 * 24));

      setStreakLength(diffInDays >= 0 ? diffInDays + 1 : 0);
    } catch (e) {
      console.error('Error fetching streak length:', e);
    }
  }, []);

  useEffect(() => {
    fetchStreakLength();
  }, [fetchStreakLength]);

  const renderStreakBlocks = () => {
    const blocks = [];
    for (let i = 0; i < 9; i++) {
      blocks.push(<View key={i} style={styles.streakBlock}></View>);
    }
    return blocks;
  };

  return (
    <View style={styles.container}>
      <View style={styles.streakContainer}>{renderStreakBlocks()}</View>
      {/* Add the StreakBar component and pass the current streak index */}
      <StreakBar index={5} totalBlocks={9} />
    </View>
  );
}

const styles = UnistylesSheet.create((theme) => ({
  container: {
    width: '100%',
    height: 80, // Adjust to make room for the streak container
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative', // Ensure that the streak bar is positioned absolutely within this container
  },
  streakContainer: {
    flexDirection: 'row', // Make sure the blocks are aligned in a row
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  streakBlock: {
    width: '11.11%', // Adjust to make sure all blocks fit horizontally
    height: '50%',
    margin: 5,
    borderRadius: 10,
    backgroundColor: 'black',
  },
}));
