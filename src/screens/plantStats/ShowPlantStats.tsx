import { View, Text, TextInput, TouchableOpacity, Image, processColor } from 'react-native';
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
import { BarChart } from 'react-native-gifted-charts';

// Data for the bar chart
const originalBarChartData = [
  { xLabel: '6AM', yValue: 18 },
  { xLabel: '8AM', yValue: 19 },
  { xLabel: '10AM', yValue: 17 },
  { xLabel: '12PM', yValue: 21 },
  { xLabel: '2PM', yValue: 25 },
  { xLabel: '4PM', yValue: 20 },
  { xLabel: '6PM', yValue: 19 },
  { xLabel: '8PM', yValue: 18 }
];

export default function ShowPlantStats() {
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();
  const [name, setName] = useState('Franz');
  const [temperature, setTemperature] = useState('24°');
  const [humidity, setHumidity] = useState('54%');
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  
  const dropdownOptions = [
    { label: 'Temperature', color: "#fdae11" },
    { label: 'Humidity',    color: "#329d9c" },
    { label: 'Nutrition',   color: "#22b261" },
  ];

  const [selectedOptionLabel, setSelectedOptionLabel] = useState(dropdownOptions[0].label);
  const [barColor, setBarColor] = useState(dropdownOptions[0].color);

  const chartData = {
    dataSets: [{
      values: originalBarChartData.map(data => data.yValue),
      label: 'Temperature',
      config: {
        color: processColor('#FFA500'),
        barShadowColor: processColor('lightgrey'),
        highlightAlpha: 90,
        highlightColor: processColor('red'),
        valueTextSize: 10,
        valueTextColor: processColor(theme.colors.text),
      }
    }],
    config: {
      barWidth: 0.7,
    }
  };

  const xAxis = {
    valueFormatter: originalBarChartData.map(data => data.xLabel),
    granularityEnabled: true,
    granularity: 1,
    position: 'BOTTOM' as 'BOTTOM',
    drawGridLines: false,
    axisLineColor: processColor(theme.colors.greyedOut),
    textColor: processColor(theme.colors.text),
    textSize: 12,
    // Adjust labelCount to match the number of labels to prevent them from being cut off or duplicated
    labelCount: originalBarChartData.length, 
  };

  const yAxis = {
    left: {
      drawLabels: true,
      drawAxisLine: true,
      drawGridLines: false,
      axisLineColor: processColor(theme.colors.greyedOut),
      textColor: processColor(theme.colors.text),
      textSize: 12,
      // You might want to set a a min/max value or let the chart auto-calculate
      // axisMinimum: 0, 
    },
    right: {
      enabled: false
    }
  };

  const giftedBarData = originalBarChartData.map(item => ({
    value: item.yValue,
    label: item.xLabel,
    frontColor: barColor, // Bar color
    // topColor: 'lightgray', // Example for 3D effect, if desired
    // sideColor: 'gray', // Example for 3D effect, if desired
  }));

  return (
    <ImageBackground
      source={require('../../../assets/images/statsBackground.png')}
      style={styles.backgroundImage}>
      <TouchableOpacity style={styles.arrowIcon} onPress={() => navigation.goBack()}>
        <Feather name="arrow-left" size={24} color="white" />
      </TouchableOpacity>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>How's</Text>
        <Text style={styles.headerTitle}>{`${name}?`}</Text>
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
        <View style={styles.chartCard}>
          <Text style={styles.chartCardTitle}>Today's stats</Text>
          <TouchableOpacity 
            style={styles.dropdownIconContainer}
            onPress={() => setDropdownVisible(!isDropdownVisible)}
          >
            <Text style={styles.selectedOptionText}>{selectedOptionLabel}</Text>
            <Feather name="chevron-down" size={20} color={theme.colors.text} style={{marginLeft: 5}} />
          </TouchableOpacity>

          <View style={{ marginTop: 55 }}> {/* Wrapper View for spacing */} 
            <BarChart
              data={giftedBarData}
              height={130}      // Explicit height for the chart
              barWidth={20}
              width={280}     // Current bar width
              initialSpacing={5} // Reduced initial (and thus end) spacing
              xAxisThickness={1}
              yAxisThickness={1}
              xAxisColor={theme.colors.greyedOut}
              yAxisColor={theme.colors.greyedOut}
              xAxisLabelTextStyle={{ color: theme.colors.text, fontSize: 10 }}
              yAxisTextStyle={{ color: theme.colors.text }}
              noOfSections={4}
              maxValue={Math.max(...giftedBarData.map(d => d.value)) + 5}
              hideRules          // Hides grid lines
              barBorderRadius={4}
              // disablePress={true} // Optional: uncomment if you want to disable touch interactions
            />
          </View>
          {isDropdownVisible && (
            <View style={styles.dropdownMenu}>
              {dropdownOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setBarColor(option.color);
                    setSelectedOptionLabel(option.label);
                    setDropdownVisible(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
    chartCard: {
      borderRadius: 20,
      backgroundColor: "#FFFFFF", // Changed to white for a cleaner look like the image
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 }, // Reduced shadow offset
      shadowOpacity: 0.1, // Reduced shadow opacity
      shadowRadius: 8,    // Increased shadow radius for a softer look
      elevation: 5,       // Kept elevation for Android
      width: "100%",
      marginBottom: 20,
      padding: 5,  
      paddingRight: 10,
           // Increased padding
      // minHeight: 120, // Suggesting a minHeight to ensure content fits well
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
    flex: 1,
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
    maxHeight: 500, // Explicit height for the card container area
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
  dropdownIconContainer: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface || '#EFEFEF', // Use theme surface or fallback
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedOptionText: {
    fontSize: 16, // Match image font size if possible
    color: theme.colors.text,
    fontFamily: theme.fonts.regular, // Or theme.fonts.bold if it should be bolder
    marginRight: 3, // Space between text and icon
  },
  dropdownMenu: {
    position: 'absolute',
    top: 45, // Position below the icon (24 icon size + 15 top padding + some offset)
    right: 15,
    backgroundColor: theme.colors.background, // Or a specific dropdown background color
    borderRadius: 15,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 20, // Ensure menu is above other elements
    minWidth: 120, // Give it some minimum width
  },
  dropdownItem: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
  },
  chartCardTitle: {
    position: 'absolute',
    top: 15, // Align with dropdown button's top or adjust as needed
    left: 15, // Padding from the left edge of the card
    fontSize: 18, // Adjust as needed
    fontWeight: 'bold', // Or use theme.fonts.bold
    color: theme.colors.text,
    zIndex: 5, // Lower zIndex than dropdown icon if they could overlap
  },
}));
