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

export default function UpdatePlantScreen() {
  const { theme } = useUnistyles();
  const navigation = useNavigation<any>();
  const [name, setName] = useState('Franz');
  const [direction, setDirection] = useState('In');
  const [location, setLocation] = useState('');
  const [sensor, setSensor] = useState('Sensor AH5GT');
  const [sensorImageURL, setSensorImageURL] = useState(
    require('../../../assets/images/sensor.png')
  );

  const handleSave = () => {
    console.log({ name, direction, location, sensor });
    navigation.goBack();
  };

  return (
    <ImageBackground
      source={require('../../../assets/images/updatePlant.png')}
      style={styles.backgroundImage}>
      <TouchableOpacity style={styles.arrowIcon} onPress={() => navigation.goBack()}>
        <Feather name="arrow-left" size={24} color="white" />
      </TouchableOpacity>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Update</Text>
        <Text style={styles.headerTitle}>{name}!</Text>
      </View>

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.xButton} onPress={() => navigation.goBack()}>
          <Feather name="x-circle" size={24} color="black" />
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Name*</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter name"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Out/In*</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity
              style={[styles.radioButton, direction === 'Out' && styles.radioButtonSelected]}
              onPress={() => setDirection('Out')}>
              <Text style={direction === 'Out' ? styles.radioTextSelected : styles.radioText}>
                Out
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioButton, direction === 'In' && styles.radioButtonSelected]}
              onPress={() => setDirection('In')}>
              <Text style={direction === 'In' ? styles.radioTextSelected : styles.radioText}>
                In
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Enter location"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Sensor</Text>
          <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            <Image source={sensorImageURL} style={{ width: 50, height: 50 }}></Image>
          </View>
          <FilledButton text="+ Link Device"></FilledButton>
        </View>

        <View style={styles.imagePlaceholder}>
          <Feather name="image" size={32} color="gray" />
        </View>

        <FilledButton text="Save" onPress={handleSave}></FilledButton>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create((theme) => ({
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
    marginTop: 150,
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
