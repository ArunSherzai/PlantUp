import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { useNavigation } from '@react-navigation/native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { LinearGradient } from 'expo-linear-gradient';

import { db } from '../../../utils/supabase';

const { height } = Dimensions.get('window');

export default function CreatePostScreen() {
  const { theme } = useUnistyles();
  const navigation = useNavigation();

  const [caption, setCaption] = useState('');
  const [username, setUsername] = useState('Loading...');

  const profileImage = require('../../../../assets/images/Profilbild.png');

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const {
          data: { user },
        } = await db.public.auth.getUser();
        if (!user) return;
        const { data } = await db.user.from('Users').select('username').eq('id', user.id).single();
        if (data) setUsername(data.username);
      } catch (e) {
        console.error(e);
        setUsername('Gardener');
      }
    };
    fetchUserProfile();
  }, []);

  const handlePost = () => console.log('Posten:', caption);
  const handleAttachment = (type: string) => console.log('Attachment:', type);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 1. BACKGROUND IMAGE */}
      <View style={styles.bgContainer}>
        <Image
          source={require('../../../../assets/images/createPostBackground.png')}
          style={styles.bgImage}
          resizeMode="cover"
        />
        <View style={styles.overlay} />
      </View>

      {/* 2. HEADER (Nur noch Cancel & Search Button) */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <FontAwesome6 name="chevron-left" size={22} color="white" />
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 3. WRAPPER FÜR INHALT (Titel + Weißes Blatt) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.contentWrapper}>
        {/* --- TITEL JETZT HIER --- */}
        {/* Er liegt im Wrapper, also direkt über dem weißen Blatt */}
        <Text style={styles.pageTitle}>Create a Post</Text>

        <View style={styles.whiteSheet}>
          {/* USER INFO */}
          <View style={styles.userRow}>
            <View style={styles.userInfo}>
              <Image source={profileImage} style={styles.avatar} />
              <Text style={styles.usernameText}>{username}</Text>
            </View>

            <TouchableOpacity onPress={handlePost}>
              <LinearGradient
                colors={['#329D9C', '#00D988']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.postButton}>
                <Text style={styles.postButtonText}>Post</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* TEXT INPUT */}
          <TextInput
            style={styles.input}
            placeholder="Write something here or add hashtags..."
            placeholderTextColor="#999"
            multiline
            value={caption}
            onChangeText={setCaption}
            textAlignVertical="top"
            scrollEnabled={true}
          />

          {/* ATTACHMENTS */}
          <View style={styles.bottomSection}>
            <View style={styles.divider} />
            <View style={styles.gridContainer}>
              <AttachmentCard
                icon="image"
                color="#4A90E2"
                label="Photo/Video"
                onPress={() => handleAttachment('media')}
              />
              <AttachmentCard
                icon="file"
                color="#E24A4A"
                label="GIF"
                isGifIcon
                onPress={() => handleAttachment('gif')}
              />
              <AttachmentCard
                icon="file-lines"
                color="#F5A623"
                label="Document"
                onPress={() => handleAttachment('document')}
              />
              <AttachmentCard
                icon="temperature-three-quarters"
                color="#00C853"
                label="Sensor Data"
                onPress={() => handleAttachment('sensor')}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// --- HELPER COMPONENT ---
function AttachmentCard({ icon, color, label, onPress, isGifIcon }: any) {
  return (
    <TouchableOpacity style={styles.attachmentCard} onPress={onPress}>
      <View style={styles.cardHeader}>
        {isGifIcon ? (
          <View style={[styles.gifIcon, { borderColor: color }]}>
            <Text style={{ color: color, fontWeight: '900', fontSize: 11 }}>GIF</Text>
          </View>
        ) : (
          <FontAwesome6 name={icon} size={34} color={color} />
        )}
        <FontAwesome6 name="plus" size={14} color="#333" />
      </View>
      <Text style={styles.attachmentLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// --- STYLES ---
const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: '#329D9C' },
  bgContainer: { position: 'absolute', top: 0, left: 0, width: '100%', height: '50%' },
  bgImage: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },

  safeArea: { zIndex: 10 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  cancelText: { color: 'white', fontSize: 18, marginLeft: 8, fontWeight: '600' },

  // --- ÄNDERUNG 1: TITEL STYLE ---
  pageTitle: {
    fontSize: 44,
    fontWeight: '900',
    color: 'white',
    paddingHorizontal: 24, // Bündig mit dem weißen Blatt
    marginBottom: 10, // Abstand zum weißen Blatt
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // --- ÄNDERUNG 2: WRAPPER POSITION ---
  contentWrapper: {
    flex: 1,
    // Wir ziehen den Wrapper etwas höher (0.18), da der Titel jetzt Teil davon ist.
    // Vorher war es 0.22 nur für das weiße Blatt.
    marginTop: height * 0.18,
  },

  whiteSheet: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 30,
    overflow: 'hidden',
  },

  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 54, height: 54, borderRadius: 27, marginRight: 14, backgroundColor: '#ddd' },
  usernameText: { fontSize: 19, fontWeight: 'bold', color: '#333' },
  postButton: { paddingVertical: 10, paddingHorizontal: 26, borderRadius: 12 },
  postButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  input: { flex: 1, fontSize: 17, color: '#333', marginBottom: 15, textAlignVertical: 'top' },

  bottomSection: {},
  divider: { height: 1, backgroundColor: '#EEE', width: '100%', marginBottom: 20 },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },

  attachmentCard: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 18,
    height: 125,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 15,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  attachmentLabel: { fontSize: 16, fontWeight: '700', color: '#222' },
  gifIcon: {
    borderWidth: 2.5,
    borderRadius: 6,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
