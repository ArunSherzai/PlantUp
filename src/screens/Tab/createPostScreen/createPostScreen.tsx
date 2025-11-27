import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Keyboard,
} from 'react-native';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { useNavigation } from '@react-navigation/native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// --- IMPORTE FÜR UPLOAD ---
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

import { db } from '../../../utils/supabase';

const { height } = Dimensions.get('window');

// Limit: 50 MB (Damit auch Videos passen)
const MAX_SIZE = 50 * 1024 * 1024;

export default function CreatePostScreen() {
  const { theme } = useUnistyles();
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);

  // --- STATE ---
  const [caption, setCaption] = useState('');
  const [username, setUsername] = useState('Loading...');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Media State
  const [media, setMedia] = useState<{
    uri: string;
    type: 'image' | 'video' | 'document' | 'sensor';
    mimeType?: string;
    name?: string;
    sensorData?: any;
  } | null>(null);

  const profileImage = require('../../../../assets/images/Profilbild.png');

  // 1. USER LADEN
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await db.public.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await db.user.from('Users').select('username').eq('id', user.id).single();
        if (data) setUsername(data.username);
      }
    };
    fetchUser();
  }, []);

  const closeMenu = () => setShowAttachmentMenu(false);

  // --- FUNKTION: FOTO & VIDEO AUSWÄHLEN ---
  const pickMedia = async () => {
    closeMenu();
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
      videoMaxDuration: 60,
      allowsEditing: true,
    });

    if (!res.canceled) {
      const asset = res.assets[0];

      if (asset.fileSize && asset.fileSize > MAX_SIZE) {
        Alert.alert('Too big', 'File is over 50MB.');
        return;
      }

      setMedia({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        mimeType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
        name: asset.fileName || `upload.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
      });
    }
  };

  // --- FUNKTION: DOKUMENT AUSWÄHLEN ---
  const pickDocument = async () => {
    closeMenu();
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!res.canceled) {
        const asset = res.assets[0];

        if (asset.size && asset.size > MAX_SIZE) {
          Alert.alert('Too big', 'Max 50MB.');
          return;
        }

        setMedia({
          uri: asset.uri,
          type: 'document',
          name: asset.name,
          mimeType: asset.mimeType || 'application/octet-stream',
        });
      }
    } catch (e) {
      console.log(e);
    }
  };

  // --- FUNKTION: SENSOR DATEN ---
  const attachSensorData = async () => {
    closeMenu();
    if (!userId) return;
    setLoading(true);
    try {
      const { data: plants } = await db.social
        .from('Plants')
        .select('id, nickname')
        .eq('user_id', userId)
        .limit(1);
      if (!plants?.length) {
        Alert.alert('No Plants', 'Add a plant first.');
        return;
      }

      const { data: reading } = await db.micro
        .from('Controllers')
        .select('*')
        .eq('plant_id', plants[0].id)
        .order('time', { ascending: false })
        .limit(1)
        .single();

      if (reading) {
        setMedia({
          uri: '',
          type: 'sensor',
          name: `${plants[0].nickname} Status`,
          sensorData: reading,
        });
      } else {
        Alert.alert('No Data', 'No sensor data found.');
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  // --- HAUPTFUNKTION: POSTEN ---
  const handlePost = async () => {
    if (!caption && !media) {
      Alert.alert('Empty', 'Please write something.');
      return;
    }

    setLoading(true);

    try {
      let finalUrl = null;
      let finalType = 'text';
      let finalCaption = caption;

      if (media && media.type !== 'sensor') {
        const {
          data: { session },
        } = await db.public.auth.getSession();
        if (!session) throw new Error('No active session');
        const token = session.access_token;

        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

        const ext = media.name?.split('.').pop() || 'mp4';
        const fileName = `${Date.now()}.${ext}`;
        const filePath = `${userId}/${fileName}`;

        const uploadUrl = `${supabaseUrl}/storage/v1/object/post-media/${filePath}`;

        const uploadResult = await FileSystem.uploadAsync(uploadUrl, media.uri, {
          httpMethod: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': media.mimeType || 'application/octet-stream',
          },
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        });

        if (uploadResult.status !== 200) {
          console.log('Upload error:', uploadResult.body);
          throw new Error('Upload failed: ' + uploadResult.body);
        }

        const { data } = db.public.storage.from('post-media').getPublicUrl(filePath);
        finalUrl = data.publicUrl;
        finalType = media.type;
      } else if (media && media.type === 'sensor') {
        finalType = 'sensor';
        const d = media.sensorData;
        finalCaption += `\n\n🌿 Status:\n🌡️ ${d.temperature}°C | 💧 ${d.soil_moisture}%`;
      }

      const { error } = await db.social.from('Posts').insert({
        user_id: userId,
        caption: finalCaption,
        media_url: finalUrl,
        type: finalType,
        likes: 0,
        shares: 0,
        comments_count: 0,
      });

      if (error) throw error;

      Alert.alert('Success', 'Post created!');
      navigation.goBack();
    } catch (e: any) {
      console.error('Post Error:', e);
      Alert.alert('Error', e.message || 'Network request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* FIXED BACKGROUND */}
      <View style={styles.bgContainer}>
        <Image
          source={require('../../../../assets/images/createPostBackground.png')}
          style={styles.bgImage}
          resizeMode="cover"
        />
        <View style={styles.overlay} />
      </View>

      {/* HEADER */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <FontAwesome6 name="chevron-left" size={22} color="white" />
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* CONTENT - FESTE HÖHE STATT SCROLLVIEW */}
      <View style={styles.contentContainer}>
        <Text style={styles.pageTitle}>Create a Post</Text>

        <View style={styles.whiteSheet}>
          {/* 1. USER INFO */}
          <View style={styles.userRow}>
            <View style={styles.userInfo}>
              <Image source={profileImage} style={styles.avatar} />
              <Text style={styles.usernameText}>{username}</Text>
            </View>

            <TouchableOpacity onPress={handlePost} disabled={loading}>
              <LinearGradient
                colors={['#329D9C', '#00D988']}
                style={[styles.postButton, { opacity: loading ? 0.7 : 1 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}>
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* 2. TEXT INPUT */}
          <KeyboardAwareScrollView
            style={styles.inputContainer}
            contentContainerStyle={styles.inputContent}
            enableOnAndroid={true}
            extraScrollHeight={20}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <TextInput
              style={styles.input}
              placeholder="Write something here..."
              placeholderTextColor="#999"
              multiline
              value={caption}
              onChangeText={setCaption}
              textAlignVertical="top"
            />
          </KeyboardAwareScrollView>

          {/* 3. PREVIEW BAR */}
          {media && (
            <View style={styles.previewBar}>
              <View style={styles.previewContent}>
                <FontAwesome6
                  name={
                    media.type === 'image'
                      ? 'image'
                      : media.type === 'video'
                        ? 'video'
                        : media.type === 'sensor'
                          ? 'leaf'
                          : 'file-lines'
                  }
                  size={16}
                  color="#329D9C"
                />
                <Text style={styles.previewText} numberOfLines={1}>
                  {media.name || media.type}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setMedia(null)}>
                <FontAwesome6 name="xmark" size={16} color="#999" />
              </TouchableOpacity>
            </View>
          )}

          {/* 4. BUTTON UNTEN */}
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={styles.addAttachmentButton}
              onPress={() => setShowAttachmentMenu(true)}>
              <FontAwesome6 name="paperclip" size={18} color="#329D9C" />
              <Text style={styles.addAttachmentText}>Add Attachment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 5. MODAL MENU */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAttachmentMenu}
        onRequestClose={closeMenu}>
        <Pressable style={styles.modalOverlay} onPress={closeMenu}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add to your post</Text>

            <View style={styles.gridContainer}>
              <AttachmentCard icon="image" color="#4A90E2" label="Media" onPress={pickMedia} />
              <AttachmentCard
                icon="file"
                color="#E24A4A"
                label="GIF"
                isGifIcon
                onPress={() => Alert.alert('Info', 'GIFs coming soon')}
              />
              <AttachmentCard
                icon="file-lines"
                color="#F5A623"
                label="File"
                onPress={pickDocument}
              />
              <AttachmentCard
                icon="temperature-three-quarters"
                color="#00C853"
                label="Sensor"
                onPress={attachSensorData}
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function AttachmentCard({ icon, color, label, onPress, isGifIcon }: any) {
  return (
    <TouchableOpacity style={styles.attachmentCard} onPress={onPress}>
      <View style={styles.cardIconContainer}>
        {isGifIcon ? (
          <View style={[styles.gifIcon, { borderColor: color }]}>
            <Text style={{ color: color, fontWeight: '900', fontSize: 9 }}>GIF</Text>
          </View>
        ) : (
          <FontAwesome6 name={icon} size={24} color={color} />
        )}
      </View>
      <Text style={styles.attachmentLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// --- STYLES ---
const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  bgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  safeArea: {
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelText: {
    color: 'white',
    fontSize: 18,
    marginLeft: 8,
    fontWeight: '600',
  },

  // Content Container - Feste Position
  contentContainer: {
    flex: 1,
    marginTop: height * 0.15,
  },
  pageTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: 'white',
    paddingHorizontal: 20,
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  whiteSheet: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 24,
    // Kein Padding Bottom mehr - wird durch flex: 1 geregelt
  },

  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
    backgroundColor: '#ddd',
  },
  usernameText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  postButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  postButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Input Container - Nur für den TextInput scrollable
  inputContainer: {
    flex: 1, // Nimmt den verfügbaren Platz ein
    marginBottom: 10,
  },
  inputContent: {
    flexGrow: 1,
  },
  input: {
    fontSize: 18,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 120,
  },

  // Preview Leiste
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  previewText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },

  // Toolbar - Fest am Boden
  toolbar: {
    marginTop: 'auto', // Wird nach unten geschoben
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
    paddingBottom: 20, // Sicherheits-Padding
  },
  addAttachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E0F2F1',
    padding: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  addAttachmentText: {
    color: '#329D9C',
    fontWeight: '600',
    fontSize: 14,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 24,
    paddingBottom: 50,
    minHeight: 250,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  attachmentCard: {
    width: '47%',
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 15,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  attachmentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  gifIcon: {
    borderWidth: 2,
    borderRadius: 4,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
