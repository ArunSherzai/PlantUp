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
import { CartesianChart, Bar } from 'victory-native';

// Data for the bar chart
const barChartData = [
  { x: '6AM', y: 18 },
  { x: '8AM', y: 19 },
  { x: '10AM', y: 17 },
  { x: '12PM', y: 21 },
  { x: '2PM', y: 25 },
  { x: '4PM', y: 20 },
  { x: '6PM', y: 19 },
  { x: '8PM', y: 18 }
];

export default function ShowPlantStats() {
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();
  const [name, setName] = useState('Franz');
  const [temperature, setTemperature] = useState('24°');
  const [humidity, setHumidity] = useState('54%');
 
  

  return (
    <ImageBackground
      source={require('../../../assets/images/statsBackground.png')}
      style={styles.backgroundImage}>
      <TouchableOpacity style={styles.arrowIcon} onPress={() => navigation.goBack()}>
        <Feather name="arrow-left" size={24} color="white" />
      </TouchableOpacity>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>How's</Text>
        <Text style={styles.headerTitle}>{name}?</Text>
      </View>

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">

        {/* Temperature Card */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardValueText}>{temperature}</Text>
            <Feather name="sun" size={36} color="#FFD700" /> {/* Gold color for sun */}
          </View>
          <View style={styles.cardSeparator} />
          <Text style={styles.cardLabelText}>today's weather</Text>
        </View>

        {/* Humidity Card */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardValueText}>{humidity}</Text>
            <Feather name="droplet" size={36} color="#1E90FF" /> {/* DodgerBlue for droplet */}
          </View>
          <View style={styles.cardSeparator} />
          <Text style={styles.cardLabelText}>today's weather</Text>
        </View>

        {/* Bar Chart Card (replaces the duplicated humidity card) */}
        <View style={[styles.card, styles.chartCardContainer]}> 
          <CartesianChart
            data={barChartData}
            xKey="x"
            yKeys={["y"]}
            domainPadding={{ left: 20, right: 20, top: 10, bottom:10 }}
            axisOptions={{
              // formatXLabel: (value) => `${value}`,
              // formatYLabel: (value) => `${value}`,
              // Add font here if you have one, e.g., font: yourLoadedSkiaFont
            }}
          >
            {({ points, chartBounds }) => (
              <Bar 
                points={points.y}
                chartBounds={chartBounds}
                color="#FFA500"
                // Optional: individual bar styling or rounded corners (might need different approach)
                // For rounded corners with Skia, you might draw custom paths or use <RoundedRect>
                // For simplicity, direct bar rounding is omitted here, focusing on basic rendering
                innerPadding={0.2}
              />
            )}
          </CartesianChart>
        </View>
       
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create((theme) => ({
    card: {
        borderRadius: 20,
        backgroundColor: "#FFFFFF", // Changed to white for a cleaner look like the image
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 }, // Reduced shadow offset
        shadowOpacity: 0.1, // Reduced shadow opacity
        shadowRadius: 8,    // Increased shadow radius for a softer look
        elevation: 5,       // Kept elevation for Android
        width: "100%",
        marginBottom: 20,
        padding: 20,       // Increased padding
        // minHeight: 120, // Suggesting a minHeight to ensure content fits well
    },
    chartCardContainer: {
        height: 300,
        // backgroundColor: 'lightgrey', // For debugging layout
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15, // Space before separator
    },
    cardValueText: {
        fontSize: 48, // Large text for value
        fontWeight: '300', // Lighter font weight like in image
        color: theme.colors.text, // Assuming theme.colors.text is black or dark grey
    },
    // cardIcon style (if specific styling needed beyond size/color props)
    cardSeparator: {
        height: 1,
        backgroundColor: theme.colors.greyedOut || '#E0E0E0', // Use theme color or fallback
        marginBottom: 10, // Space after separator
    },
    cardLabelText: {
        fontSize: 14,
        color: theme.colors.greyedOut || '#757575', // Use theme color or fallback for muted text
        fontFamily: theme.fonts.regular, 
    },
  backgroundImage: {
    justifyContent: 'flex-end',
  },
  arrowIcon: {
    margin: 5,
    top: 30,
    position: 'absolute',
  },

  headerContainer: {
    paddingLeft: 20,
    marginTop: 85,
  },

  headerTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },

  formContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
  },

  container: {
    backgroundColor: theme.colors.background,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.header,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 24,
    fontFamily: theme.fonts.header,
    color: theme.colors.text,
    marginTop: 5,
  },
  inputContainer: {
    marginBottom: 25,
  },
  xButton: {
    borderRadius: 50,
    width: '100%',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: 'black',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: 'black',
  },
  radioContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  radioButton: {
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  radioText: {
    fontSize: 16,
    color: 'black',
  },
  radioTextSelected: {
    fontSize: 16,
    color: theme.colors.background,
  },
  sensorText: {
    fontSize: 16,
    color: 'black',
    marginBottom: 5,
  },
  connectedText: {
    fontSize: 14,
  },
  linkDeviceButton: {
    marginTop: 10,
    marginBottom: 30,
  },
  linkDeviceText: {
    fontSize: 16,
    color: 'black',
    textDecorationLine: 'underline',
  },
  imagePlaceholder: {
    height: 150,
    borderWidth: 1,
    borderColor: theme.colors.greyedOut,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  imageText: {
    fontSize: 16,
    color: 'black',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'black',
    fontSize: 18,
  },
}));
